#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildBundleIndex,
  copyFile,
  ensureDir,
  readJson,
  renderArtifactPreview,
} from "./lib/review_bundle_renderer.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeArchivedResultPath(value) {
  return value
    .replace(/^research\/output\//, "research/kg_research_202503/output/")
    .replace(/^research\/kg_research\//, "research/kg_research_202503/");
}

async function main() {
  const configPath = path.join(__dirname, "config", "recommended_review.config.json");
  const config = await readJson(configPath);
  const summaryPath = path.resolve(__dirname, config.summaryPath);
  const outputDir = path.resolve(__dirname, config.outputDir);
  const summary = await readJson(summaryPath);
  const winner = summary.recommendation.winner;

  await ensureDir(outputDir);

  const bundle = {
    generatedAt: new Date().toISOString(),
    winner,
    documents: [],
  };

  const matching = summary.results.filter(
    (result) =>
      result.strategyName === winner.strategyName &&
      result.layoutName === winner.layoutName &&
      result.edgePolicy === winner.edgePolicy
  );

  for (const result of matching) {
    const sourceJson = path.resolve(__dirname, "..", "..", "..", normalizeArchivedResultPath(result.jsonPath));
    const artifact = await readJson(sourceJson);
    const htmlFile = `${result.documentId}.html`;
    const jsonFile = `${result.documentId}.json`;
    await copyFile(sourceJson, path.join(outputDir, jsonFile));
    await fs.writeFile(
      path.join(outputDir, htmlFile),
      renderArtifactPreview(artifact, jsonFile, config.renderer ?? {}),
      "utf8"
    );
    bundle.documents.push({
      id: result.documentId,
      title: result.documentTitle,
      fileName: result.documentId,
      score: result.score,
      htmlFile,
      jsonFile,
    });
  }

  bundle.documents.sort((left, right) => right.score.total - left.score.total);
  await fs.writeFile(path.join(outputDir, "index.html"), buildBundleIndex(bundle), "utf8");
  await fs.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  if (config.copyArchivedPng) {
    const sourcePngDir = path.resolve(__dirname, "..", "output", "recommended", "png");
    const targetPngDir = path.join(outputDir, "png");
    await ensureDir(targetPngDir);
    for (const entry of await fs.readdir(sourcePngDir)) {
      await copyFile(path.join(sourcePngDir, entry), path.join(targetPngDir, entry));
    }
  }

  console.log(
    JSON.stringify(
      {
        outputDir,
        winner,
        documents: bundle.documents.map((document) => ({
          id: document.id,
          htmlFile: document.htmlFile,
          jsonFile: document.jsonFile,
          total: document.score.total,
        })),
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
