import { readFile } from "fs/promises";
import path from "path";

const BASE_URL = "https://www.alphavantage.co/query";

export const assetCatalog = [
  {
    id: "gold",
    label: "Gold / USD",
    shortLabel: "Gold",
    tvSymbol: "OANDA:XAUUSD",
    digits: 2,
    valueUnit: "price",
    unitLabel: "USD",
    theme: "Precious metals benchmark",
    dataDirName: "alpha-vantage-gold",
    maxDailyWindowDays: 365,
  },
  {
    id: "btc",
    label: "BTC / USD",
    shortLabel: "Bitcoin",
    tvSymbol: "BINANCE:BTCUSDT",
    digits: 2,
    valueUnit: "price",
    unitLabel: "USD",
    theme: "Crypto benchmark",
    dataDirName: "alpha-vantage-btc",
    maxDailyWindowDays: 365,
  },
  {
    id: "sp500",
    label: "S&P 500 proxy / SPY",
    shortLabel: "S&P 500",
    tvSymbol: "AMEX:SPY",
    digits: 2,
    valueUnit: "price",
    unitLabel: "USD",
    theme: "US equity benchmark via SPY ETF proxy",
    dataDirName: "alpha-vantage-sp500",
    maxDailyWindowDays: 90,
  },
  {
    id: "us10y",
    label: "US 10Y Treasury Yield",
    shortLabel: "US 10Y",
    tvSymbol: "TVC:US10Y",
    digits: 2,
    valueUnit: "%",
    unitLabel: "percent",
    theme: "US rates benchmark",
    dataDirName: "alpha-vantage-us10y",
    maxDailyWindowDays: 365,
  },
];

const assetConfigById = new Map(
  assetCatalog.map((asset) => [asset.id, asset])
);

export async function loadAlphaVantageApiKey(rootDir) {
  const envKey = process.env.ALPHAVANTAGE_API_KEY?.trim();
  if (envKey) return envKey;

  const configPath = path.join(rootDir, "alpha-vantage.local.json");
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
      return parsed.apiKey.trim();
    }
  } catch {
    // Ignore missing local config.
  }

  throw new Error(
    "Missing Alpha Vantage API key. Set ALPHAVANTAGE_API_KEY or create alpha-vantage.local.json from alpha-vantage.local.example.json."
  );
}

export function getAssetConfig(assetId) {
  const config = assetConfigById.get(assetId);
  if (!config) {
    throw new Error(`Unsupported asset id: ${assetId}`);
  }

  return config;
}

export async function alphaVantageQuery(rootDir, params) {
  const apiKey = await loadAlphaVantageApiKey(rootDir);
  const search = new URLSearchParams({ ...params, apikey: apiKey });
  const response = await fetch(`${BASE_URL}?${search.toString()}`);

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();

  if (payload["Error Message"]) {
    throw new Error(payload["Error Message"]);
  }

  if (payload.Note) {
    throw new Error(payload.Note);
  }

  if (payload.Information && !payload.data) {
    throw new Error(payload.Information);
  }

  return payload;
}

export async function fetchAssetHistory(rootDir, assetId, interval) {
  const config = getAssetConfig(assetId);

  switch (assetId) {
    case "gold": {
      const payload = await alphaVantageQuery(rootDir, {
        function: "GOLD_SILVER_HISTORY",
        symbol: "GOLD",
        interval,
      });

      return normalizeDataArrayHistoryPayload(payload, {
        symbol: "GOLD",
        interval,
        unit: "USD",
      });
    }
    case "btc": {
      const payload = await alphaVantageQuery(rootDir, {
        function: `DIGITAL_CURRENCY_${interval.toUpperCase()}`,
        symbol: "BTC",
        market: "USD",
      });

      return normalizeTimeSeriesPayload(payload, {
        symbol: "BTC",
        interval,
        unit: "USD",
        preferredCloseKeys: [
          "4a. close (USD)",
          "4b. close (USD)",
          "4a. close (usd)",
          "4b. close (usd)",
          "4. close",
        ],
      });
    }
    case "sp500": {
      const functionName = resolveEquityFunctionName(interval);
      const payload = await alphaVantageQuery(rootDir, {
        function: functionName,
        symbol: "SPY",
      });

      return normalizeTimeSeriesPayload(payload, {
        symbol: "SPY",
        interval,
        unit: "USD",
        preferredCloseKeys: ["5. adjusted close", "4. close"],
      });
    }
    case "us10y": {
      const payload = await alphaVantageQuery(rootDir, {
        function: "TREASURY_YIELD",
        interval,
        maturity: "10year",
      });

      return normalizeDataArrayHistoryPayload(payload, {
        symbol: "US10Y",
        interval,
        unit: "percent",
      });
    }
    default:
      throw new Error(`Unsupported history asset: ${config.id}`);
  }
}

export async function fetchAssetSpot(rootDir, assetId) {
  switch (assetId) {
    case "gold": {
      const payload = await alphaVantageQuery(rootDir, {
        function: "GOLD_SILVER_SPOT",
        symbol: "GOLD",
      });

      return normalizeGoldSpotPayload(payload);
    }
    case "btc": {
      const payload = await alphaVantageQuery(rootDir, {
        function: "CURRENCY_EXCHANGE_RATE",
        from_currency: "BTC",
        to_currency: "USD",
      });

      return normalizeExchangeRatePayload(payload, {
        symbol: "BTC",
        source: "alpha-vantage-spot",
      });
    }
    case "sp500": {
      const payload = await alphaVantageQuery(rootDir, {
        function: "GLOBAL_QUOTE",
        symbol: "SPY",
      });

      return normalizeGlobalQuotePayload(payload, {
        symbol: "SPY",
        source: "alpha-vantage-spot",
      });
    }
    case "us10y": {
      const history = await fetchAssetHistory(rootDir, "us10y", "daily");
      const latest = history.series.at(-1);

      if (!latest) {
        throw new Error("Unable to derive the latest US 10Y yield value.");
      }

      return {
        source: "alpha-vantage-derived-spot",
        symbol: "US10Y",
        price: latest.close,
        timestamp: latest.date,
        warning: history.warning ?? null,
      };
    }
    default:
      throw new Error(`Unsupported spot asset: ${assetId}`);
  }
}

export function getHistoryIntervalForWindow(assetId, windowDays) {
  const config = getAssetConfig(assetId);
  if (windowDays <= config.maxDailyWindowDays) return "daily";
  if (windowDays <= 3650) return "weekly";
  return "monthly";
}

export function getPointLimit(windowDays, interval) {
  if (interval === "daily") return windowDays;
  if (interval === "weekly") return Math.max(24, Math.ceil(windowDays / 7));
  return Math.max(24, Math.ceil(windowDays / 30.4375));
}

function resolveEquityFunctionName(interval) {
  if (interval === "daily") return "TIME_SERIES_DAILY";
  if (interval === "weekly") return "TIME_SERIES_WEEKLY";
  return "TIME_SERIES_MONTHLY";
}

function normalizeDataArrayHistoryPayload(payload, { symbol, interval, unit }) {
  if (!Array.isArray(payload.data)) {
    throw new Error(`Unable to parse Alpha Vantage ${symbol} history payload.`);
  }

  return {
    source: "alpha-vantage",
    symbol,
    interval: payload.interval ?? interval,
    unit,
    series: payload.data
      .map((point) => ({
        date: point.date ?? point.timestamp ?? point.datetime,
        close: coerceNumber(point.value ?? point.close ?? point.price),
      }))
      .filter((point) => point.date && Number.isFinite(point.close))
      .sort((left, right) => left.date.localeCompare(right.date)),
    warning: typeof payload.Information === "string" ? payload.Information : null,
    rawMeta: {
      name: payload.name ?? null,
    },
  };
}

function normalizeTimeSeriesPayload(
  payload,
  { symbol, interval, unit, preferredCloseKeys = [] }
) {
  const timeSeriesEntry = Object.entries(payload).find(([key]) =>
    key.toLowerCase().includes("time series")
  );

  if (!timeSeriesEntry) {
    throw new Error(`Unable to parse Alpha Vantage ${symbol} history payload.`);
  }

  const [, series] = timeSeriesEntry;
  return {
    source: "alpha-vantage",
    symbol,
    interval,
    unit,
    series: Object.entries(series)
      .map(([date, point]) => ({
        date,
        close: pickCloseValue(point, preferredCloseKeys),
      }))
      .filter((point) => Number.isFinite(point.close))
      .sort((left, right) => left.date.localeCompare(right.date)),
    warning: typeof payload.Information === "string" ? payload.Information : null,
    rawMeta: payload["Meta Data"] ?? {},
  };
}

function normalizeGoldSpotPayload(payload) {
  const firstDataPoint = Array.isArray(payload.data) ? payload.data[0] : null;
  const price = coerceNumber(
    firstDataPoint?.price ??
      firstDataPoint?.value ??
      payload.price ??
      payload.value ??
      payload["Global Quote"]?.["05. price"]
  );
  const timestamp =
    firstDataPoint?.date ??
    firstDataPoint?.timestamp ??
    payload.timestamp ??
    new Date().toISOString();

  if (!Number.isFinite(price)) {
    throw new Error("Unable to parse Alpha Vantage gold spot payload.");
  }

  return {
    source: "alpha-vantage-spot",
    symbol: "GOLD",
    price,
    timestamp,
    warning: typeof payload.Information === "string" ? payload.Information : null,
  };
}

function normalizeExchangeRatePayload(payload, { symbol, source }) {
  const quote = payload["Realtime Currency Exchange Rate"] ?? {};
  const price = coerceNumber(
    quote["5. Exchange Rate"] ?? quote["8. Bid Price"] ?? quote["9. Ask Price"]
  );
  const timestamp =
    quote["6. Last Refreshed"] ??
    quote["7. Time Zone"] ??
    new Date().toISOString();

  if (!Number.isFinite(price)) {
    throw new Error(`Unable to parse Alpha Vantage ${symbol} spot payload.`);
  }

  return {
    source,
    symbol,
    price,
    timestamp,
    warning: typeof payload.Information === "string" ? payload.Information : null,
  };
}

function normalizeGlobalQuotePayload(payload, { symbol, source }) {
  const quote = payload["Global Quote"] ?? {};
  const price = coerceNumber(quote["05. price"]);
  const timestamp =
    quote["07. latest trading day"] ??
    quote["06. volume"] ??
    new Date().toISOString();

  if (!Number.isFinite(price)) {
    throw new Error(`Unable to parse Alpha Vantage ${symbol} spot payload.`);
  }

  return {
    source,
    symbol,
    price,
    timestamp,
    warning: typeof payload.Information === "string" ? payload.Information : null,
  };
}

function pickCloseValue(point, preferredCloseKeys) {
  for (const key of preferredCloseKeys) {
    const value = coerceNumber(point[key]);
    if (Number.isFinite(value)) return value;
  }

  for (const [key, rawValue] of Object.entries(point)) {
    const looksLikeClose = key.toLowerCase().includes("close");
    const looksUsdSpecific = key.toLowerCase().includes("usd");
    if (looksLikeClose && looksUsdSpecific) {
      const value = coerceNumber(rawValue);
      if (Number.isFinite(value)) return value;
    }
  }

  for (const [key, rawValue] of Object.entries(point)) {
    if (key.toLowerCase().includes("close")) {
      const value = coerceNumber(rawValue);
      if (Number.isFinite(value)) return value;
    }
  }

  return Number.NaN;
}

function coerceNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}
