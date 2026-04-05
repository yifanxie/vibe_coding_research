#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const recommendedDir = path.join(repoRoot, "research", "kg_research_202503", "output", "recommended");
const pngDir = path.join(recommendedDir, "png");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function renderThumbnail(htmlPath) {
  await execFileAsync("/usr/bin/qlmanage", [
    "-t",
    "-s",
    "1800",
    "-o",
    pngDir,
    htmlPath,
  ]);
}

function buildGallery(bundle) {
  const cards = bundle.documents
    .map(
      (document) => `
        <section class="card">
          <div class="meta">
            <div>
              <h2>${escapeHtml(document.title)}</h2>
              <p>${escapeHtml(document.id)}</p>
            </div>
            <div class="score">Total score: <strong>${document.total}</strong></div>
          </div>
          <div class="links">
            <a href="../${escapeHtml(document.htmlFile)}">HTML preview</a>
            <a href="../${escapeHtml(document.jsonFile)}">JSON artifact</a>
            <a href="${escapeHtml(document.pngFile)}">PNG image</a>
          </div>
          <img src="${escapeHtml(document.pngFile)}" alt="${escapeHtml(document.title)} PNG preview" />
        </section>
      `
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Top Recommendation PNG Gallery</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #0f172a, #020617);
      color: #e2e8f0;
    }
    main { max-width: 1600px; margin: 0 auto; padding: 28px; display: grid; gap: 20px; }
    .hero, .card {
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(15, 23, 42, 0.78);
      border-radius: 22px;
      padding: 18px;
    }
    .hero h1, .meta h2 { margin: 0; }
    .hero p, .meta p { color: rgba(226,232,240,0.74); }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }
    .score {
      white-space: nowrap;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(8, 17, 35, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }
    .links {
      margin: 10px 0 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .links a { color: #7dd3fc; text-decoration: none; }
    img {
      width: 100%;
      height: auto;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: #020617;
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Top Recommendation PNG Gallery</h1>
      <p>Quick Look screenshots generated from the winning GraphMind preview bundle.</p>
    </section>
    ${cards}
  </main>
</body>
</html>`;
}

async function main() {
  const manifest = JSON.parse(
    await fs.readFile(path.join(recommendedDir, "manifest.json"), "utf8")
  );
  await ensureDir(pngDir);

  const bundle = {
    generatedAt: new Date().toISOString(),
    documents: [],
  };

  for (const document of manifest.documents) {
    const htmlPath = path.join(recommendedDir, document.htmlFile);
    await renderThumbnail(htmlPath);
    const pngFile = `${document.htmlFile}.png`;
    bundle.documents.push({
      id: document.id,
      title: document.title,
      total: document.score.total,
      htmlFile: document.htmlFile,
      jsonFile: document.jsonFile,
      pngFile,
    });
  }

  await fs.writeFile(
    path.join(pngDir, "index.html"),
    buildGallery(bundle),
    "utf8"
  );
  await fs.writeFile(
    path.join(pngDir, "manifest.json"),
    `${JSON.stringify(bundle, null, 2)}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputDir: path.relative(repoRoot, pngDir),
        files: bundle.documents.map((document) => document.pngFile),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
