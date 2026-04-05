import fs from "fs/promises";
import path from "path";

export async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

export async function copyFile(sourcePath, targetPath) {
  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function withVisualStyle(level, styleOverrides = {}) {
  const base =
    level === "lv1"
      ? {
          fill: "#081123",
          stroke: "rgba(125,211,252,0.95)",
          glow: "rgba(56,189,248,0.28)",
          width: 300,
          height: 96,
        }
      : level === "lv2"
        ? {
            fill: "#0f172a",
            stroke: "rgba(255,255,255,0.78)",
            glow: "rgba(148,163,184,0.18)",
            width: 260,
            height: 90,
          }
        : {
            fill: "#172554",
            stroke: "rgba(191,219,254,0.75)",
            glow: "rgba(96,165,250,0.18)",
            width: 228,
            height: 82,
          };
  return { ...base, ...(styleOverrides[level] ?? {}) };
}

function wrapLabel(label, maxCharsPerLine = 24, maxLines = 3) {
  if (!label.includes(" ")) {
    const lines = [];
    for (let index = 0; index < label.length && lines.length < maxLines; index += maxCharsPerLine) {
      const chunk = label.slice(index, index + maxCharsPerLine);
      lines.push(chunk);
    }
    if (label.length > maxCharsPerLine * maxLines) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(maxCharsPerLine - 1, 1))}…`;
    }
    return lines;
  }

  const words = label.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  let index = 0;

  for (; index < words.length; index += 1) {
    const word = words[index];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine || current.length === 0) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  const remainder = [current, ...words.slice(index + 1)].filter(Boolean).join(" ").trim();
  if (remainder) {
    lines.push(remainder.length > maxCharsPerLine ? `${remainder.slice(0, maxCharsPerLine - 1)}…` : remainder);
  }

  return lines.slice(0, maxLines);
}

function resolveNodeLayout(graph, layoutData, rendererConfig) {
  const width = rendererConfig.width ?? 2240;
  const height = rendererConfig.height ?? 1360;
  const bandY = rendererConfig.bandY ?? { lv1: 220, lv2: 670, lv3: 1100 };
  const sourcePositions = layoutData.positions;
  const sourceXs = Object.values(sourcePositions).map((position) => position.x);
  const minX = Math.min(...sourceXs, 0);
  const maxX = Math.max(...sourceXs, width);
  const spanX = Math.max(maxX - minX, 1);
  const nodes = graph.nodes.map((node) => {
    const style = withVisualStyle(node.level, rendererConfig.nodeStyles);
    const position = sourcePositions[node.id];
    const normalizedX = 180 + ((position.x - minX) / spanX) * (width - 360);
    const yJitter = (((position.y ?? 0) % 90) - 45) * 0.45;
    return {
      ...node,
      ...style,
      x: normalizedX,
      y: bandY[node.level] + yJitter,
    };
  });

  const padX = rendererConfig.overlapPadding?.x ?? 70;
  const padY = rendererConfig.overlapPadding?.y ?? 34;
  const iterations = rendererConfig.iterations ?? 320;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const a = nodes[left];
        const b = nodes[right];
        const requiredX = (a.width + b.width) / 2 + padX;
        const requiredY = (a.height + b.height) / 2 + padY;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = requiredX - Math.abs(dx);
        const overlapY = requiredY - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const shiftX = overlapX / 2 + 10;
        const shiftY = overlapY / 2 + 8;

        if (Math.abs(dx) <= Math.abs(dy)) {
          a.x -= shiftX * Math.sign(dx || -1);
          b.x += shiftX * Math.sign(dx || 1);
          if (a.level === b.level) {
            a.y -= shiftY * 0.45;
            b.y += shiftY * 0.45;
          }
        } else if (a.level === b.level) {
          a.y -= shiftY * Math.sign(dy || -1);
          b.y += shiftY * Math.sign(dy || 1);
        } else {
          a.x -= shiftX * 0.45 * Math.sign(dx || -1);
          b.x += shiftX * 0.45 * Math.sign(dx || 1);
        }
      }
    }

    for (const node of nodes) {
      const centerBand = bandY[node.level];
      const verticalSlack = node.level === "lv1" ? 100 : node.level === "lv2" ? 135 : 115;
      node.x = clamp(node.x, node.width / 2 + 60, width - node.width / 2 - 60);
      node.y = clamp(node.y, centerBand - verticalSlack, centerBand + verticalSlack);
    }
  }

  const gapBonus = rendererConfig.gapBonus ?? { lv1: 88, lv2: 72, lv3: 60 };
  for (const level of ["lv1", "lv2", "lv3"]) {
    const levelNodes = nodes.filter((node) => node.level === level).sort((a, b) => a.x - b.x);
    for (let index = 1; index < levelNodes.length; index += 1) {
      const previous = levelNodes[index - 1];
      const current = levelNodes[index];
      const requiredGap = (previous.width + current.width) / 2 + (gapBonus[level] ?? 60);
      if (current.x - previous.x < requiredGap) {
        current.x = previous.x + requiredGap;
      }
    }
    for (let index = levelNodes.length - 2; index >= 0; index -= 1) {
      const current = levelNodes[index];
      const next = levelNodes[index + 1];
      const requiredGap = (current.width + next.width) / 2 + (gapBonus[level] ?? 60);
      if (next.x - current.x < requiredGap) {
        current.x = next.x - requiredGap;
      }
    }
    for (const node of levelNodes) {
      node.x = clamp(node.x, node.width / 2 + 70, width - node.width / 2 - 70);
    }
  }

  return {
    width,
    height,
    nodes,
    positioned: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function buildEdgePath(source, target) {
  const x1 = source.x;
  const y1 = source.y + source.height / 2 - 8;
  const x2 = target.x;
  const y2 = target.y - target.height / 2 + 8;
  const curve = clamp(Math.abs(y2 - y1) * 0.42, 90, 220);
  return `M ${round(x1)} ${round(y1)} C ${round(x1)} ${round(y1 + curve)} ${round(x2)} ${round(y2 - curve)} ${round(x2)} ${round(y2)}`;
}

export function renderArtifactPreview(artifact, outputRelativeJsonPath, rendererConfig = {}) {
  const { document, graph, activeEdges, score, strategy, provider, layout, edgePolicy } = artifact;
  const resolved = resolveNodeLayout(graph, artifact.layoutData, rendererConfig);
  const showEdges = rendererConfig.showEdges !== false;
  const showLevelBadges = rendererConfig.showLevelBadges === true;

  const edgeSvg = showEdges
    ? activeEdges
        .map((edge) => {
          const source = resolved.positioned[edge.source];
          const target = resolved.positioned[edge.target];
          if (!source || !target) return "";
          const path = buildEdgePath(source, target);
          const stroke = edge.renderKind === "typed" ? "rgba(56,189,248,0.94)" : "rgba(125,211,252,0.6)";
          const width = edge.renderKind === "typed" ? 3.1 : 1.8;
          const dash = edge.renderKind === "typed" ? "" : 'stroke-dasharray="8 8"';
          return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${width}" ${dash} marker-end="url(#arrow)" />`;
        })
        .join("\n")
    : "";

  const nodeSvg = resolved.nodes
    .map((node) => {
      const lines = wrapLabel(node.label, node.level === "lv1" ? 24 : 22, node.level === "lv1" ? 2 : 3);
      const lineStartY = node.y - (lines.length - 1) * 12;
      const text = lines
        .map(
          (line, index) =>
            `<text x="${round(node.x)}" y="${round(lineStartY + index * 28)}" fill="#ffffff" font-size="${node.level === "lv1" ? 24 : 21}" font-weight="700" text-anchor="middle">${escapeHtml(line)}</text>`
        )
        .join("");
      const badge = showLevelBadges
        ? `<text x="${round(node.x)}" y="${round(node.y + node.height / 2 - 14)}" fill="rgba(191,219,254,0.85)" font-size="11" font-weight="600" text-anchor="middle">${node.level.toUpperCase()}</text>`
        : "";
      return `
        <g>
          <rect x="${round(node.x - node.width / 2)}" y="${round(node.y - node.height / 2)}" rx="24" ry="24" width="${node.width}" height="${node.height}" fill="${node.fill}" stroke="${node.stroke}" stroke-width="${node.level === "lv1" ? 2 : 1.3}" />
          <rect x="${round(node.x - node.width / 2)}" y="${round(node.y - node.height / 2)}" rx="24" ry="24" width="${node.width}" height="${node.height}" fill="none" stroke="${node.glow}" stroke-width="10" />
          ${text}
          ${badge}
          <title>${escapeHtml(node.description)}</title>
        </g>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.title)} - configurable review preview</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 32%), linear-gradient(180deg, #0f172a, #020617);
      color: #e2e8f0;
    }
    .shell { padding: 28px; display: grid; gap: 18px; }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .card {
      background: rgba(15, 23, 42, 0.76);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      padding: 14px 16px;
      backdrop-filter: blur(12px);
    }
    h1, p { margin: 0; }
    .scores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .score { font-size: 13px; line-height: 1.4; }
    a { color: #7dd3fc; }
    svg { width: 100%; height: auto; border-radius: 22px; background: rgba(2, 6, 23, 0.62); border: 1px solid rgba(148, 163, 184, 0.14); }
  </style>
</head>
<body>
  <div class="shell">
    <div class="card">
      <h1>${escapeHtml(document.title)}</h1>
      <p style="margin-top:8px;color:rgba(226,232,240,0.76)">
        Strategy: <strong>${escapeHtml(strategy)}</strong> |
        Provider: <strong>${escapeHtml(provider)}</strong> |
        Layout: <strong>${escapeHtml(layout)}</strong> |
        Edge policy: <strong>${escapeHtml(edgePolicy)}</strong> |
        Graph JSON: <a href="${escapeHtml(outputRelativeJsonPath)}">open artifact</a>
      </p>
    </div>
    <div class="meta">
      <div class="card"><strong>Total score</strong><p style="margin-top:6px">${score.total}</p></div>
      <div class="card"><strong>Visible edges</strong><p style="margin-top:6px">${showEdges ? activeEdges.length : 0}</p></div>
      <div class="card"><strong>Nodes</strong><p style="margin-top:6px">${graph.nodes.length}</p></div>
    </div>
    <div class="scores">
      <div class="card score">Top-level concept quality: <strong>${score.topLevelConceptQuality}</strong></div>
      <div class="card score">Lv1/Lv2 readability: <strong>${score.lv1Lv2Readability}</strong></div>
      <div class="card score">Cluster coherence: <strong>${score.clusterCoherence}</strong></div>
      <div class="card score">Typed edge usefulness: <strong>${score.typedEdgeUsefulness}</strong></div>
      <div class="card score">Proximity usefulness vs clutter: <strong>${score.proximityUsefulnessVsClutter}</strong></div>
      <div class="card score">Overall scanability: <strong>${score.overallScanability}</strong></div>
    </div>
    <svg viewBox="0 0 ${resolved.width} ${resolved.height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Knowledge graph preview">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(56,189,248,0.94)" />
        </marker>
      </defs>
      ${edgeSvg}
      ${nodeSvg}
    </svg>
  </div>
</body>
</html>`;
}

export function buildBundleIndex(bundle) {
  const previewCards = bundle.documents
    .map(
      (document) => `
        <section class="card">
          <div class="meta">
            <div>
              <h2>${escapeHtml(document.title)}</h2>
              <p>${escapeHtml(document.fileName)}</p>
            </div>
            <div class="score">Total score: <strong>${document.score.total}</strong></div>
          </div>
          <div class="metrics">
            <span>Top-level ${document.score.topLevelConceptQuality}</span>
            <span>Readability ${document.score.lv1Lv2Readability}</span>
            <span>Cluster ${document.score.clusterCoherence}</span>
            <span>Scanability ${document.score.overallScanability}</span>
          </div>
          <div class="links">
            <a href="${escapeHtml(document.htmlFile)}">Open preview</a>
            <a href="${escapeHtml(document.jsonFile)}">Open JSON</a>
          </div>
          <iframe src="${escapeHtml(document.htmlFile)}" title="${escapeHtml(document.title)} preview"></iframe>
        </section>
      `
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GraphMind Final Review Bundle</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #0f172a, #020617);
      color: #e2e8f0;
    }
    .shell { max-width: 1600px; margin: 0 auto; padding: 28px; display: grid; gap: 20px; }
    .hero, .card {
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(15, 23, 42, 0.78);
      border-radius: 22px;
      backdrop-filter: blur(12px);
    }
    .hero { padding: 22px 24px; }
    .hero h1 { margin: 0; font-size: 30px; }
    .hero p { margin: 8px 0 0; color: rgba(226,232,240,0.78); }
    .hero .pill-row { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; }
    .pill {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(8, 17, 35, 0.92);
      border: 1px solid rgba(125, 211, 252, 0.28);
      font-size: 13px;
    }
    .card { padding: 16px; display: grid; gap: 14px; }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
    }
    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: rgba(226,232,240,0.85);
      font-size: 13px;
    }
    .metrics span {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.88);
    }
    .score {
      white-space: nowrap;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(8, 17, 35, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }
    .links { display: flex; flex-wrap: wrap; gap: 12px; }
    .links a { color: #7dd3fc; text-decoration: none; }
    iframe {
      width: 100%;
      height: 860px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      background: #020617;
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>GraphMind Final Review Bundle</h1>
      <p>Reusable, configurable render built from the winning research configuration.</p>
      <div class="pill-row">
        <div class="pill">Strategy: <strong>${escapeHtml(bundle.winner.strategyName)}</strong></div>
        <div class="pill">Layout: <strong>${escapeHtml(bundle.winner.layoutName)}</strong></div>
        <div class="pill">Edge policy: <strong>${escapeHtml(bundle.winner.edgePolicy)}</strong></div>
        <div class="pill">Average total: <strong>${bundle.winner.averageTotal}</strong></div>
      </div>
    </section>
    ${previewCards}
  </main>
</body>
</html>`;
}
