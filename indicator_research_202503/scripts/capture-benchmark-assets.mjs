import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  assetCatalog,
  fetchAssetHistory,
  fetchAssetSpot,
} from "../lib/alpha-vantage.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const REQUEST_DELAY_MS = 1500;
const intervals = ["daily", "weekly", "monthly"];
const forceRefresh = process.argv.includes("--refresh");

for (const asset of assetCatalog) {
  const outputDir = path.join(rootDir, "data", asset.dataDirName);
  await mkdir(outputDir, { recursive: true });

  const historyPayloads = {};

  for (const interval of intervals) {
    const filename = `${interval}.json`;
    const filePath = path.join(outputDir, filename);
    const existing = !forceRefresh ? await readJsonIfExists(filePath) : null;

    if (existing) {
      historyPayloads[interval] = existing;
      continue;
    }

    const payload = await fetchAssetHistory(rootDir, asset.id, interval);
    historyPayloads[interval] = payload;
    await writeJson(filePath, payload);
    await wait(REQUEST_DELAY_MS);
  }

  const spotPath = path.join(outputDir, "spot.json");
  const existingSpot = !forceRefresh ? await readJsonIfExists(spotPath) : null;
  let spot = existingSpot;

  if (!spot) {
    if (asset.id === "us10y") {
      const latest = historyPayloads.daily?.series?.at(-1);
      if (!latest) {
        throw new Error("Unable to derive US 10Y spot from captured daily history.");
      }

      spot = {
        source: "alpha-vantage-derived-spot",
        symbol: historyPayloads.daily.symbol,
        price: latest.close,
        timestamp: latest.date,
        warning: historyPayloads.daily.warning ?? null,
      };
    } else {
      spot = await fetchAssetSpot(rootDir, asset.id);
      await wait(REQUEST_DELAY_MS);
    }

    await writeJson(spotPath, spot);
  }

  await writeJson(path.join(outputDir, "summary.json"), {
    capturedAt: new Date().toISOString(),
    source: "alpha-vantage",
    assetId: asset.id,
    files: {
      daily: summarizeSeries(historyPayloads.daily),
      weekly: summarizeSeries(historyPayloads.weekly),
      monthly: summarizeSeries(historyPayloads.monthly),
      spot,
    },
  });

  console.log(`Saved ${asset.id} data to ${outputDir}`);
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function readJsonIfExists(filePath) {
  try {
    await access(filePath);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizeSeries(payload) {
  if (!payload?.series?.length) return null;

  return {
    points: payload.series.length,
    firstDate: payload.series[0]?.date ?? null,
    lastDate: payload.series.at(-1)?.date ?? null,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
