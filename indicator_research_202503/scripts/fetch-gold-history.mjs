import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { fetchAssetHistory, fetchAssetSpot } from "../lib/alpha-vantage.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const outputDir = path.join(rootDir, "data", "alpha-vantage-gold");
const REQUEST_DELAY_MS = 1500;

await mkdir(outputDir, { recursive: true });

const daily = await fetchAssetHistory(rootDir, "gold", "daily");
await wait(REQUEST_DELAY_MS);
const weekly = await fetchAssetHistory(rootDir, "gold", "weekly");
await wait(REQUEST_DELAY_MS);
const monthly = await fetchAssetHistory(rootDir, "gold", "monthly");
await wait(REQUEST_DELAY_MS);
const spot = await fetchAssetSpot(rootDir, "gold");

await Promise.all([
  writeJson("daily.json", daily),
  writeJson("weekly.json", weekly),
  writeJson("monthly.json", monthly),
  writeJson("spot.json", spot),
  writeJson("summary.json", {
    capturedAt: new Date().toISOString(),
    source: "alpha-vantage",
    files: {
      daily: {
        points: daily.series.length,
        firstDate: daily.series[0]?.date ?? null,
        lastDate: daily.series.at(-1)?.date ?? null,
      },
      weekly: {
        points: weekly.series.length,
        firstDate: weekly.series[0]?.date ?? null,
        lastDate: weekly.series.at(-1)?.date ?? null,
      },
      monthly: {
        points: monthly.series.length,
        firstDate: monthly.series[0]?.date ?? null,
        lastDate: monthly.series.at(-1)?.date ?? null,
      },
      spot,
    },
  }),
]);

console.log(`Saved Alpha Vantage gold data to ${outputDir}`);

async function writeJson(filename, payload) {
  await writeFile(
    path.join(outputDir, filename),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
