(() => {
  const STORAGE_KEY = "indicator-research-poc";
  const CHECKLIST_KEY = `${STORAGE_KEY}:checklist`;
  const NOTES_KEY = `${STORAGE_KEY}:notes`;

  const tvDefaults = {
    symbol: "BINANCE:BTCUSDT",
    interval: "1D",
    style: "1",
    theme: "light",
    studyPreset: "none",
    allowSymbolChange: true,
  };

  const tvStudyPresets = {
    none: [],
    trend: [
      "Moving Average Exponential@tv-basicstudies",
      "Moving Average Exponential@tv-basicstudies",
    ],
    momentum: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
    volatility: ["Bollinger Bands@tv-basicstudies"],
  };

  const evaluationRows = [
    {
      option: "TradingView widget",
      speed: 5,
      extraction: 1,
      integration: 4,
      fit: 3,
      notes: "Fastest for visual PoC, but weak for dashboard-owned snapshots.",
    },
    {
      option: "Dashboard-native chart + data pipeline",
      speed: 3,
      extraction: 5,
      integration: 5,
      fit: 5,
      notes: "Best match for the existing macro-detail architecture and structured values.",
    },
    {
      option: "TradingView Charting Library",
      speed: 2,
      extraction: 3,
      integration: 3,
      fit: 3,
      notes: "Richer control, but heavier access, datafeed, and governance overhead.",
    },
  ];

  const checklistItems = [
    {
      id: "layout-fit",
      title: "Confirm chart layout fit in macro detail module",
      detail:
        "Judge whether the visual chart area remains readable inside an expanded dashboard card on desktop and mobile.",
    },
    {
      id: "value-extraction",
      title: "Confirm dashboard-owned metric extraction path",
      detail:
        "Decide whether latest price and indicator snapshots must be app-owned rather than widget-owned.",
    },
    {
      id: "persistence",
      title: "Decide persistence policy",
      detail:
        "Choose whether future live snapshots should be runtime-only or persisted into dashboard JSON as history.",
    },
    {
      id: "provider-check",
      title: "Validate future provider suitability",
      detail:
        "Check a future data source for OHLCV history, rate limits, and asset coverage before production integration.",
    },
    {
      id: "licensing",
      title: "Review licensing and attribution constraints",
      detail:
        "Keep widget convenience separate from legal and commercial fit for a long-term dashboard implementation.",
    },
  ];

  const instrumentCatalog = [
    {
      id: "gold",
      label: "Gold",
      shortLabel: "Gold",
      tvSymbol: "OANDA:XAUUSD",
      digits: 2,
      valueUnit: "price",
      theme: "Precious metals benchmark",
      maxDailyWindowDays: 365,
    },
    {
      id: "btc",
      label: "BTC / USD",
      shortLabel: "Bitcoin",
      tvSymbol: "BINANCE:BTCUSDT",
      digits: 2,
      valueUnit: "price",
      theme: "Crypto benchmark",
      maxDailyWindowDays: 365,
    },
    {
      id: "sp500",
      label: "S&P 500 proxy / SPY",
      shortLabel: "S&P 500",
      tvSymbol: "AMEX:SPY",
      digits: 2,
      valueUnit: "price",
      theme: "US equity benchmark via SPY ETF proxy",
      maxDailyWindowDays: 90,
    },
    {
      id: "us10y",
      label: "US 10Y Treasury Yield",
      shortLabel: "US 10Y",
      tvSymbol: "TVC:US10Y",
      digits: 2,
      valueUnit: "%",
      theme: "US rates benchmark",
      maxDailyWindowDays: 365,
    },
  ];

  const indicatorDefinitions = [
    { id: "sma20", label: "SMA 20", color: "#d07c3f", overlay: true },
    { id: "ema20", label: "EMA 20", color: "#1d6b63", overlay: true },
    { id: "rsi14", label: "RSI 14", color: "#28548b", overlay: false },
  ];

  const historyCache = new Map();

  const state = {
    nativeSymbol: "gold",
    compareSymbol: "none",
    window: 90,
    nativeStyle: "line",
    selectedIndicators: new Set(["sma20", "ema20", "rsi14"]),
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindTabs();
    bindWidgetControls();
    bindNativeControls();
    renderEvaluation();
    loadSavedNotes();
    renderTradingViewWidget();
    initializeNativeSelectors();
    initializeIndicatorToggles();
    void renderNativeExperiment();
  }

  function bindTabs() {
    const tabButtons = document.querySelectorAll(".tab");
    const panels = document.querySelectorAll(".panel");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tab;
        tabButtons.forEach((candidate) => {
          candidate.classList.toggle("active", candidate === button);
        });
        panels.forEach((panel) => {
          panel.classList.toggle("active", panel.id === `tab-${target}`);
        });
      });
    });
  }

  function bindWidgetControls() {
    document
      .getElementById("tv-render")
      .addEventListener("click", renderTradingViewWidget);

    document.getElementById("tv-reset").addEventListener("click", () => {
      document.getElementById("tv-symbol").value = tvDefaults.symbol;
      document.getElementById("tv-interval").value = tvDefaults.interval;
      document.getElementById("tv-style").value = tvDefaults.style;
      document.getElementById("tv-theme").value = tvDefaults.theme;
      document.getElementById("tv-study-preset").value = tvDefaults.studyPreset;
      document.getElementById("tv-allow-symbol-change").checked =
        tvDefaults.allowSymbolChange;
      renderTradingViewWidget();
    });
  }

  function renderTradingViewWidget() {
    const root = document.getElementById("tv-widget-root");
    const symbol = document.getElementById("tv-symbol").value.trim() || tvDefaults.symbol;
    const interval = document.getElementById("tv-interval").value;
    const style = document.getElementById("tv-style").value;
    const theme = document.getElementById("tv-theme").value;
    const studyPreset = document.getElementById("tv-study-preset").value;
    const allowSymbolChange = document.getElementById(
      "tv-allow-symbol-change"
    ).checked;

    const config = {
      autosize: true,
      symbol,
      interval,
      favorites: {
        intervals: ["1D", "1W", "1M"],
      },
      timezone: "Etc/UTC",
      theme,
      style,
      locale: "en",
      allow_symbol_change: allowSymbolChange,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: tvStudyPresets[studyPreset] ?? [],
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      hotlist: false,
      watchlist: false,
    };

    document.getElementById("tv-config-preview").textContent = JSON.stringify(
      config,
      null,
      2
    );

    root.innerHTML = "";

    const widgetHeight = Math.max(720, Math.round(window.innerHeight * 0.72));

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = `${widgetHeight}px`;
    wrapper.style.width = "100%";

    const widgetTarget = document.createElement("div");
    widgetTarget.className = "tradingview-widget-container__widget";
    widgetTarget.style.height = "calc(100% - 1px)";
    widgetTarget.style.width = "100%";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.text = JSON.stringify(config);

    wrapper.appendChild(widgetTarget);
    wrapper.appendChild(script);
    root.appendChild(wrapper);
  }

  function bindNativeControls() {
    document
      .getElementById("native-window")
      .addEventListener("change", (event) => {
        state.window = Number(event.target.value);
        void renderNativeExperiment();
      });

    document
      .getElementById("native-style")
      .addEventListener("change", (event) => {
        state.nativeStyle = event.target.value;
        void renderNativeExperiment();
      });

    document
      .getElementById("native-refresh")
      .addEventListener("click", () => void renderNativeExperiment(true));
  }

  function initializeNativeSelectors() {
    const symbolSelect = document.getElementById("native-symbol");
    const compareSelect = document.getElementById("native-compare");

    instrumentCatalog.forEach((instrument) => {
      symbolSelect.appendChild(
        new Option(`${instrument.label} (${instrument.theme})`, instrument.id)
      );
    });

    compareSelect.appendChild(new Option("None", "none"));
    symbolSelect.value = state.nativeSymbol;
    compareSelect.value = state.compareSymbol;

    symbolSelect.addEventListener("change", (event) => {
      state.nativeSymbol = event.target.value;
      compareSelect.value = "none";
      state.compareSymbol = "none";
      void renderNativeExperiment();
    });
  }

  function initializeIndicatorToggles() {
    const toggles = document.getElementById("indicator-toggles");

    indicatorDefinitions.forEach((indicator) => {
      const label = document.createElement("label");
      label.className = "toggle-pill";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selectedIndicators.has(indicator.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.selectedIndicators.add(indicator.id);
        } else {
          state.selectedIndicators.delete(indicator.id);
        }
        renderNativeExperiment();
      });

      const text = document.createElement("span");
      text.textContent = `${indicator.label}${indicator.overlay ? " overlay" : " metric"}`;

      label.appendChild(checkbox);
      label.appendChild(text);
      toggles.appendChild(label);
    });
  }

  async function renderNativeExperiment(forceRefresh = false) {
    const instrument = lookupInstrument(state.nativeSymbol);
    const chartRoot = document.getElementById("native-chart-root");
    const snapshotRoot = document.getElementById("snapshot-metrics");

    chartRoot.innerHTML = `<div class="empty-state">Loading Alpha Vantage ${escapeHtml(
      instrument.shortLabel
    )} data...</div>`;
    snapshotRoot.innerHTML = "";

    try {
      const dataset = await getAssetDataset(instrument.id, state.window, forceRefresh);
      const series = dataset.series;
      const latest = series[series.length - 1];
      const previous = series[series.length - 2] ?? latest;
      const change = latest.close - previous.close;
      const changePct = previous.close === 0 ? 0 : (change / previous.close) * 100;

      const snapshots = [
        {
          metricId: `${instrument.id}:spot`,
          label: `${instrument.shortLabel} latest spot`,
          value: dataset.latestSpot.price,
          unit: instrument.valueUnit,
          timestamp: dataset.latestSpot.timestamp,
          source: `${dataset.latestSpot.source} · ${
            dataset.latestSpot.sourceMode ?? dataset.sourceMode
          }`,
          status: "ready",
        },
        {
          metricId: `${instrument.id}:history_latest`,
          label: `${instrument.shortLabel} latest historical close`,
          value: latest.close,
          unit: instrument.valueUnit,
          timestamp: latest.date,
          source: `${dataset.sourceMode} · ${dataset.interval}`,
          status: "ready",
        },
        {
          metricId: `${instrument.id}:change_pct`,
          label: "Change vs previous point",
          value: changePct,
          unit: "%",
          timestamp: latest.date,
          source: `${dataset.sourceMode} · ${dataset.interval}`,
          status: "ready",
        },
      ];

      const overlays = [];

      if (state.selectedIndicators.has("sma20")) {
        overlays.push({
          id: "sma20",
          label: "SMA 20",
          color: lookupIndicatorColor("sma20"),
          values: computeSmaSeries(series, 20),
        });
      snapshots.push({
        metricId: `${instrument.id}:sma20`,
        label: "SMA 20",
        value: computeLatestSma(series, 20),
        unit: instrument.valueUnit,
        timestamp: latest.date,
        source: `derived-${dataset.sourceMode}-${dataset.interval}`,
        status: "ready",
      });
      }

      if (state.selectedIndicators.has("ema20")) {
        overlays.push({
          id: "ema20",
          label: "EMA 20",
          color: lookupIndicatorColor("ema20"),
          values: computeEmaSeries(series, 20),
        });
      snapshots.push({
        metricId: `${instrument.id}:ema20`,
        label: "EMA 20",
        value: computeLatestEma(series, 20),
        unit: instrument.valueUnit,
        timestamp: latest.date,
        source: `derived-${dataset.sourceMode}-${dataset.interval}`,
        status: "ready",
      });
      }

      if (state.selectedIndicators.has("rsi14")) {
      snapshots.push({
        metricId: `${instrument.id}:rsi14`,
        label: "RSI 14",
        value: computeLatestRsi(series, 14),
        unit: "score",
        timestamp: latest.date,
        source: `derived-${dataset.sourceMode}-${dataset.interval}`,
        status: "ready",
      });
      }

      renderSnapshotMetrics(instrument, snapshots, changePct, dataset.warning);
      renderNativeChart(instrument, series, overlays, null);

      document.getElementById("snapshot-json").textContent = JSON.stringify(
        {
          chartConfig: {
            provider: "alpha-vantage",
            primarySymbol: instrument.tvSymbol,
            compareSymbol: null,
            sourceMode: dataset.sourceMode,
            interval: dataset.interval,
            window: state.window,
            style: state.nativeStyle,
            studies: Array.from(state.selectedIndicators),
          },
          latestSpot: dataset.latestSpot,
          warning: dataset.warning ?? null,
          snapshots,
        },
        null,
        2
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      chartRoot.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      renderSnapshotError(message);
      document.getElementById("snapshot-json").textContent = JSON.stringify(
        { error: message },
        null,
        2
      );
    }
  }

  function renderSnapshotMetrics(instrument, snapshots, changePct, warning) {
    const root = document.getElementById("snapshot-metrics");
    root.innerHTML = "";

    if (warning) {
      const warningCard = document.createElement("article");
      warningCard.className = "metric-card";

      const warningLabel = document.createElement("p");
      warningLabel.className = "metric-label";
      warningLabel.textContent = "Alpha Vantage note";

      const warningValue = document.createElement("p");
      warningValue.className = "metric-value";
      warningValue.textContent = "Limited response";
      warningValue.style.fontSize = "1.05rem";

      const warningMeta = document.createElement("p");
      warningMeta.className = "metric-meta error";
      warningMeta.textContent = warning;

      warningCard.append(warningLabel, warningValue, warningMeta);
      root.appendChild(warningCard);
    }

    snapshots.forEach((snapshot) => {
      const card = document.createElement("article");
      card.className = "metric-card";

      const label = document.createElement("p");
      label.className = "metric-label";
      label.textContent = snapshot.label;

      const value = document.createElement("p");
      value.className = "metric-value";
      value.textContent = formatMetricValue(snapshot.value, snapshot.unit, instrument.digits);

      const meta = document.createElement("p");
      meta.className = "metric-meta";
      meta.textContent = `${snapshot.source} · ${snapshot.timestamp}`;

      if (snapshot.metricId.endsWith("change_pct")) {
        value.style.color = changePct >= 0 ? "#2d6c3f" : "#9a3d30";
      }

      card.append(label, value, meta);
      root.appendChild(card);
    });
  }

  function renderSnapshotError(message) {
    const root = document.getElementById("snapshot-metrics");
    root.innerHTML = "";

    const card = document.createElement("article");
    card.className = "metric-card";

    const label = document.createElement("p");
    label.className = "metric-label";
    label.textContent = "Data fetch error";

    const value = document.createElement("p");
    value.className = "metric-value";
    value.textContent = "Unable to load";
    value.style.fontSize = "1.05rem";

    const meta = document.createElement("p");
    meta.className = "metric-meta error";
    meta.textContent = message;

    card.append(label, value, meta);
    root.appendChild(card);
  }

  function renderNativeChart(instrument, series, overlays, compareSeries) {
    const root = document.getElementById("native-chart-root");

    if (!series.length) {
      root.innerHTML = '<div class="empty-state">No series data available.</div>';
      return;
    }

    const primaryRaw = series.map((point) => point.close);
    const useNormalisedMode = Boolean(compareSeries);
    const primaryValues = useNormalisedMode
      ? normaliseAgainstBase(primaryRaw, primaryRaw[0])
      : primaryRaw;
    const compareValues = compareSeries
      ? normaliseAgainstBase(
          compareSeries.map((point) => point.close),
          compareSeries[0].close
        )
      : [];

    const overlaySeries = overlays.map((overlay) => ({
      ...overlay,
      values: useNormalisedMode
        ? normaliseAgainstBase(overlay.values, primaryRaw[0])
        : overlay.values,
    }));

    const overlayValues = overlaySeries.flatMap((overlay) =>
      overlay.values.filter((value) => Number.isFinite(value))
    );
    const chartValues = [...primaryValues, ...compareValues, ...overlayValues].filter(
      (value) => Number.isFinite(value)
    );

    const min = Math.min(...chartValues);
    const max = Math.max(...chartValues);
    const range = max - min || 1;
    const width = 960;
    const height = 340;
    const padX = 68;
    const padY = 24;
    const yAxisTicks = [max, min + range / 2, min].map((value) =>
      formatAxisValue(value, instrument.digits, useNormalisedMode)
    );

    const primaryPath = buildPath(primaryValues, width, height, min, range, padX, padY);
    const areaPath = buildAreaPath(primaryValues, width, height, min, range, padX, padY);
    const comparePath = compareValues.length
      ? buildPath(compareValues, width, height, min, range, padX, padY)
      : "";

    const overlayPaths = overlaySeries
      .map((overlay) => ({
        ...overlay,
        path: buildPath(overlay.values, width, height, min, range, padX, padY),
      }))
      .filter((overlay) => overlay.path);

    const legendItems = [
      {
        label: `${instrument.label}${useNormalisedMode ? " (normalised)" : ""}`,
        color: "#5b3420",
      },
      ...overlayPaths.map((overlay) => ({
        label: `${overlay.label}${useNormalisedMode ? " (normalised)" : ""}`,
        color: overlay.color,
      })),
    ];

    if (compareSeries) {
      legendItems.push({
        label: `${lookupInstrument(state.compareSymbol).label} (normalised)`,
        color: "#28548b",
      });
    }

    root.innerHTML = `
      <div class="chart-meta">
        <div>
          <strong>${escapeHtml(instrument.label)}</strong>
          <div class="muted">
            ${escapeHtml(instrument.theme)} · ${series[0].date} to ${series[series.length - 1].date}
          </div>
        </div>
        <div class="legend">
          ${legendItems
            .map(
              (item) => `
                <span class="legend-item">
                  <span class="legend-swatch" style="background:${item.color}"></span>
                  ${escapeHtml(item.label)}
                </span>`
            )
            .join("")}
        </div>
      </div>
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(instrument.label)} chart">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(91,52,32,0.32)" />
            <stop offset="100%" stop-color="rgba(91,52,32,0.02)" />
          </linearGradient>
        </defs>
        <text class="y-axis-label" x="8" y="24">${escapeHtml(yAxisTicks[0])}</text>
        <text class="y-axis-label" x="8" y="${height / 2}">${escapeHtml(yAxisTicks[1])}</text>
        <text class="y-axis-label" x="8" y="${height - 24}">${escapeHtml(yAxisTicks[2])}</text>
        <line x1="0" y1="${height - 24}" x2="${width}" y2="${height - 24}" stroke="rgba(50, 31, 13, 0.12)" />
        <line x1="0" y1="24" x2="${width}" y2="24" stroke="rgba(50, 31, 13, 0.08)" />
        <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="rgba(50, 31, 13, 0.08)" stroke-dasharray="5 6" />
        ${state.nativeStyle === "area" ? `<path d="${areaPath}" fill="url(#areaFill)" />` : ""}
        <path d="${primaryPath}" fill="none" stroke="#5b3420" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${overlayPaths
          .map(
            (overlay) => `<path d="${overlay.path}" fill="none" stroke="${overlay.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />`
          )
          .join("")}
        ${comparePath ? `<path d="${comparePath}" fill="none" stroke="#28548b" stroke-width="2.2" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round" />` : ""}
      </svg>
      <div class="axis-labels">
        <span>${series[0].date}</span>
        <span>${series[Math.floor(series.length / 2)].date}</span>
        <span>${series[series.length - 1].date}</span>
      </div>
    `;
  }

  function renderEvaluation() {
    const matrixRoot = document.getElementById("evaluation-matrix");
    matrixRoot.innerHTML = `
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Option</th>
            <th>PoC speed</th>
            <th>Value extraction</th>
            <th>Dashboard fit</th>
            <th>Long-term fit</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${evaluationRows
            .map(
              (row) => `
                <tr>
                  <td><strong>${escapeHtml(row.option)}</strong></td>
                  <td><span class="score-pill">${row.speed}</span></td>
                  <td><span class="score-pill">${row.extraction}</span></td>
                  <td><span class="score-pill">${row.integration}</span></td>
                  <td><span class="score-pill">${row.fit}</span></td>
                  <td>${escapeHtml(row.notes)}</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    const checklistState = loadJson(CHECKLIST_KEY, {});
    const checklistRoot = document.getElementById("evaluation-checklist");
    checklistRoot.innerHTML = "";

    checklistItems.forEach((item) => {
      const row = document.createElement("label");
      row.className = "check-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(checklistState[item.id]);
      checkbox.addEventListener("change", () => {
        const nextState = loadJson(CHECKLIST_KEY, {});
        nextState[item.id] = checkbox.checked;
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(nextState));
      });

      const textWrap = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title;
      const detail = document.createElement("span");
      detail.textContent = item.detail;

      textWrap.append(title, detail);
      row.append(checkbox, textWrap);
      checklistRoot.appendChild(row);
    });

    document.getElementById("save-notes").addEventListener("click", () => {
      localStorage.setItem(
        NOTES_KEY,
        document.getElementById("evaluation-notes").value
      );
    });

    document.getElementById("clear-notes").addEventListener("click", () => {
      document.getElementById("evaluation-notes").value = "";
      localStorage.removeItem(NOTES_KEY);
    });
  }

  function loadSavedNotes() {
    document.getElementById("evaluation-notes").value =
      localStorage.getItem(NOTES_KEY) ?? "";
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function lookupInstrument(id) {
    return (
      instrumentCatalog.find((instrument) => instrument.id === id) ??
      instrumentCatalog[0]
    );
  }

  function lookupIndicatorColor(id) {
    return indicatorDefinitions.find((indicator) => indicator.id === id)?.color ?? "#5b3420";
  }

  async function getAssetDataset(assetId, windowDays, forceRefresh) {
    const interval = getHistoryInterval(assetId, windowDays);
    const history = await getAssetHistory(assetId, interval, forceRefresh);
    const latestSpot = await getAssetSpot(assetId, forceRefresh);
    const pointLimit = getPointLimit(windowDays, interval);
    const series = history.series.slice(-pointLimit);

    if (!series.length) {
      throw new Error("Alpha Vantage returned no history points for the selected asset.");
    }

    return {
      interval,
      series,
      latestSpot,
      sourceMode: history.sourceMode ?? latestSpot.sourceMode ?? "unknown",
      warning: history.warning ?? latestSpot.warning ?? null,
    };
  }

  function getHistoryInterval(assetId, windowDays) {
    const instrument = lookupInstrument(assetId);
    if (windowDays <= instrument.maxDailyWindowDays) return "daily";
    if (windowDays <= 3650) return "weekly";
    return "monthly";
  }

  function getPointLimit(windowDays, interval) {
    if (interval === "daily") return windowDays;
    if (interval === "weekly") return Math.max(24, Math.ceil(windowDays / 7));
    return Math.max(24, Math.ceil(windowDays / 30.4375));
  }

  async function getAssetHistory(assetId, interval, forceRefresh) {
    const cacheKey = `history:${assetId}:${interval}`;
    if (!forceRefresh && historyCache.has(cacheKey)) {
      return historyCache.get(cacheKey);
    }

    const payload = await fetchJsonOrHelpfulError(
      `/api/alpha-vantage/${encodeURIComponent(assetId)}/history?interval=${encodeURIComponent(interval)}&refresh=${
        forceRefresh ? "1" : "0"
      }`,
      { cache: "no-store" }
    );

    historyCache.set(cacheKey, payload);
    return payload;
  }

  async function getAssetSpot(assetId, forceRefresh) {
    const cacheKey = `spot:${assetId}`;
    if (!forceRefresh && historyCache.has(cacheKey)) {
      return historyCache.get(cacheKey);
    }

    const payload = await fetchJsonOrHelpfulError(
      `/api/alpha-vantage/${encodeURIComponent(assetId)}/spot?refresh=${
        forceRefresh ? "1" : "0"
      }`,
      {
        cache: "no-store",
      }
    );

    historyCache.set(cacheKey, payload);
    return payload;
  }

  async function fetchJsonOrHelpfulError(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error(
          "The app is receiving HTML instead of JSON. Start this research app with `npm start` in the indicator_research_202503 folder so the local Alpha Vantage proxy routes are available."
        );
      }

      throw new Error("Received a non-JSON response from the local Alpha Vantage proxy.");
    }

    if (!response.ok) {
      throw new Error(payload.error ?? "Alpha Vantage proxy request failed.");
    }

    return payload;
  }

  function computeSmaSeries(series, period) {
    const result = [];

    for (let index = 0; index < series.length; index += 1) {
      if (index + 1 < period) {
        result.push(Number.NaN);
        continue;
      }

      const slice = series.slice(index + 1 - period, index + 1);
      const mean = slice.reduce((sum, point) => sum + point.close, 0) / period;
      result.push(mean);
    }

    return result;
  }

  function computeLatestSma(series, period) {
    return computeSmaSeries(series, period).at(-1);
  }

  function computeEmaSeries(series, period) {
    if (!series.length) return [];

    const multiplier = 2 / (period + 1);
    const result = [series[0].close];

    for (let index = 1; index < series.length; index += 1) {
      const nextValue =
        series[index].close * multiplier + result[index - 1] * (1 - multiplier);
      result.push(nextValue);
    }

    return result;
  }

  function computeLatestEma(series, period) {
    return computeEmaSeries(series, period).at(-1);
  }

  function computeLatestRsi(series, period) {
    if (series.length <= period) return Number.NaN;

    let gains = 0;
    let losses = 0;

    for (let index = 1; index <= period; index += 1) {
      const delta = series[index].close - series[index - 1].close;
      if (delta >= 0) gains += delta;
      else losses += Math.abs(delta);
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let index = period + 1; index < series.length; index += 1) {
      const delta = series[index].close - series[index - 1].close;
      const gain = delta > 0 ? delta : 0;
      const loss = delta < 0 ? Math.abs(delta) : 0;

      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }

    if (averageLoss === 0) return 100;
    const rs = averageGain / averageLoss;
    return 100 - 100 / (1 + rs);
  }

  function normaliseAgainstBase(values, base) {
    return values.map((value) =>
      Number.isFinite(value) ? (value / base) * 100 : Number.NaN
    );
  }

  function buildPath(values, width, height, min, range, padX, padY) {
    const usableWidth = width - padX * 2;
    const usableHeight = height - padY * 2;

    return values
      .map((value, index) => {
        if (!Number.isFinite(value)) return null;
        const x = padX + (index / Math.max(values.length - 1, 1)) * usableWidth;
        const y = height - padY - ((value - min) / range) * usableHeight;
        const command =
          index === 0 || !Number.isFinite(values[index - 1]) ? "M" : "L";
        return `${command}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  function buildAreaPath(values, width, height, min, range, padX, padY) {
    const linePath = buildPath(values, width, height, min, range, padX, padY);
    if (!linePath) return "";

    const usableWidth = width - padX * 2;
    const lastX = padX + usableWidth;
    const baseline = height - padY;
    return `${linePath} L ${lastX.toFixed(2)} ${baseline.toFixed(2)} L ${padX.toFixed(2)} ${baseline.toFixed(2)} Z`;
  }

  function formatMetricValue(value, unit, digits) {
    if (!Number.isFinite(value)) return "n/a";
    if (unit === "%") return `${value.toFixed(2)}%`;
    if (unit === "score") return value.toFixed(2);

    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0,
    }).format(value);
  }

  function formatAxisValue(value, digits, useNormalisedMode) {
    if (!Number.isFinite(value)) return "n/a";
    if (useNormalisedMode) return `${value.toFixed(1)}`;
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0,
    }).format(value);
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function mulberry32(seed) {
    let t = seed;

    return function random() {
      t += 0x6d2b79f5;
      let next = Math.imul(t ^ (t >>> 15), 1 | t);
      next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }
})();
