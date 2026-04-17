const state = {
  currentFile: null,
  status: null,
  pathDirtyFor: null,
  resultView: "markdown",
  currentMarkdownOutput: "",
  updatingPaddleOptions: false,
};

const elements = {
  modelSelect: document.getElementById("modelSelect"),
  downloadBtn: document.getElementById("downloadBtn"),
  loadBtn: document.getElementById("loadBtn"),
  fileInput: document.getElementById("fileInput"),
  feedback: document.getElementById("feedback"),
  previewArea: document.getElementById("previewArea"),
  previewMeta: document.getElementById("previewMeta"),
  resultText: document.getElementById("resultText"),
  resultPreview: document.getElementById("resultPreview"),
  resultMeta: document.getElementById("resultMeta"),
  outputFilenameInput: document.getElementById("outputFilenameInput"),
  saveOutputBtn: document.getElementById("saveOutputBtn"),
  paddleOptionsPanel: document.getElementById("paddleOptionsPanel"),
  paddleOptionsNote: document.getElementById("paddleOptionsNote"),
  paddleMarkdownPretty: document.getElementById("paddleMarkdownPretty"),
  paddleMarkdownRaw: document.getElementById("paddleMarkdownRaw"),
  paddlePdfMerged: document.getElementById("paddlePdfMerged"),
  paddlePdfPerPage: document.getElementById("paddlePdfPerPage"),
  modelName: document.getElementById("modelName"),
  downloadStatus: document.getElementById("downloadStatus"),
  loadStatus: document.getElementById("loadStatus"),
  backendStatus: document.getElementById("backendStatus"),
  downloadPathInput: document.getElementById("downloadPathInput"),
  sourceLink: document.getElementById("sourceLink"),
  progressHeadline: document.getElementById("progressHeadline"),
  progressPercent: document.getElementById("progressPercent"),
  downloadProgress: document.getElementById("downloadProgress"),
  progressDetail: document.getElementById("progressDetail"),
  targetPathDisplay: document.getElementById("targetPathDisplay"),
  downloadPanelTitle: document.getElementById("downloadPanelTitle"),
  downloadPanelDescription: document.getElementById("downloadPanelDescription"),
  downloadConfirmDialog: document.getElementById("downloadConfirmDialog"),
  confirmDialogTitle: document.getElementById("confirmDialogTitle"),
  confirmModel: document.getElementById("confirmModel"),
  confirmSource: document.getElementById("confirmSource"),
  confirmPath: document.getElementById("confirmPath"),
  confirmDownloadBtn: document.getElementById("confirmDownloadBtn"),
  cancelDownloadBtn: document.getElementById("cancelDownloadBtn"),
  showMarkdownBtn: document.getElementById("showMarkdownBtn"),
  showPreviewBtn: document.getElementById("showPreviewBtn"),
};

function setFeedback(message, tone = "neutral") {
  elements.feedback.textContent = message;
  elements.feedback.dataset.tone = tone;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return "unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function currentSelectedModel() {
  return state.status?.selected_model || null;
}

function currentPaddleOptions() {
  return state.status?.ocr_options?.paddle || null;
}

function currentDownloadPath() {
  return elements.downloadPathInput.value.trim();
}

function applyResultView() {
  const showingMarkdown = state.resultView === "markdown";
  elements.showMarkdownBtn.classList.toggle("active", showingMarkdown);
  elements.showPreviewBtn.classList.toggle("active", !showingMarkdown);
  elements.resultText.classList.toggle("hidden", !showingMarkdown);
  elements.resultPreview.classList.toggle("hidden", showingMarkdown);
}

function renderInlineMarkdown(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdown(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let paragraph = [];
  let listItems = [];
  let inCode = false;
  let codeLines = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (listItems.length === 0) {
      return;
    }
    html.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  }

  function flushCode() {
    if (!inCode) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    inCode = false;
    codeLines = [];
  }

  for (const line of lines) {
    if (line.startsWith("~~~")) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      html.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2));
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushCode();
  return html.join("");
}

function updateModelSelect(options, selectedId) {
  const currentValue = elements.modelSelect.value;
  elements.modelSelect.innerHTML = options
    .map((model) => `<option value="${model.id}">${model.name}</option>`)
    .join("");

  elements.modelSelect.value = options.some((model) => model.id === currentValue)
    ? currentValue
    : selectedId;
}

function updateStatusView(status) {
  state.status = status;
  const selected = status.selected_model;
  const isDownloadBusy = status.download.status === "running" || status.download.status === "queued";
  const isSelectedDownload = status.download.model_id === selected.id;
  const paddleSelected = selected.id === "paddleocr-vl-1.5";
  const paddleOptions = currentPaddleOptions();

  updateModelSelect(status.model_options, selected.id);
  elements.modelName.textContent = selected.name;
  elements.downloadStatus.textContent = isSelectedDownload ? status.download.status : "idle";
  elements.loadStatus.textContent = selected.loaded ? "Loaded" : "Not loaded";
  elements.backendStatus.textContent = selected.active_backend;
  elements.sourceLink.textContent = selected.source_url;
  elements.sourceLink.href = selected.source_url;
  elements.downloadPanelTitle.textContent = `${selected.name} Download`;
  elements.downloadPanelDescription.textContent = selected.description;

  elements.downloadBtn.textContent = `Download ${selected.name}`;
  elements.loadBtn.textContent = `Load ${selected.name}`;
  elements.downloadBtn.disabled = isDownloadBusy;
  elements.loadBtn.disabled = !selected.downloaded;
  elements.modelSelect.disabled = isDownloadBusy;
  elements.paddleOptionsPanel.classList.toggle("hidden", !paddleSelected);
  if (paddleOptions) {
    elements.paddleMarkdownPretty.checked = paddleOptions.markdown_style === "pretty";
    elements.paddleMarkdownRaw.checked = paddleOptions.markdown_style === "raw";
    elements.paddlePdfMerged.checked = paddleOptions.pdf_structure === "merged";
    elements.paddlePdfPerPage.checked = paddleOptions.pdf_structure === "per_page";
  }

  if (
    document.activeElement !== elements.downloadPathInput &&
    state.pathDirtyFor !== selected.id
  ) {
    elements.downloadPathInput.value = selected.download_path || "";
  }

  const progressPercent = isSelectedDownload ? status.download.percent || 0 : 0;
  elements.progressHeadline.textContent = isSelectedDownload
    ? status.download.message || "Waiting to start download."
    : "Download not started for the selected model";
  elements.progressPercent.textContent = `${Math.round(progressPercent)}%`;
  elements.downloadProgress.value = progressPercent;
  elements.progressDetail.textContent = isSelectedDownload
    ? `${formatBytes(status.download.bytes_downloaded)} of ${formatBytes(status.download.total_bytes)}`
    : "0 B of unknown total";
  elements.targetPathDisplay.textContent = isSelectedDownload
    ? status.download.target_path || selected.download_path || "No target selected yet"
    : selected.download_path || "No target selected yet";

  if (selected.last_download_error) {
    setFeedback(`Download error: ${selected.last_download_error}`, "error");
  }
}

async function fetchStatus() {
  const response = await fetch("/api/status");
  const payload = await response.json();
  updateStatusView(payload);
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

function showPreview(file, remoteUrl = null) {
  const objectUrl = remoteUrl || URL.createObjectURL(file);
  elements.previewMeta.textContent = `${file.name} • ${file.type || "unknown type"}`;
  elements.previewArea.classList.remove("empty");

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    elements.previewArea.innerHTML = `<iframe title="PDF preview" src="${objectUrl}"></iframe>`;
    return;
  }

  if (file.type.startsWith("image/")) {
    elements.previewArea.innerHTML = `<img alt="Uploaded preview" src="${objectUrl}">`;
    return;
  }

  elements.previewArea.innerHTML = `
    <div class="fallback-preview">
      <p>Preview not available for this file type.</p>
      <a href="${objectUrl}" target="_blank" rel="noreferrer">Open file</a>
    </div>
  `;
}

function suggestOutputFilename(filename) {
  const safe = filename.replace(/^.*[\\/]/, "");
  const stem = safe.includes(".") ? safe.slice(0, safe.lastIndexOf(".")) : safe;
  const cleaned = stem.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${cleaned || "ocr-output"}.md`;
}

async function runOcr(file) {
  const selected = currentSelectedModel();
  if (!selected?.loaded) {
    throw new Error("Load the selected model before uploading a file for OCR.");
  }

  const formData = new FormData();
  formData.append("file", file);

  setFeedback(`Running OCR with ${selected.name}...`, "working");
  elements.resultMeta.textContent = "OCR in progress";
  elements.resultText.textContent = "Processing...";
  elements.resultPreview.innerHTML = "<p>Processing...</p>";
  elements.resultText.classList.remove("empty");
  elements.resultPreview.classList.remove("empty");

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "OCR failed");
  }

  showPreview(file, payload.file_url);
  state.currentMarkdownOutput = payload.markdown_output || "";
  elements.resultText.textContent = state.currentMarkdownOutput || "(No markdown output)";
  elements.resultPreview.innerHTML = renderMarkdown(state.currentMarkdownOutput || "");
  const parts = [payload.model_name, payload.backend];
  if (payload.ocr_options_used) {
    parts.push(
      payload.ocr_options_used.markdown_style === "pretty" ? "Pretty Markdown" : "Raw Markdown",
      payload.ocr_options_used.pdf_structure === "merged" ? "Merged document" : "Per page",
    );
    if (payload.option_effective_mode === "ui_only") {
      parts.push("planned Paddle behavior");
    }
  }
  parts.push(`${payload.pages.length} page(s) processed`);
  elements.resultMeta.textContent = parts.join(" • ");
  elements.outputFilenameInput.value = payload.suggested_output_name || suggestOutputFilename(payload.filename || file.name);
  setFeedback("OCR complete. Switch between raw Markdown and preview on the right.", "success");
}

async function savePaddleOptions() {
  const selected = currentSelectedModel();
  if (!selected || selected.id !== "paddleocr-vl-1.5" || state.updatingPaddleOptions) {
    return;
  }

  const markdownStyle = elements.paddleMarkdownPretty.checked ? "pretty" : "raw";
  const pdfStructure = elements.paddlePdfMerged.checked ? "merged" : "per_page";

  try {
    state.updatingPaddleOptions = true;
    const payload = await postJson("/api/ocr/options", {
      model_id: "paddleocr-vl-1.5",
      markdown_style: markdownStyle,
      pdf_structure: pdfStructure,
    });
    updateStatusView(payload.status);
    setFeedback("Saved Paddle options for this demo.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
    if (state.status) {
      updateStatusView(state.status);
    }
  } finally {
    state.updatingPaddleOptions = false;
  }
}

elements.modelSelect.addEventListener("change", async (event) => {
  try {
    const payload = await postJson("/api/model/select", { model_id: event.target.value });
    state.pathDirtyFor = null;
    updateStatusView(payload.status);
    setFeedback(`Selected ${payload.status.selected_model.name} for OCR work.`, "success");
  } catch (error) {
    setFeedback(error.message, "error");
    if (state.status) {
      elements.modelSelect.value = state.status.selected_model.id;
    }
  }
});

elements.downloadBtn.addEventListener("click", () => {
  const selected = currentSelectedModel();
  const targetPath = currentDownloadPath() || selected?.download_path || "";

  if (!selected) {
    setFeedback("No model is selected.", "error");
    return;
  }

  if (!targetPath) {
    setFeedback("Enter a download location before starting the model download.", "error");
    return;
  }

  elements.confirmDialogTitle.textContent = `Confirm ${selected.name} Download`;
  elements.confirmModel.textContent = selected.name;
  elements.confirmSource.textContent = selected.source_url;
  elements.confirmPath.textContent = targetPath;
  elements.downloadConfirmDialog.showModal();
});

elements.loadBtn.addEventListener("click", async () => {
  try {
    const payload = await postJson("/api/model/load");
    updateStatusView(payload.status);
    setFeedback(payload.message, "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

elements.confirmDownloadBtn.addEventListener("click", async () => {
  try {
    const targetPath = currentDownloadPath() || currentSelectedModel()?.download_path || "";
    setFeedback("Starting model download...", "working");
    await postJson("/api/model/download", {
      confirmed: true,
      download_path: targetPath,
    });
    state.pathDirtyFor = null;
    elements.downloadConfirmDialog.close();
    await fetchStatus();
    setFeedback("Download started. Progress will update below.", "working");
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

elements.cancelDownloadBtn.addEventListener("click", () => {
  elements.downloadConfirmDialog.close();
});

elements.downloadPathInput.addEventListener("input", () => {
  const selected = currentSelectedModel();
  state.pathDirtyFor = selected?.id || null;
  elements.targetPathDisplay.textContent = currentDownloadPath() || "No target selected yet";
});

elements.showMarkdownBtn.addEventListener("click", () => {
  state.resultView = "markdown";
  applyResultView();
});

elements.showPreviewBtn.addEventListener("click", () => {
  state.resultView = "preview";
  applyResultView();
});

elements.paddleMarkdownPretty.addEventListener("change", savePaddleOptions);
elements.paddleMarkdownRaw.addEventListener("change", savePaddleOptions);
elements.paddlePdfMerged.addEventListener("change", savePaddleOptions);
elements.paddlePdfPerPage.addEventListener("change", savePaddleOptions);

elements.saveOutputBtn.addEventListener("click", async () => {
  if (!state.currentMarkdownOutput.trim()) {
    setFeedback("Run OCR first so there is Markdown output to save.", "error");
    return;
  }

  try {
    const filename = elements.outputFilenameInput.value.trim() || "ocr-output.md";
    const payload = await postJson("/api/output/save", {
      filename,
      markdown_output: state.currentMarkdownOutput,
    });
    setFeedback(payload.message, "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

elements.fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  state.currentFile = file;
  showPreview(file);

  try {
    await runOcr(file);
  } catch (error) {
    elements.resultMeta.textContent = "OCR failed";
    elements.resultText.textContent = error.message;
    elements.resultPreview.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    state.currentMarkdownOutput = "";
    setFeedback(error.message, "error");
  }
});

fetchStatus();
applyResultView();
setInterval(fetchStatus, 3000);
