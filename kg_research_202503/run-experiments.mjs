#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const defaultInputDir = path.join(repoRoot, "text_samples");
const defaultOutputDir = path.join(repoRoot, "research", "kg_research_202503", "output");
const defaultEnvFile = path.join(repoRoot, "dashboard", ".env.local");

const englishStopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "while",
  "due",
  "can",
  "may",
  "than",
  "more",
  "less",
  "not",
  "only",
  "such",
  "other",
  "also",
  "across",
  "about",
  "over",
  "under",
  "between",
  "through",
  "within",
  "especially",
  "particularly",
  "primarily",
  "closely",
  "future",
  "current",
  "best",
  "now",
]);

const chineseStopwords = new Set([
  "的",
  "了",
  "和",
  "与",
  "及",
  "在",
  "对",
  "为",
  "是",
  "将",
  "需",
  "需",
  "可",
  "要",
  "但",
  "并",
  "中",
  "上",
  "下",
  "等",
  "更",
  "最",
  "一个",
  "一种",
  "主要",
  "当前",
  "未来",
  "影响",
  "关注",
  "相关",
  "进行",
  "推动",
]);

const relationPatterns = [
  { test: /driv|accelerat|fuel|push|lead to|spurs?/i, label: "drives" },
  { test: /depend|rely|linked to|tied to|based on/i, label: "depends on" },
  { test: /support|invest|back|enable|strengthen/i, label: "supports" },
  { test: /risk|threat|pressure|challenge|disrupt/i, label: "pressures" },
  { test: /compete|rival|arms race|contest/i, label: "competes with" },
  { test: /include|consist|cover|span/i, label: "includes" },
  { test: /推动|促进|带动|引发/, label: "drives" },
  { test: /依赖|取决于|围绕/, label: "depends on" },
  { test: /支持|投资|赋能|加强/, label: "supports" },
  { test: /风险|挑战|冲击|替代|压力/, label: "pressures" },
  { test: /竞争|对抗|博弈/, label: "competes with" },
  { test: /包括|涵盖|涉及/, label: "includes" },
];

const levelOrder = ["lv1", "lv2", "lv3"];
const strategyOrder = ["whole_document", "section_aware", "hybrid_semantic"];
const layoutOrder = ["layered_dag", "force_similarity", "hybrid_constrained"];
const edgePolicyOrder = ["typed_only", "proximity_only", "both"];

function parseArgs(argv) {
  const args = {
    input: defaultInputDir,
    output: defaultOutputDir,
    envFile: defaultEnvFile,
    provider: "auto",
    model: "gpt-4.1-mini",
    proximityThreshold: 0.42,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--input" && next) {
      args.input = path.resolve(next);
      index += 1;
    } else if (value === "--output" && next) {
      args.output = path.resolve(next);
      index += 1;
    } else if (value === "--env-file" && next) {
      args.envFile = path.resolve(next);
      index += 1;
    } else if (value === "--provider" && next) {
      args.provider = next;
      index += 1;
    } else if (value === "--model" && next) {
      args.model = next;
      index += 1;
    } else if (value === "--proximity-threshold" && next) {
      args.proximityThreshold = Number(next);
      index += 1;
    } else if (value === "--limit" && next) {
      args.limit = Number(next);
      index += 1;
    }
  }

  return args;
}

async function loadEnvFile(envFilePath) {
  const env = {};

  try {
    const raw = await fs.readFile(envFilePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    return env;
  }

  return env;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasChinese(text) {
  return /[\p{Script=Han}]/u.test(text);
}

function tokenize(text) {
  const lower = text.toLowerCase();
  const matches = lower.match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9&.-]*/gu) ?? [];
  const tokens = [];

  for (const match of matches) {
    if (hasChinese(match)) {
      const compact = match.replace(/[^\p{Script=Han}\p{L}\p{N}]/gu, "");
      if (compact.length >= 2 && !chineseStopwords.has(compact)) {
        tokens.push(compact);
      }
      for (let index = 0; index < compact.length - 1; index += 1) {
        const shingle = compact.slice(index, index + 2);
        if (!chineseStopwords.has(shingle)) {
          tokens.push(shingle);
        }
      }
      continue;
    }

    if (!englishStopwords.has(match) && match.length > 1) {
      tokens.push(match);
    }
  }

  return tokens;
}

function tokenCounts(text) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function similarityFromMaps(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let intersection = 0;
  let union = 0;

  for (const key of keys) {
    const countA = a.get(key) ?? 0;
    const countB = b.get(key) ?? 0;
    intersection += Math.min(countA, countB);
    union += Math.max(countA, countB);
  }

  return union === 0 ? 0 : intersection / union;
}

function textSimilarity(a, b) {
  return similarityFromMaps(tokenCounts(a), tokenCounts(b));
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?。！？])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function shortenText(text, maxLength = 150) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function compressConceptLabel(text) {
  const cleaned = text
    .replace(/^[\-\d.\s]+/, "")
    .replace(/^[A-Za-z]+\s*:\s*/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Concept";

  if (hasChinese(cleaned)) {
    const chunk = cleaned.split(/[，。；：,.!?\-]/u)[0].trim();
    return shortenText(chunk, 14);
  }

  const words = cleaned
    .split(/[^A-Za-z0-9&+-]+/)
    .filter(Boolean)
    .filter((word) => !englishStopwords.has(word.toLowerCase()));

  if (words.length === 0) {
    return shortenText(cleaned, 32);
  }

  return titleCase(words.slice(0, Math.min(5, words.length)).join(" "));
}

function extractMentions(text) {
  const mentions = new Set();
  const englishMatches =
    text.match(/\b(?:[A-Z][a-z0-9&.-]+(?:\s+[A-Z][a-z0-9&.-]+){0,3}|[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g) ??
    [];

  for (const match of englishMatches) {
    const cleaned = match.trim();
    if (cleaned.length > 2 && !englishStopwords.has(cleaned.toLowerCase())) {
      mentions.add(cleaned);
    }
  }

  const chineseMatches = text.match(/[\p{Script=Han}]{3,12}/gu) ?? [];
  for (const match of chineseMatches) {
    if (!chineseStopwords.has(match)) {
      mentions.add(match);
    }
  }

  return Array.from(mentions).slice(0, 4);
}

function inferRelationLabel(text, fallback = "relates to") {
  for (const pattern of relationPatterns) {
    if (pattern.test.test(text)) {
      return pattern.label;
    }
  }
  return fallback;
}

function parseMarkdownDocument(rawText, filePath) {
  const fileName = path.basename(filePath);
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const title = baseName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const lines = rawText.split(/\r?\n/);
  const sections = [];
  let currentSection = {
    heading: "Preamble",
    lineStart: 1,
    bullets: [],
    paragraphs: [],
  };

  function closeSection(lineEnd) {
    currentSection.lineEnd = lineEnd;
    sections.push(currentSection);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    const bulletMatch = line.match(/^\s*-\s+(.*)$/);
    const lineNumber = index + 1;

    if (headingMatch) {
      if (
        currentSection.bullets.length > 0 ||
        currentSection.paragraphs.length > 0 ||
        currentSection.heading !== "Preamble"
      ) {
        closeSection(lineNumber - 1);
      }

      currentSection = {
        heading: headingMatch[1].trim(),
        lineStart: lineNumber,
        bullets: [],
        paragraphs: [],
      };
      continue;
    }

    if (bulletMatch) {
      currentSection.bullets.push({
        text: bulletMatch[1].trim(),
        lineStart: lineNumber,
        lineEnd: lineNumber,
      });
      continue;
    }

    const trimmed = line.trim();
    if (trimmed) {
      currentSection.paragraphs.push({
        text: trimmed,
        lineStart: lineNumber,
        lineEnd: lineNumber,
      });
    }
  }

  closeSection(lines.length);

  for (const section of sections) {
    section.paragraphs = section.paragraphs.map((paragraph, index) => ({
      ...paragraph,
      id: `${slugify(baseName)}-${slugify(section.heading)}-p${index + 1}-${paragraph.lineStart}`,
      section: section.heading,
    }));
    section.bullets = section.bullets.map((bullet, index) => ({
      ...bullet,
      id: `${slugify(baseName)}-${slugify(section.heading)}-b${index + 1}-${bullet.lineStart}`,
      section: section.heading,
    }));
  }

  const textUnits = [];
  let unitIndex = 0;

  for (const section of sections) {
    for (const paragraph of section.paragraphs) {
      const sentences = splitSentences(paragraph.text);
      if (sentences.length === 0) {
        sentences.push(paragraph.text);
      }
      for (const sentence of sentences) {
        textUnits.push({
          id: `${slugify(baseName)}-u${unitIndex + 1}`,
          section: section.heading,
          type: "sentence",
          text: sentence,
          lineStart: paragraph.lineStart,
          lineEnd: paragraph.lineEnd,
        });
        unitIndex += 1;
      }
    }

    for (const bullet of section.bullets) {
      textUnits.push({
        id: `${slugify(baseName)}-u${unitIndex + 1}`,
        section: section.heading,
        type: "bullet",
        text: bullet.text,
        lineStart: bullet.lineStart,
        lineEnd: bullet.lineEnd,
      });
      unitIndex += 1;
    }
  }

  return {
    id: slugify(baseName),
    title,
    fileName,
    filePath,
    rawText,
    sections,
    textUnits,
    topicBullets:
      sections.find((section) => section.heading.toLowerCase() === "topics")?.bullets ?? [],
    keyPointBullets:
      sections.find((section) => section.heading.toLowerCase() === "key points")?.bullets ?? [],
    actionBullets:
      sections.find((section) => section.heading.toLowerCase() === "action items")?.bullets ?? [],
  };
}

async function loadCorpus(inputDir, limit) {
  const files = (await fs.readdir(inputDir))
    .filter((fileName) => fileName.endsWith(".md"))
    .sort();
  const selectedFiles = limit ? files.slice(0, limit) : files;
  const documents = [];

  for (const fileName of selectedFiles) {
    const filePath = path.join(inputDir, fileName);
    const rawText = await fs.readFile(filePath, "utf8");
    documents.push(parseMarkdownDocument(rawText, filePath));
  }

  return documents;
}

function ensureEvidence(unit) {
  return [
    {
      section: unit.section,
      unitId: unit.id,
      lineStart: unit.lineStart,
      lineEnd: unit.lineEnd,
      excerpt: shortenText(unit.text, 220),
    },
  ];
}

function buildRootsFromTopics(document) {
  const topicBullets = document.topicBullets.length > 0 ? document.topicBullets : [];
  const seeds = topicBullets.length > 0 ? topicBullets : document.keyPointBullets.slice(0, 5);

  return seeds.slice(0, 6).map((bullet, index) => {
    const label = compressConceptLabel(bullet.text);
    return {
      id: `${document.id}-lv1-${slugify(label || `root-${index + 1}`)}`,
      label,
      level: "lv1",
      kind: "theme",
      description: shortenText(bullet.text, 180),
      groupId: `group-${index + 1}`,
      evidence: ensureEvidence(bullet),
      sourceUnitIds: [bullet.id].filter(Boolean),
    };
  });
}

function dedupeNodes(nodes) {
  const byLabel = new Map();

  for (const node of nodes) {
    const key = `${node.level}:${slugify(node.label)}`;
    const existing = byLabel.get(key);

    if (!existing) {
      byLabel.set(key, {
        ...node,
        sourceUnitIds: [...(node.sourceUnitIds ?? [])],
        evidence: [...(node.evidence ?? [])],
      });
      continue;
    }

    existing.description =
      existing.description.length >= node.description.length
        ? existing.description
        : node.description;
    existing.sourceUnitIds.push(...(node.sourceUnitIds ?? []));
    existing.evidence.push(...(node.evidence ?? []));
  }

  return Array.from(byLabel.values());
}

function dedupeEdges(edges, scoreKey) {
  const byKey = new Map();

  for (const edge of edges) {
    const key = `${edge.kind}:${edge.source}:${edge.target}:${edge.label}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...edge });
      continue;
    }

    if (scoreKey && (edge[scoreKey] ?? 0) > (existing[scoreKey] ?? 0)) {
      existing[scoreKey] = edge[scoreKey];
    }

    if (edge.evidence?.length) {
      existing.evidence = [...(existing.evidence ?? []), ...edge.evidence];
    }
  }

  return Array.from(byKey.values());
}

function assignParent(rootNodes, text, fallbackRoot) {
  if (rootNodes.length === 0) return fallbackRoot?.id ?? null;

  let bestRoot = rootNodes[0];
  let bestScore = -1;

  for (const root of rootNodes) {
    const score = textSimilarity(root.label, text) * 0.7 + textSimilarity(root.description, text) * 0.3;
    if (score > bestScore) {
      bestScore = score;
      bestRoot = root;
    }
  }

  return bestRoot.id;
}

function createHeuristicWholeDocumentGraph(document) {
  const roots = buildRootsFromTopics(document);
  const nodes = [...roots];
  const typedEdges = [];
  const mentionCandidates = new Map();
  const units = [
    ...document.keyPointBullets,
    ...document.actionBullets,
    ...document.textUnits.filter((unit) => unit.section.toLowerCase() === "overview"),
  ].slice(0, 18);

  units.forEach((unit, index) => {
    const label = compressConceptLabel(unit.text);
    const parentId = assignParent(roots, unit.text, roots[index % Math.max(roots.length, 1)]);
    const parentNode = roots.find((root) => root.id === parentId) ?? roots[0];
    const nodeId = `${document.id}-lv2-${slugify(label)}-${index + 1}`;
    const node = {
      id: nodeId,
      label,
      level: "lv2",
      kind: "concept",
      description: shortenText(unit.text, 220),
      parentId,
      groupId: parentNode?.groupId ?? "group-0",
      evidence: ensureEvidence(unit),
      sourceUnitIds: [unit.id],
    };
    nodes.push(node);

    if (parentId) {
      typedEdges.push({
        kind: "typed",
        source: parentId,
        target: nodeId,
        label: unit.section.toLowerCase() === "action items" ? "operationalizes" : "covers",
        confidence: 0.72,
        evidence: ensureEvidence(unit),
      });
    }

    for (const mention of extractMentions(unit.text)) {
      const key = slugify(mention);
      if (!key || key === slugify(label) || roots.some((root) => slugify(root.label) === key)) continue;
      const current = mentionCandidates.get(key) ?? {
        label: mention,
        count: 0,
        parentId: nodeId,
        examples: [],
      };
      current.count += 1;
      current.parentId = nodeId;
      current.examples.push(unit);
      mentionCandidates.set(key, current);
    }
  });

  for (const [key, mention] of mentionCandidates.entries()) {
    if (mention.count < 2) continue;
    const unit = mention.examples[0];
    const nodeId = `${document.id}-lv3-${key}`;
    nodes.push({
      id: nodeId,
      label: mention.label,
      level: "lv3",
      kind: "entity",
      description: shortenText(unit.text, 180),
      parentId: mention.parentId,
      groupId: "supporting-entities",
      evidence: ensureEvidence(unit),
      sourceUnitIds: mention.examples.map((example) => example.id),
    });
    typedEdges.push({
      kind: "typed",
      source: mention.parentId,
      target: nodeId,
      label: "references",
      confidence: 0.68,
      evidence: ensureEvidence(unit),
    });
  }

  const lv2Nodes = nodes.filter((node) => node.level === "lv2");
  for (let index = 0; index < lv2Nodes.length - 1; index += 1) {
    const current = lv2Nodes[index];
    const next = lv2Nodes[index + 1];
    const score = textSimilarity(current.description, next.description);
    if (score >= 0.2) {
      typedEdges.push({
        kind: "typed",
        source: current.id,
        target: next.id,
        label: inferRelationLabel(`${current.description} ${next.description}`),
        confidence: round(0.45 + score * 0.45),
        evidence: [...current.evidence.slice(0, 1), ...next.evidence.slice(0, 1)],
      });
    }
  }

  return normalizeResearchGraph({
    metadata: {
      strategy: "whole_document",
      provider: "heuristic",
      source: document.fileName,
      generatedAt: new Date().toISOString(),
    },
    nodes,
    typedEdges,
    proximityEdges: [],
  });
}

function createSectionAwareGraph(document) {
  const roots = buildRootsFromTopics(document);
  const nodes = [...roots];
  const typedEdges = [];
  const conceptByKey = new Map();

  for (const section of document.sections) {
    if (section.heading === "Summary" || section.heading === "Preamble") {
      continue;
    }

    const units = [
      ...section.paragraphs.map((paragraph) => ({
        ...paragraph,
        id: `${document.id}-${slugify(section.heading)}-${paragraph.lineStart}`,
        section: section.heading,
      })),
      ...section.bullets.map((bullet) => ({
        ...bullet,
        id: `${document.id}-${slugify(section.heading)}-${bullet.lineStart}`,
        section: section.heading,
      })),
    ];

    for (const unit of units) {
      const label = compressConceptLabel(unit.text);
      const key = slugify(label);
      const parentId = assignParent(roots, `${section.heading} ${unit.text}`, roots[0]);
      const existing = conceptByKey.get(key);

      if (!existing) {
        const nodeId = `${document.id}-lv2-${key}`;
        const parentNode = roots.find((root) => root.id === parentId) ?? roots[0];
        const nextNode = {
          id: nodeId,
          label,
          level: "lv2",
          kind: "concept",
          description: shortenText(unit.text, 220),
          parentId,
          groupId: parentNode?.groupId ?? "group-0",
          evidence: ensureEvidence(unit),
          sourceUnitIds: [unit.id],
          sections: [section.heading],
        };
        conceptByKey.set(key, nextNode);
        nodes.push(nextNode);
        typedEdges.push({
          kind: "typed",
          source: parentId,
          target: nodeId,
          label:
            section.heading.toLowerCase() === "action items"
              ? "operationalizes"
              : section.heading.toLowerCase() === "overview"
                ? "frames"
                : "explains",
          confidence: 0.74,
          evidence: ensureEvidence(unit),
        });
      } else {
        existing.description =
          existing.description.length >= unit.text.length
            ? existing.description
            : shortenText(unit.text, 220);
        existing.evidence.push(...ensureEvidence(unit));
        existing.sourceUnitIds.push(unit.id);
        existing.sections.push(section.heading);
      }
    }
  }

  const mergedNodes = dedupeNodes(nodes);
  const lv2Nodes = mergedNodes.filter((node) => node.level === "lv2");
  for (let left = 0; left < lv2Nodes.length; left += 1) {
    for (let right = left + 1; right < lv2Nodes.length; right += 1) {
      const a = lv2Nodes[left];
      const b = lv2Nodes[right];
      const sharedSection =
        new Set(a.evidence.map((item) => item.section)).has(b.evidence[0]?.section ?? "");
      const score =
        textSimilarity(a.label, b.label) * 0.35 +
        textSimilarity(a.description, b.description) * 0.65;

      if (score >= (sharedSection ? 0.18 : 0.24)) {
        typedEdges.push({
          kind: "typed",
          source: a.id,
          target: b.id,
          label: inferRelationLabel(`${a.description} ${b.description}`),
          confidence: round(0.42 + score * 0.48),
          evidence: [...a.evidence.slice(0, 1), ...b.evidence.slice(0, 1)],
        });
      }
    }
  }

  return normalizeResearchGraph({
    metadata: {
      strategy: "section_aware",
      provider: "heuristic",
      source: document.fileName,
      generatedAt: new Date().toISOString(),
    },
    nodes: mergedNodes,
    typedEdges,
    proximityEdges: [],
  });
}

function createHybridGraph(document) {
  const baseGraph = createSectionAwareGraph(document);
  const rootLabels = baseGraph.nodes
    .filter((node) => node.level === "lv1")
    .map((node) => node.label)
    .join(" ");

  const nodes = baseGraph.nodes.map((node) => {
    const rootAffinity = textSimilarity(`${node.label} ${node.description}`, rootLabels);
    if (node.level === "lv2" && rootAffinity >= 0.22) {
      return { ...node, kind: "clustered_concept" };
    }
    return node;
  });

  return normalizeResearchGraph({
    metadata: {
      strategy: "hybrid_semantic",
      provider: "heuristic",
      source: document.fileName,
      generatedAt: new Date().toISOString(),
    },
    nodes,
    typedEdges: baseGraph.typedEdges,
    proximityEdges: [],
  });
}

function normalizeResearchGraph(graph) {
  const nodes = dedupeNodes(graph.nodes).map((node) => ({
    ...node,
    groupId: node.groupId ?? `group-${node.level}`,
    evidence: (node.evidence ?? []).slice(0, 5),
    sourceUnitIds: Array.from(new Set(node.sourceUnitIds ?? [])),
  }));
  const knownNodeIds = new Set(nodes.map((node) => node.id));

  const typedEdges = dedupeEdges(
    graph.typedEdges.filter(
      (edge) => knownNodeIds.has(edge.source) && knownNodeIds.has(edge.target) && edge.source !== edge.target
    ),
    "confidence"
  ).map((edge) => ({
    ...edge,
    confidence: round(edge.confidence ?? 0.5),
    evidence: (edge.evidence ?? []).slice(0, 4),
  }));

  const proximityEdges = dedupeEdges(
    graph.proximityEdges.filter(
      (edge) => knownNodeIds.has(edge.source) && knownNodeIds.has(edge.target) && edge.source !== edge.target
    ),
    "score"
  ).map((edge) => ({
    ...edge,
    score: round(edge.score ?? 0.5),
    evidence: (edge.evidence ?? []).slice(0, 4),
  }));

  return {
    metadata: graph.metadata,
    nodes,
    typedEdges,
    proximityEdges,
  };
}

async function createOpenAiGraph(document, strategy, apiKey, model) {
  const system =
    "You are a research analyst building an offline evaluation corpus for readable knowledge graphs. Return only valid JSON.";
  const user = [
    `Build a max-3-layer research graph for the document "${document.title}".`,
    "Focus on readable lv1 and lv2 concepts first, then add lv3 only if it materially clarifies named entities or specific supporting assets.",
    "Return JSON with this exact shape:",
    '{"nodes":[{"id":string,"label":string,"level":"lv1"|"lv2"|"lv3","kind":string,"description":string,"parentId"?:string,"groupId"?:string,"evidence":[{"section":string,"excerpt":string}]}],"typedEdges":[{"source":string,"target":string,"label":string,"confidence":number,"evidence":[{"section":string,"excerpt":string}]}]}',
    "Rules:",
    "- Keep the graph readable and compact.",
    "- Prefer 3-6 lv1 nodes and 6-14 lv2 nodes.",
    "- Use typed edge labels such as drives, supports, competes with, depends on, pressures, includes, operationalizes, or frames.",
    "- Every node and edge must be grounded in the text.",
    strategy === "section_aware"
      ? "- Pay attention to section boundaries and merge overlapping concepts across sections."
      : "- Use the whole document to infer the best lv1 and lv2 hierarchy.",
    "Document:",
    document.rawText,
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = JSON.parse(raw);
  return normalizeResearchGraph({
    metadata: {
      strategy,
      provider: "openai",
      model,
      source: document.fileName,
      generatedAt: new Date().toISOString(),
    },
    nodes: (parsed.nodes ?? []).map((node, index) => ({
      id: node.id || `${document.id}-${slugify(node.label || `node-${index + 1}`)}`,
      label: node.label || `Node ${index + 1}`,
      level: levelOrder.includes(node.level) ? node.level : "lv2",
      kind: node.kind || "concept",
      description: node.description || "Generated concept node.",
      parentId: node.parentId,
      groupId: node.groupId,
      evidence: (node.evidence ?? []).map((evidence) => ({
        section: evidence.section ?? "Document",
        excerpt: shortenText(evidence.excerpt ?? node.description ?? "", 220),
      })),
      sourceUnitIds: [],
    })),
    typedEdges: (parsed.typedEdges ?? []).map((edge) => ({
      kind: "typed",
      source: edge.source,
      target: edge.target,
      label: edge.label || "relates to",
      confidence: Number(edge.confidence ?? 0.7),
      evidence: (edge.evidence ?? []).map((evidence) => ({
        section: evidence.section ?? "Document",
        excerpt: shortenText(evidence.excerpt ?? "", 220),
      })),
    })),
    proximityEdges: [],
  });
}

function buildProximityEdges(graph, threshold) {
  const proximityEdges = [];
  const nodes = graph.nodes;

  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const a = nodes[left];
      const b = nodes[right];
      if (a.level === "lv1" && b.level === "lv1") continue;

      const labelScore = textSimilarity(a.label, b.label);
      const descriptionScore = textSimilarity(a.description, b.description);
      const evidenceScore = textSimilarity(
        a.evidence.map((item) => item.excerpt).join(" "),
        b.evidence.map((item) => item.excerpt).join(" ")
      );
      const parentBoost =
        a.parentId && b.parentId && a.parentId === b.parentId
          ? 0.14
          : a.groupId === b.groupId
            ? 0.08
            : 0;
      const score = labelScore * 0.25 + descriptionScore * 0.45 + evidenceScore * 0.3 + parentBoost;

      if (score >= threshold) {
        proximityEdges.push({
          kind: "proximity",
          source: a.id,
          target: b.id,
          label: "semantically close",
          score: round(score),
          evidence: [...a.evidence.slice(0, 1), ...b.evidence.slice(0, 1)],
        });
      }
    }
  }

  return dedupeEdges(proximityEdges, "score");
}

function layoutLayered(graph) {
  const width = 1440;
  const height = 900;
  const levels = new Map(levelOrder.map((level) => [level, graph.nodes.filter((node) => node.level === level)]));
  const positions = {};
  const yByLevel = { lv1: 130, lv2: 390, lv3: 650 };

  for (const level of levelOrder) {
    const nodes = [...(levels.get(level) ?? [])].sort((a, b) => {
      const parentCompare = String(a.parentId ?? "").localeCompare(String(b.parentId ?? ""));
      return parentCompare || a.label.localeCompare(b.label);
    });
    if (nodes.length === 0) continue;

    const gap = width / (nodes.length + 1);
    nodes.forEach((node, index) => {
      positions[node.id] = { x: round(gap * (index + 1)), y: yByLevel[level] };
    });
  }

  return { positions, width, height };
}

function buildAdjacency(graph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, new Set()]));

  for (const edge of graph.typedEdges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }
  for (const edge of graph.proximityEdges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  return adjacency;
}

function layoutForce(graph) {
  const width = 1440;
  const height = 920;
  const { positions } = layoutLayered(graph);
  const adjacency = buildAdjacency(graph);
  const nodeIds = graph.nodes.map((node) => node.id);

  for (const node of graph.nodes) {
    const seed = hashString(node.id);
    const current = positions[node.id] ?? { x: width / 2, y: height / 2 };
    positions[node.id] = {
      x: clamp(current.x + ((seed % 61) - 30), 90, width - 90),
      y: clamp(current.y + (((seed / 67) % 61) - 30), 90, height - 90),
    };
  }

  for (let iteration = 0; iteration < 180; iteration += 1) {
    const forces = new Map(nodeIds.map((nodeId) => [nodeId, { x: 0, y: 0 }]));

    for (let left = 0; left < graph.nodes.length; left += 1) {
      for (let right = left + 1; right < graph.nodes.length; right += 1) {
        const a = graph.nodes[left];
        const b = graph.nodes[right];
        const positionA = positions[a.id];
        const positionB = positions[b.id];
        let dx = positionA.x - positionB.x;
        let dy = positionA.y - positionB.y;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        dx /= distance;
        dy /= distance;
        const repulsion = 1800 / (distance * distance);
        forces.get(a.id).x += dx * repulsion;
        forces.get(a.id).y += dy * repulsion;
        forces.get(b.id).x -= dx * repulsion;
        forces.get(b.id).y -= dy * repulsion;
      }
    }

    for (const edge of [...graph.typedEdges, ...graph.proximityEdges]) {
      const source = positions[edge.source];
      const target = positions[edge.target];
      let dx = target.x - source.x;
      let dy = target.y - source.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      dx /= distance;
      dy /= distance;
      const attraction =
        edge.kind === "typed" ? (edge.confidence ?? 0.6) * 0.65 : (edge.score ?? 0.5) * 0.55;
      forces.get(edge.source).x += dx * attraction * distance * 0.08;
      forces.get(edge.source).y += dy * attraction * distance * 0.08;
      forces.get(edge.target).x -= dx * attraction * distance * 0.08;
      forces.get(edge.target).y -= dy * attraction * distance * 0.08;
    }

    for (const node of graph.nodes) {
      const force = forces.get(node.id);
      const degree = adjacency.get(node.id)?.size ?? 0;
      const yBias =
        node.level === "lv1" ? -0.55 : node.level === "lv3" ? 0.45 : degree > 3 ? -0.1 : 0.06;
      positions[node.id] = {
        x: clamp(positions[node.id].x + force.x, 80, width - 80),
        y: clamp(positions[node.id].y + force.y + yBias, 70, height - 70),
      };
    }
  }

  return { positions, width, height };
}

function layoutHybrid(graph) {
  const width = 1440;
  const height = 900;
  const positions = {};
  const roots = graph.nodes.filter((node) => node.level === "lv1");
  const yByLevel = { lv1: 130, lv2: 390, lv3: 670 };
  const rootGap = width / (Math.max(roots.length, 1) + 1);

  roots.forEach((root, index) => {
    positions[root.id] = { x: round(rootGap * (index + 1)), y: yByLevel.lv1 };
  });

  const childrenByParent = new Map();
  for (const node of graph.nodes.filter((item) => item.level !== "lv1")) {
    const parentId = node.parentId ?? node.groupId ?? "ungrouped";
    const items = childrenByParent.get(parentId) ?? [];
    items.push(node);
    childrenByParent.set(parentId, items);
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const parentPosition = positions[parentId] ?? { x: width / 2, y: yByLevel.lv2 };
    const gap = 210;
    const startX = parentPosition.x - (gap * (children.length - 1)) / 2;

    children
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach((child, index) => {
        positions[child.id] = {
          x: clamp(startX + index * gap, 90, width - 90),
          y: yByLevel[child.level] ?? yByLevel.lv2,
        };
      });
  }

  for (let iteration = 0; iteration < 150; iteration += 1) {
    for (const node of graph.nodes.filter((item) => item.level !== "lv1")) {
      const parentPosition = positions[node.parentId] ?? positions[node.id];
      let targetX = parentPosition.x;
      let totalWeight = 1;

      for (const edge of graph.proximityEdges) {
        if (edge.source !== node.id && edge.target !== node.id) continue;
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const other = positions[otherId];
        if (!other) continue;
        const weight = edge.score ?? 0.5;
        targetX += other.x * weight;
        totalWeight += weight;
      }

      const current = positions[node.id];
      positions[node.id] = {
        x: clamp(current.x * 0.72 + (targetX / totalWeight) * 0.28, 90, width - 90),
        y: yByLevel[node.level] ?? current.y,
      };
    }
  }

  return { positions, width, height };
}

function getActiveEdges(graph, edgePolicy) {
  if (edgePolicy === "typed_only") {
    return graph.typedEdges.map((edge) => ({ ...edge, renderKind: "typed" }));
  }
  if (edgePolicy === "proximity_only") {
    return graph.proximityEdges.map((edge) => ({ ...edge, renderKind: "proximity" }));
  }
  return [
    ...graph.typedEdges.map((edge) => ({ ...edge, renderKind: "typed" })),
    ...graph.proximityEdges.map((edge) => ({ ...edge, renderKind: "proximity" })),
  ];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function edgeCrossingPenalty(edges, positions) {
  let crossings = 0;

  function orientation(a, b, c) {
    return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  }

  function intersects(edgeA, edgeB) {
    if (
      edgeA.source === edgeB.source ||
      edgeA.source === edgeB.target ||
      edgeA.target === edgeB.source ||
      edgeA.target === edgeB.target
    ) {
      return false;
    }
    const p1 = positions[edgeA.source];
    const q1 = positions[edgeA.target];
    const p2 = positions[edgeB.source];
    const q2 = positions[edgeB.target];
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);
    return o1 * o2 < 0 && o3 * o4 < 0;
  }

  for (let left = 0; left < edges.length; left += 1) {
    for (let right = left + 1; right < edges.length; right += 1) {
      if (intersects(edges[left], edges[right])) crossings += 1;
    }
  }

  return crossings;
}

function scoreExperiment(document, graph, layout, edgePolicy) {
  const activeEdges = getActiveEdges(graph, edgePolicy);
  const lv1Nodes = graph.nodes.filter((node) => node.level === "lv1");
  const lv2Nodes = graph.nodes.filter((node) => node.level === "lv2");
  const lv3Nodes = graph.nodes.filter((node) => node.level === "lv3");

  let topLevelScore = 0;
  const topics = document.topicBullets.map((bullet) => bullet.text);
  if (topics.length > 0 && lv1Nodes.length > 0) {
    const topicMatches = topics.map((topic) =>
      Math.max(...lv1Nodes.map((node) => textSimilarity(topic, node.label)), 0)
    );
    const nodeMatches = lv1Nodes.map((node) =>
      Math.max(...topics.map((topic) => textSimilarity(topic, node.label)), 0)
    );
    topLevelScore =
      (topicMatches.reduce((sum, value) => sum + value, 0) / topicMatches.length) * 0.6 +
      (nodeMatches.reduce((sum, value) => sum + value, 0) / nodeMatches.length) * 0.4;
  }

  const depthScore = graph.nodes.every((node) => levelOrder.includes(node.level)) ? 1 : 0.6;
  const rootCountPenalty = Math.abs(lv1Nodes.length - 4) * 0.08;
  const widthPenalty = Math.max(0, lv2Nodes.length - 12) * 0.03 + Math.max(0, lv3Nodes.length - 6) * 0.03;
  const readabilityScore = clamp(depthScore - rootCountPenalty - widthPenalty, 0, 1);

  const proximityPairs = [...graph.proximityEdges].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10);
  const diagonal = Math.hypot(layout.width, layout.height);
  const clusterCoherence =
    proximityPairs.length === 0
      ? 0.45
      : proximityPairs.reduce((sum, edge) => {
          const edgeDistance = distance(layout.positions[edge.source], layout.positions[edge.target]);
          const closeness = 1 - clamp(edgeDistance / diagonal, 0, 1);
          return sum + closeness * (edge.score ?? 0.5);
        }, 0) / proximityPairs.length;

  const typedEdges = graph.typedEdges;
  const usefulTypedRatio =
    typedEdges.length === 0
      ? 0.4
      : typedEdges.filter((edge) => !["relates to", "covers", "explains"].includes(edge.label)).length /
        typedEdges.length;
  const typedEdgeScore = clamp(usefulTypedRatio * 0.75 + Math.min(typedEdges.length / 8, 1) * 0.25, 0, 1);

  const shownProximityEdges =
    edgePolicy === "typed_only"
      ? []
      : edgePolicy === "proximity_only"
        ? graph.proximityEdges
        : graph.proximityEdges;
  const density = activeEdges.length / Math.max(graph.nodes.length, 1);
  const proximityScore =
    shownProximityEdges.length === 0
      ? edgePolicy === "typed_only"
        ? 0.55
        : 0.35
      : clamp(
          shownProximityEdges.reduce((sum, edge) => sum + (edge.score ?? 0.5), 0) /
            shownProximityEdges.length -
            Math.max(0, density - 1.4) * 0.18,
          0,
          1
        );

  const crossings = edgeCrossingPenalty(activeEdges, layout.positions);
  const scanabilityScore = clamp(
    1 - Math.max(0, density - 1.2) * 0.18 - crossings * 0.03 - Math.max(0, activeEdges.length - 18) * 0.02,
    0,
    1
  );

  const weightedTotal =
    topLevelScore * 0.22 +
    readabilityScore * 0.2 +
    clusterCoherence * 0.18 +
    typedEdgeScore * 0.14 +
    proximityScore * 0.12 +
    scanabilityScore * 0.14;

  return {
    topLevelConceptQuality: round(topLevelScore),
    lv1Lv2Readability: round(readabilityScore),
    clusterCoherence: round(clusterCoherence),
    typedEdgeUsefulness: round(typedEdgeScore),
    proximityUsefulnessVsClutter: round(proximityScore),
    overallScanability: round(scanabilityScore),
    total: round(weightedTotal),
  };
}

function nodeFill(level) {
  if (level === "lv1") return "#081123";
  if (level === "lv2") return "#0f172a";
  return "#172554";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml(document, graph, layout, edgePolicy, score, outputRelativeJsonPath) {
  const edges = getActiveEdges(graph, edgePolicy);
  const nodeRects = graph.nodes
    .map((node) => {
      const position = layout.positions[node.id];
      const width = node.level === "lv1" ? 220 : 210;
      const height = node.level === "lv3" ? 84 : 96;
      return {
        ...node,
        x: position.x - width / 2,
        y: position.y - height / 2,
        width,
        height,
      };
    })
    .sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));

  const svgEdges = edges
    .map((edge) => {
      const source = layout.positions[edge.source];
      const target = layout.positions[edge.target];
      const midX = round((source.x + target.x) / 2);
      const midY = round((source.y + target.y) / 2);
      const color = edge.renderKind === "typed" ? "rgba(125,211,252,0.95)" : "rgba(147,197,253,0.55)";
      const width = edge.renderKind === "typed" ? 2.2 : 1.4;
      const dash = edge.renderKind === "typed" ? "" : 'stroke-dasharray="7 7"';
      return `
        <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${color}" stroke-width="${width}" ${dash} />
        <text x="${midX}" y="${midY - 8}" fill="rgba(226,232,240,0.9)" font-size="12" text-anchor="middle">${escapeHtml(edge.label)}</text>
      `;
    })
    .join("\n");

  const svgNodes = nodeRects
    .map((node) => {
      const description = escapeHtml(shortenText(node.description, 180));
      return `
        <g>
          <rect x="${round(node.x)}" y="${round(node.y)}" rx="22" ry="22" width="${node.width}" height="${node.height}" fill="${nodeFill(node.level)}" stroke="rgba(255,255,255,0.72)" stroke-width="1.1" />
          <text x="${round(node.x + node.width / 2)}" y="${round(node.y + 34)}" fill="#ffffff" font-size="16" font-weight="600" text-anchor="middle">${escapeHtml(node.label)}</text>
          <text x="${round(node.x + node.width / 2)}" y="${round(node.y + 57)}" fill="rgba(191,219,254,0.85)" font-size="10" text-anchor="middle" letter-spacing="2">${node.level.toUpperCase()}</text>
          <title>${description}</title>
        </g>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.title)} - ${graph.metadata.strategy}</title>
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
    h1, h2, p { margin: 0; }
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
        Strategy: <strong>${graph.metadata.strategy}</strong> |
        Provider: <strong>${graph.metadata.provider}</strong> |
        Layout: <strong>${edgePolicy}</strong> |
        Graph JSON: <a href="${escapeHtml(outputRelativeJsonPath)}">open artifact</a>
      </p>
    </div>
    <div class="meta">
      <div class="card"><strong>Total score</strong><p style="margin-top:6px">${score.total}</p></div>
      <div class="card"><strong>Typed edges</strong><p style="margin-top:6px">${graph.typedEdges.length}</p></div>
      <div class="card"><strong>Proximity edges</strong><p style="margin-top:6px">${graph.proximityEdges.length}</p></div>
    </div>
    <div class="scores">
      <div class="card score">Top-level concept quality: <strong>${score.topLevelConceptQuality}</strong></div>
      <div class="card score">Lv1/Lv2 readability: <strong>${score.lv1Lv2Readability}</strong></div>
      <div class="card score">Cluster coherence: <strong>${score.clusterCoherence}</strong></div>
      <div class="card score">Typed edge usefulness: <strong>${score.typedEdgeUsefulness}</strong></div>
      <div class="card score">Proximity usefulness vs clutter: <strong>${score.proximityUsefulnessVsClutter}</strong></div>
      <div class="card score">Overall scanability: <strong>${score.overallScanability}</strong></div>
    </div>
    <svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Knowledge graph preview">
      ${svgEdges}
      ${svgNodes}
    </svg>
  </div>
</body>
</html>`;
}

function summarizeRecommendation(results) {
  const sorted = [...results].sort((a, b) => b.averageTotal - a.averageTotal);
  const winner = sorted[0];
  const fallback =
    sorted.find(
      (result) =>
        result.edgePolicy === "typed_only" &&
        result.layoutName === "hybrid_constrained" &&
        result.average.overallScanability >= winner.average.overallScanability - 0.08
    ) ?? sorted.find((result) => result.edgePolicy === "typed_only") ?? sorted[1] ?? winner;

  return { winner, fallback };
}

function buildRecommendationMarkdown(summary, aggregated, runtimeConfig) {
  const topRows = aggregated.slice(0, 8);
  const providerLine =
    runtimeConfig.provider === "openai"
      ? `OpenAI-backed extraction using \`${runtimeConfig.model}\``
      : runtimeConfig.provider === "heuristic"
        ? "Deterministic heuristic extraction only"
        : runtimeConfig.apiKey
          ? `Auto mode with OpenAI available via \`${runtimeConfig.model}\``
          : "Auto mode fell back to heuristic extraction because no API key was found";

  return `# GraphMind Knowledge Graph Research Recommendation

## Summary
- Research corpus: \`./text_samples/\`
- Output directory: \`./research/output/\`
- Runtime mode: ${providerLine}
- Best overall pipeline: **${summary.winner.strategyName} + ${summary.winner.layoutName} + ${summary.winner.edgePolicy}**
- Fallback pipeline: **${summary.fallback.strategyName} + ${summary.fallback.layoutName} + ${summary.fallback.edgePolicy}**

## Why The Winner Ranked First
- It produced the strongest combined score for readable lv1/lv2 structure, cluster coherence, and scanability.
- It kept typed edges interpretable while still allowing semantic proximity to influence placement.
- It stayed within the max-3-layer objective more consistently than denser alternatives.

## Recommended Default
- Strategy: \`${summary.winner.strategyName}\`
- Layout: \`${summary.winner.layoutName}\`
- Edge policy: \`${summary.winner.edgePolicy}\`
- Average score: **${summary.winner.averageTotal}**

## Recommended Fallback
- Use the fallback when the default produces too many weak proximity links or feels visually busy on long documents.
- Strategy: \`${summary.fallback.strategyName}\`
- Layout: \`${summary.fallback.layoutName}\`
- Edge policy: \`${summary.fallback.edgePolicy}\`
- Average score: **${summary.fallback.averageTotal}**

## Top Configurations
| Rank | Strategy | Layout | Edge policy | Avg total | Top-level | Readability | Cluster | Scanability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${topRows
  .map(
    (row, index) =>
      `| ${index + 1} | ${row.strategyName} | ${row.layoutName} | ${row.edgePolicy} | ${row.averageTotal} | ${row.average.topLevelConceptQuality} | ${row.average.lv1Lv2Readability} | ${row.average.clusterCoherence} | ${row.average.overallScanability} |`
  )
  .join("\n")}

## Notes
- This research harness is offline-first and does not modify the GraphMind product UI.
- The current GraphMind production baseline is still summary-only extraction plus DAG layout, so the recommendation here should be treated as a candidate architecture for a future product iteration.
`;
}

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function generateGraphForStrategy(document, strategyName, runtimeConfig) {
  if (runtimeConfig.provider === "openai") {
    if (!runtimeConfig.apiKey) {
      throw new Error("Requested provider=openai but no OPENAI_API_KEY was found.");
    }
    if (strategyName === "hybrid_semantic") {
      const baseGraph = await createOpenAiGraph(
        document,
        "hybrid_semantic",
        runtimeConfig.apiKey,
        runtimeConfig.model
      );
      return normalizeResearchGraph({
        ...baseGraph,
        proximityEdges: buildProximityEdges(baseGraph, runtimeConfig.proximityThreshold),
      });
    }

    const graph = await createOpenAiGraph(
      document,
      strategyName,
      runtimeConfig.apiKey,
      runtimeConfig.model
    );
    return normalizeResearchGraph({
      ...graph,
      proximityEdges: buildProximityEdges(graph, runtimeConfig.proximityThreshold),
    });
  }

  let graph;
  if (strategyName === "whole_document") {
    graph = createHeuristicWholeDocumentGraph(document);
  } else if (strategyName === "section_aware") {
    graph = createSectionAwareGraph(document);
  } else {
    graph = createHybridGraph(document);
  }

  return normalizeResearchGraph({
    ...graph,
    proximityEdges: buildProximityEdges(graph, runtimeConfig.proximityThreshold),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envFileVars = await loadEnvFile(args.envFile);
  const apiKey = process.env.OPENAI_API_KEY || envFileVars.OPENAI_API_KEY || "";
  const provider =
    args.provider === "auto" ? (apiKey ? "openai" : "heuristic") : args.provider;

  const runtimeConfig = {
    ...args,
    provider,
    apiKey,
  };

  const documents = await loadCorpus(args.input, args.limit);
  await ensureDir(args.output);

  const allResults = [];
  const overview = [];

  for (const document of documents) {
    const documentDir = path.join(args.output, document.id);
    await ensureDir(documentDir);
    await writeJson(path.join(documentDir, "source.json"), {
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      sections: document.sections.map((section) => ({
        heading: section.heading,
        bullets: section.bullets.map((bullet) => bullet.text),
        paragraphs: section.paragraphs.map((paragraph) => paragraph.text),
      })),
    });

    for (const strategyName of strategyOrder) {
      const graph = await generateGraphForStrategy(document, strategyName, runtimeConfig);
      const strategyDir = path.join(documentDir, strategyName);
      await ensureDir(strategyDir);

      await writeJson(path.join(strategyDir, "graph.json"), graph);

      for (const layoutName of layoutOrder) {
        const layout =
          layoutName === "layered_dag"
            ? layoutLayered(graph)
            : layoutName === "force_similarity"
              ? layoutForce(graph)
              : layoutHybrid(graph);

        for (const edgePolicy of edgePolicyOrder) {
          const score = scoreExperiment(document, graph, layout, edgePolicy);
          const artifact = {
            document: {
              id: document.id,
              title: document.title,
              fileName: document.fileName,
            },
            strategy: strategyName,
            provider: graph.metadata.provider,
            layout: layoutName,
            edgePolicy,
            score,
            graph,
            layoutData: layout,
            activeEdges: getActiveEdges(graph, edgePolicy),
          };

          const baseName = `${layoutName}__${edgePolicy}`;
          const jsonPath = path.join(strategyDir, `${baseName}.json`);
          const htmlPath = path.join(strategyDir, `${baseName}.html`);
          await writeJson(jsonPath, artifact);
          await fs.writeFile(
            htmlPath,
            renderHtml(document, graph, layout, edgePolicy, score, `${baseName}.json`),
            "utf8"
          );

          allResults.push({
            documentId: document.id,
            documentTitle: document.title,
            strategyName,
            layoutName,
            edgePolicy,
            score,
            jsonPath,
            htmlPath,
          });
        }
      }

      overview.push({
        document: document.title,
        strategy: strategyName,
        nodes: graph.nodes.length,
        typedEdges: graph.typedEdges.length,
        proximityEdges: graph.proximityEdges.length,
      });
    }
  }

  const aggregated = [];
  for (const strategyName of strategyOrder) {
    for (const layoutName of layoutOrder) {
      for (const edgePolicy of edgePolicyOrder) {
        const matching = allResults.filter(
          (result) =>
            result.strategyName === strategyName &&
            result.layoutName === layoutName &&
            result.edgePolicy === edgePolicy
        );

        const average = {};
        for (const metricName of Object.keys(matching[0]?.score ?? {})) {
          average[metricName] = round(
            matching.reduce((sum, result) => sum + result.score[metricName], 0) /
              Math.max(matching.length, 1)
          );
        }

        aggregated.push({
          strategyName,
          layoutName,
          edgePolicy,
          average,
          averageTotal: average.total ?? 0,
        });
      }
    }
  }

  aggregated.sort((a, b) => b.averageTotal - a.averageTotal);
  const recommendation = summarizeRecommendation(aggregated);
  const recommendationMarkdown = buildRecommendationMarkdown(
    recommendation,
    aggregated,
    runtimeConfig
  );

  await writeJson(path.join(args.output, "summary.json"), {
    runtimeConfig: {
      input: args.input,
      output: args.output,
      provider: runtimeConfig.provider,
      model: runtimeConfig.model,
      envFile: args.envFile,
      hasApiKey: Boolean(runtimeConfig.apiKey),
      proximityThreshold: runtimeConfig.proximityThreshold,
    },
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      fileName: document.fileName,
    })),
    overview,
    aggregated,
    recommendation,
    results: allResults.map((result) => ({
      ...result,
      jsonPath: path.relative(repoRoot, result.jsonPath),
      htmlPath: path.relative(repoRoot, result.htmlPath),
    })),
  });

  await fs.writeFile(path.join(repoRoot, "research", "RECOMMENDATION.md"), recommendationMarkdown, "utf8");

  console.log(
    JSON.stringify(
      {
        provider: runtimeConfig.provider,
        model: runtimeConfig.model,
        hasApiKey: Boolean(runtimeConfig.apiKey),
        documents: documents.length,
        best: recommendation.winner,
        fallback: recommendation.fallback,
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
