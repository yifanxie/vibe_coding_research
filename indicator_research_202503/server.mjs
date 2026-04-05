import { createReadStream } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  assetCatalog,
  fetchAssetHistory,
  fetchAssetSpot,
  getAssetConfig,
  loadAlphaVantageApiKey,
} from "./lib/alpha-vantage.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4173);
const DATA_ROOT = path.join(__dirname, "data");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

await mkdir(DATA_ROOT, { recursive: true });
await Promise.all(
  assetCatalog.map((asset) =>
    mkdir(path.join(DATA_ROOT, asset.dataDirName), { recursive: true })
  )
);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const routeMatch = url.pathname.match(
      /^\/api\/alpha-vantage\/([a-z0-9-]+)\/(history|spot)$/
    );

    if (routeMatch) {
      const [, assetId, kind] = routeMatch;
      const forceRefresh = url.searchParams.get("refresh") === "1";

      getAssetConfig(assetId);

      if (kind === "history") {
        const interval = url.searchParams.get("interval") || "daily";
        const payload = await getHistoryPayload(assetId, interval, forceRefresh);
        return json(response, 200, payload);
      }

      const payload = await getSpotPayload(assetId, forceRefresh);
      return json(response, 200, payload);
    }

    if (url.pathname === "/api/alpha-vantage/status") {
      try {
        await loadAlphaVantageApiKey(__dirname);
        return json(response, 200, { ok: true });
      } catch (error) {
        return json(response, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    return json(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Indicator research app listening on http://127.0.0.1:${PORT}`);
});

async function serveStatic(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const contentType =
      contentTypes[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function getHistoryPayload(assetId, interval, forceRefresh) {
  const filePath = getAssetFilePath(assetId, `${interval}.json`);

  if (!forceRefresh) {
    const localPayload = await readLocalJson(filePath);
    if (localPayload) {
      return {
        ...localPayload,
        sourceMode: "local-cache",
      };
    }
  }

  try {
    const freshPayload = await fetchAssetHistory(__dirname, assetId, interval);
    await writeLocalJson(filePath, freshPayload);
    await maybeWriteDerivedSpotFile(assetId, interval, freshPayload);
    await writeSummaryFile(assetId);
    return {
      ...freshPayload,
      sourceMode: forceRefresh ? "alpha-vantage-refresh" : "alpha-vantage-seed",
    };
  } catch (error) {
    const localPayload = await readLocalJson(filePath);
    if (localPayload) {
      return {
        ...localPayload,
        sourceMode: "local-cache-fallback",
        warning:
          error instanceof Error
            ? error.message
            : `Alpha Vantage refresh failed; using cached local ${assetId} history.`,
      };
    }

    throw error;
  }
}

async function getSpotPayload(assetId, forceRefresh) {
  const filePath = getAssetFilePath(assetId, "spot.json");

  if (!forceRefresh) {
    const localPayload = await readLocalJson(filePath);
    if (localPayload) {
      return {
        ...localPayload,
        sourceMode: "local-cache",
      };
    }
  }

  try {
    const freshPayload = await fetchAssetSpot(__dirname, assetId);
    await writeLocalJson(filePath, freshPayload);
    await writeSummaryFile(assetId);
    return {
      ...freshPayload,
      sourceMode: forceRefresh ? "alpha-vantage-refresh" : "alpha-vantage-seed",
    };
  } catch (error) {
    const localPayload = await readLocalJson(filePath);
    if (localPayload) {
      return {
        ...localPayload,
        sourceMode: "local-cache-fallback",
        warning:
          error instanceof Error
            ? error.message
            : `Alpha Vantage refresh failed; using cached local ${assetId} spot.`,
      };
    }

    throw error;
  }
}

async function maybeWriteDerivedSpotFile(assetId, interval, historyPayload) {
  if (assetId !== "us10y" || interval !== "daily") return;

  const latest = historyPayload.series?.at(-1);
  if (!latest) return;

  await writeLocalJson(getAssetFilePath(assetId, "spot.json"), {
    source: "alpha-vantage-derived-spot",
    symbol: historyPayload.symbol,
    price: latest.close,
    timestamp: latest.date,
    warning: historyPayload.warning ?? null,
  });
}

function getAssetFilePath(assetId, filename) {
  const asset = getAssetConfig(assetId);
  return path.join(DATA_ROOT, asset.dataDirName, filename);
}

async function readLocalJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeLocalJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeSummaryFile(assetId) {
  const [daily, weekly, monthly, spot] = await Promise.all([
    readLocalJson(getAssetFilePath(assetId, "daily.json")),
    readLocalJson(getAssetFilePath(assetId, "weekly.json")),
    readLocalJson(getAssetFilePath(assetId, "monthly.json")),
    readLocalJson(getAssetFilePath(assetId, "spot.json")),
  ]);

  const summary = {
    updatedAt: new Date().toISOString(),
    source: "alpha-vantage",
    assetId,
    files: {
      daily: summarizeSeries(daily),
      weekly: summarizeSeries(weekly),
      monthly: summarizeSeries(monthly),
      spot: spot
        ? {
            timestamp: spot.timestamp ?? null,
            price: spot.price ?? null,
            source: spot.source ?? null,
          }
        : null,
    },
  };

  await writeLocalJson(getAssetFilePath(assetId, "summary.json"), summary);
}

function summarizeSeries(payload) {
  if (!payload?.series?.length) return null;

  return {
    points: payload.series.length,
    firstDate: payload.series[0]?.date ?? null,
    lastDate: payload.series.at(-1)?.date ?? null,
  };
}
