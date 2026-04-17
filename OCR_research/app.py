#!/usr/bin/env python3
import cgi
import json
import mimetypes
import shutil
import subprocess
import threading
import time
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
UPLOADS_DIR = ROOT / "uploads"
OUTPUTS_DIR = ROOT / "outputs"
MODELS_DIR = ROOT / "models"
SCRIPTS_DIR = ROOT / "scripts"
STATE_PATH = ROOT / "app_state.json"
LOCAL_PYTHON = ROOT / ".venv" / "bin" / "python"

HOST = "127.0.0.1"
PORT = 8010

OCR_SCRIPT = SCRIPTS_DIR / "macos_vision_ocr.swift"
PADDLE_OCR_SCRIPT = SCRIPTS_DIR / "run_paddleocr_vl.py"
HF_SNAPSHOT_SCRIPT = SCRIPTS_DIR / "download_hf_snapshot.py"

MODEL_CATALOG = {
    "paddleocr-vl-1.5": {
        "id": "paddleocr-vl-1.5",
        "name": "PaddleOCR-VL-1.5",
        "description": "Document parsing model from PaddlePaddle, optimized for OCR and document understanding.",
        "download_kind": "repository",
        "source_url": "https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5",
        "download_url": "https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5",
        "default_download_path": str(MODELS_DIR / "PaddleOCR-VL-1.5"),
        "active_backend": "paddleocr-vl-local",
    },
    "qwen-3.5-4b": {
        "id": "qwen-3.5-4b",
        "name": "Qwen 3.5 4B",
        "description": "Compact multimodal model wired into the original demo flow.",
        "download_kind": "file",
        "source_url": (
            "https://huggingface.co/bartowski/Qwen_Qwen3.5-4B-GGUF/resolve/main/"
            "Qwen_Qwen3.5-4B-Q4_K_M.gguf"
        ),
        "download_url": (
            "https://huggingface.co/bartowski/Qwen_Qwen3.5-4B-GGUF/resolve/main/"
            "Qwen_Qwen3.5-4B-Q4_K_M.gguf"
        ),
        "default_download_path": str(MODELS_DIR / "Qwen_Qwen3.5-4B-Q4_K_M.gguf"),
        "active_backend": "macos-vision-dev",
    },
}

DEFAULT_MODEL_ID = "paddleocr-vl-1.5"
LOCK = threading.Lock()


def deep_copy(data):
    return json.loads(json.dumps(data))


def default_model_state(model_id: str) -> dict:
    catalog = MODEL_CATALOG[model_id]
    default_path = catalog["default_download_path"]
    return {
        "id": model_id,
        "name": catalog["name"],
        "description": catalog["description"],
        "download_kind": catalog["download_kind"],
        "source_url": catalog["source_url"],
        "download_url": catalog["download_url"],
        "download_path": default_path,
        "download_directory": str(normalize_download_path(default_path).parent),
        "downloaded": False,
        "loaded": False,
        "active_backend": catalog["active_backend"],
        "last_download_error": None,
        "last_load_error": None,
        "download_started_at": None,
        "download_finished_at": None,
    }


def build_default_state() -> dict:
    selected = DEFAULT_MODEL_ID
    selected_model = default_model_state(selected)
    return {
        "selected_model_id": selected,
        "ocr_options": {
            "paddle": {
                "markdown_style": "pretty",
                "pdf_structure": "merged",
            }
        },
        "models": {model_id: default_model_state(model_id) for model_id in MODEL_CATALOG},
        "download": {
            "status": "idle",
            "pid": None,
            "model_id": selected,
            "bytes_downloaded": 0,
            "total_bytes": None,
            "percent": 0,
            "target_path": selected_model["download_path"],
            "source_url": selected_model["source_url"],
            "message": "Waiting to start download.",
        },
        "last_ocr": None,
    }

def ensure_dirs() -> None:
    for directory in (STATIC_DIR, UPLOADS_DIR, OUTPUTS_DIR, MODELS_DIR, SCRIPTS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def normalize_download_path(raw_path: str | None) -> Path:
    candidate = (raw_path or "").strip()
    expanded = Path(candidate).expanduser()
    if not expanded.is_absolute():
        expanded = (ROOT / expanded).resolve()
    return expanded


def model_path_from_state(model_state: dict) -> Path:
    return normalize_download_path(model_state.get("download_path"))


DEFAULT_STATE = build_default_state()


def model_downloaded(model_state: dict) -> bool:
    path = model_path_from_state(model_state)
    if model_state.get("id") == "paddleocr-vl-1.5":
        required_files = (
            "config.json",
            "configuration_paddleocr_vl.py",
            "model.safetensors",
            "modeling_paddleocr_vl.py",
            "processor_config.json",
            "tokenizer.json",
        )
        return path.exists() and path.is_dir() and all((path / filename).exists() for filename in required_files)
    if model_state.get("download_kind") == "repository":
        return path.exists() and path.is_dir() and any(path.iterdir())
    return path.exists() and path.is_file()


def refresh_state(state: dict) -> None:
    if state.get("selected_model_id") not in MODEL_CATALOG:
        state["selected_model_id"] = DEFAULT_MODEL_ID

    models = state.setdefault("models", {})
    for model_id in MODEL_CATALOG:
        model_state = models.setdefault(model_id, default_model_state(model_id))
        catalog = MODEL_CATALOG[model_id]
        model_state["id"] = model_id
        model_state["name"] = catalog["name"]
        model_state["description"] = catalog["description"]
        model_state["download_kind"] = catalog["download_kind"]
        model_state["source_url"] = catalog["source_url"]
        model_state["download_url"] = catalog["download_url"]
        model_state["active_backend"] = catalog["active_backend"]

        path = model_path_from_state(model_state)
        model_state["download_path"] = str(path)
        model_state["download_directory"] = str(path.parent)
        model_state["downloaded"] = model_downloaded(model_state)

    selected_model = models[state["selected_model_id"]]
    ocr_options = state.setdefault("ocr_options", {})
    paddle_options = ocr_options.setdefault("paddle", {})
    if paddle_options.get("markdown_style") not in {"pretty", "raw"}:
        paddle_options["markdown_style"] = "pretty"
    if paddle_options.get("pdf_structure") not in {"merged", "per_page"}:
        paddle_options["pdf_structure"] = "merged"

    download = state.setdefault("download", {})
    download.setdefault("status", "idle")
    download.setdefault("pid", None)
    download.setdefault("model_id", state["selected_model_id"])
    download.setdefault("bytes_downloaded", 0)
    download.setdefault("total_bytes", None)
    download.setdefault("percent", 0)
    download.setdefault("target_path", selected_model["download_path"])
    download.setdefault("source_url", selected_model["source_url"])
    download.setdefault("message", "Waiting to start download.")

    should_reset_download = (
        download.get("status") in {"idle", "completed", "failed"}
        and (
            download.get("model_id") != state["selected_model_id"]
            or download.get("target_path") != selected_model["download_path"]
            or download.get("source_url") != selected_model["source_url"]
        )
    )

    if should_reset_download:
        download.update(
            {
                "status": "idle",
                "pid": None,
                "model_id": state["selected_model_id"],
                "bytes_downloaded": 0,
                "total_bytes": None,
                "percent": 0,
                "target_path": selected_model["download_path"],
                "source_url": selected_model["source_url"],
                "message": "Waiting to start download.",
            }
        )
    elif download.get("status") == "idle":
        download["model_id"] = state["selected_model_id"]
        download["target_path"] = selected_model["download_path"]
        download["source_url"] = selected_model["source_url"]


def status_payload(state: dict) -> dict:
    payload = deep_copy(state)
    selected_id = payload["selected_model_id"]
    payload["selected_model"] = payload["models"][selected_id]
    payload["model_options"] = list(payload["models"].values())
    return payload


def load_state() -> dict:
    base = build_default_state()
    if not STATE_PATH.exists():
        refresh_state(base)
        return base

    try:
        with STATE_PATH.open("r", encoding="utf-8") as handle:
            loaded = json.load(handle)
    except (OSError, json.JSONDecodeError):
        refresh_state(base)
        return base

    base["selected_model_id"] = loaded.get("selected_model_id", DEFAULT_MODEL_ID)
    base["last_ocr"] = loaded.get("last_ocr")
    base["download"].update(loaded.get("download", {}))
    for model_id, model_state in loaded.get("models", {}).items():
        if model_id in base["models"]:
            base["models"][model_id].update(model_state)

    refresh_state(base)
    return base


STATE = load_state()


def save_state() -> None:
    with STATE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(STATE, handle, indent=2)


def update_state(mutator) -> dict:
    with LOCK:
        mutator(STATE)
        refresh_state(STATE)
        save_state()
        return status_payload(STATE)


def current_status() -> dict:
    with LOCK:
        refresh_state(STATE)
        return status_payload(STATE)


def selected_model_state(state: dict) -> dict:
    return state["models"][state["selected_model_id"]]


def safe_filename(filename: str) -> str:
    candidate = Path(filename).name.strip() or f"upload-{int(time.time())}"
    cleaned = "".join(ch if ch.isalnum() or ch in {".", "-", "_"} else "_" for ch in candidate)
    return cleaned or f"upload-{int(time.time())}"


def safe_markdown_filename(filename: str) -> str:
    base = Path(filename).name.strip()
    if not base:
        base = f"ocr-output-{int(time.time())}.md"

    stem = Path(base).stem or f"ocr-output-{int(time.time())}"
    cleaned_stem = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in stem).strip("._")
    cleaned_stem = cleaned_stem or f"ocr-output-{int(time.time())}"
    return f"{cleaned_stem}.md"


def guess_content_type(path: Path) -> str:
    content_type, _ = mimetypes.guess_type(str(path))
    return content_type or "application/octet-stream"


def file_url(path: Path) -> str:
    return f"/uploads/{urllib.parse.quote(path.name)}"


def run_macos_vision_ocr(file_path: Path) -> dict:
    if not OCR_SCRIPT.exists():
        raise RuntimeError("OCR helper script is missing.")

    command = ["swift", str(OCR_SCRIPT), str(file_path)]
    result = subprocess.run(
        command,
        cwd=str(ROOT),
        check=False,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip() or "Unknown OCR error"
        raise RuntimeError(stderr)

    try:
        parsed = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("OCR helper returned invalid JSON.") from exc

    return parsed


def runtime_python() -> Path:
    if LOCAL_PYTHON.exists():
        return LOCAL_PYTHON
    raise RuntimeError(
        "Local Python runtime is missing at .venv/bin/python. "
        "Create the project venv and install the Paddle runtime dependencies first."
    )


def run_paddleocr_vl(file_path: Path, model_path: Path) -> dict:
    if not PADDLE_OCR_SCRIPT.exists():
        raise RuntimeError("PaddleOCR-VL helper script is missing.")

    command = [
        str(runtime_python()),
        str(PADDLE_OCR_SCRIPT),
        "--model-path",
        str(model_path),
        "--input-path",
        str(file_path),
        "--task",
        "ocr",
    ]
    result = subprocess.run(
        command,
        cwd=str(ROOT),
        check=False,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip() or "Unknown PaddleOCR-VL error"
        raise RuntimeError(stderr)

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("PaddleOCR-VL helper returned invalid JSON.") from exc


def build_markdown_output(filename: str, model_state: dict, ocr_result: dict) -> str:
    pages = ocr_result.get("pages", [])
    backend = ocr_result.get("backend", "unknown")
    lines = [
        "# OCR Output",
        "",
        f"- Model: {model_state['name']}",
        f"- OCR backend: {backend}",
        f"- Source file: {filename}",
        f"- Pages: {len(pages)}",
        "",
        "## Extracted Content",
        "",
    ]

    if not pages:
        lines.extend(["_No pages were returned by the OCR backend._", ""])
        return "\n".join(lines).strip()

    for page in pages:
        page_number = page.get("page", "?")
        text = page.get("text", "").rstrip() or "(No text extracted)"
        text = text.replace("~~~", "~~~ ")
        lines.extend(
            [
                f"### Page {page_number}",
                "",
                "~~~text",
                text,
                "~~~",
                "",
            ]
        )

    return "\n".join(lines).strip()


def start_download_thread(model_id: str, target_path: Path, source_url: str) -> None:
    catalog = MODEL_CATALOG[model_id]

    def worker() -> None:
        if catalog["download_kind"] == "file":
            temp_path = target_path.with_name(f"{target_path.name}.download")
            request = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0"})

            try:
                target_path.parent.mkdir(parents=True, exist_ok=True)

                with urllib.request.urlopen(request) as response, temp_path.open("wb") as handle:
                    total_header = response.headers.get("Content-Length")
                    total_bytes = int(total_header) if total_header and total_header.isdigit() else None

                    def on_running(state: dict) -> None:
                        state["download"].update(
                            {
                                "status": "running",
                                "pid": None,
                                "model_id": model_id,
                                "bytes_downloaded": 0,
                                "total_bytes": total_bytes,
                                "percent": 0,
                                "target_path": str(target_path),
                                "source_url": source_url,
                                "message": f"Downloading {catalog['name']}...",
                            }
                        )

                    update_state(on_running)

                    downloaded = 0
                    last_flush = 0.0
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break

                        handle.write(chunk)
                        downloaded += len(chunk)

                        now = time.time()
                        if now - last_flush >= 0.25:
                            percent = (
                                round((downloaded / total_bytes) * 100, 2)
                                if total_bytes
                                else 0
                            )

                            def on_progress(state: dict) -> None:
                                state["download"].update(
                                    {
                                        "status": "running",
                                        "model_id": model_id,
                                        "bytes_downloaded": downloaded,
                                        "total_bytes": total_bytes,
                                        "percent": percent,
                                        "target_path": str(target_path),
                                        "source_url": source_url,
                                        "message": f"Downloading {catalog['name']}...",
                                    }
                                )

                            update_state(on_progress)
                            last_flush = now

                temp_path.replace(target_path)

                def on_success(state: dict) -> None:
                    final_total = target_path.stat().st_size if target_path.exists() else 0
                    model_state = state["models"][model_id]
                    model_state["download_path"] = str(target_path)
                    model_state["download_directory"] = str(target_path.parent)
                    model_state["last_download_error"] = None
                    model_state["download_finished_at"] = int(time.time())
                    state["download"].update(
                        {
                            "status": "completed",
                            "pid": None,
                            "model_id": model_id,
                            "bytes_downloaded": final_total,
                            "total_bytes": final_total,
                            "percent": 100,
                            "target_path": str(target_path),
                            "source_url": source_url,
                            "message": f"{catalog['name']} download complete.",
                        }
                    )

                update_state(on_success)
                return
            except Exception as exc:  # pragma: no cover - network/runtime-dependent
                if temp_path.exists():
                    temp_path.unlink()

                error_message = str(exc) or "Download failed"

                def on_failure(state: dict) -> None:
                    model_state = state["models"][model_id]
                    model_state["download_path"] = str(target_path)
                    model_state["download_directory"] = str(target_path.parent)
                    model_state["last_download_error"] = error_message
                    model_state["download_finished_at"] = int(time.time())
                    state["download"].update(
                        {
                            "status": "failed",
                            "pid": None,
                            "model_id": model_id,
                            "target_path": str(target_path),
                            "source_url": source_url,
                            "message": f"{catalog['name']} download failed.",
                        }
                    )

                update_state(on_failure)
                return

        if model_id == "paddleocr-vl-1.5":
            command = [
                str(runtime_python()),
                str(HF_SNAPSHOT_SCRIPT),
                "--repo-id",
                "PaddlePaddle/PaddleOCR-VL-1.5",
                "--target-path",
                str(target_path),
            ]
            try:
                target_path.parent.mkdir(parents=True, exist_ok=True)
                process = subprocess.Popen(
                    command,
                    cwd=str(ROOT),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                )

                def on_running(state: dict) -> None:
                    state["download"].update(
                        {
                            "status": "running",
                            "pid": process.pid,
                            "model_id": model_id,
                            "bytes_downloaded": 0,
                            "total_bytes": None,
                            "percent": 0,
                            "target_path": str(target_path),
                            "source_url": source_url,
                            "message": f"Downloading {catalog['name']} model snapshot...",
                        }
                    )

                update_state(on_running)

                last_message = f"Downloading {catalog['name']} model snapshot..."
                for line in process.stdout:
                    cleaned = line.strip()
                    if not cleaned:
                        continue
                    try:
                        event = json.loads(cleaned)
                    except json.JSONDecodeError:
                        last_message = cleaned
                    else:
                        last_message = event.get("message") or event.get("target_path") or last_message

                    def on_progress(state: dict) -> None:
                        state["download"].update(
                            {
                                "status": "running",
                                "pid": process.pid,
                                "model_id": model_id,
                                "target_path": str(target_path),
                                "source_url": source_url,
                                "message": last_message,
                            }
                        )

                    update_state(on_progress)

                stderr_text = process.stderr.read() if process.stderr else ""
                process.wait()
                if process.returncode == 0:

                    def on_success(state: dict) -> None:
                        model_state = state["models"][model_id]
                        model_state["download_path"] = str(target_path)
                        model_state["download_directory"] = str(target_path.parent)
                        model_state["last_download_error"] = None
                        model_state["download_finished_at"] = int(time.time())
                        state["download"].update(
                            {
                                "status": "completed",
                                "pid": None,
                                "model_id": model_id,
                                "bytes_downloaded": 0,
                                "total_bytes": None,
                                "percent": 100,
                                "target_path": str(target_path),
                                "source_url": source_url,
                                "message": f"{catalog['name']} model snapshot download complete.",
                            }
                        )

                    update_state(on_success)
                    return

                error_message = (stderr_text or last_message or "Model snapshot download failed").strip()

                def on_failure(state: dict) -> None:
                    model_state = state["models"][model_id]
                    model_state["download_path"] = str(target_path)
                    model_state["download_directory"] = str(target_path.parent)
                    model_state["last_download_error"] = error_message
                    model_state["download_finished_at"] = int(time.time())
                    state["download"].update(
                        {
                            "status": "failed",
                            "pid": None,
                            "model_id": model_id,
                            "target_path": str(target_path),
                            "source_url": source_url,
                            "message": f"{catalog['name']} model snapshot download failed.",
                        }
                    )

                update_state(on_failure)
                return
            except Exception as exc:  # pragma: no cover - runtime-dependent
                error_message = str(exc) or "Model snapshot download failed"

                def on_failure(state: dict) -> None:
                    model_state = state["models"][model_id]
                    model_state["download_path"] = str(target_path)
                    model_state["download_directory"] = str(target_path.parent)
                    model_state["last_download_error"] = error_message
                    model_state["download_finished_at"] = int(time.time())
                    state["download"].update(
                        {
                            "status": "failed",
                            "pid": None,
                            "model_id": model_id,
                            "target_path": str(target_path),
                            "source_url": source_url,
                            "message": f"{catalog['name']} model snapshot download failed.",
                        }
                    )

                update_state(on_failure)
                return

        clone_target = target_path
        parent_dir = clone_target.parent
        command = ["git", "clone", "--depth", "1", "--progress", source_url, str(clone_target)]

        try:
            parent_dir.mkdir(parents=True, exist_ok=True)
            process = subprocess.Popen(
                command,
                cwd=str(ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )

            def on_running(state: dict) -> None:
                state["download"].update(
                    {
                        "status": "running",
                        "pid": process.pid,
                        "model_id": model_id,
                        "bytes_downloaded": 0,
                        "total_bytes": None,
                        "percent": 0,
                        "target_path": str(clone_target),
                        "source_url": source_url,
                        "message": f"Cloning {catalog['name']} repository...",
                    }
                )

            update_state(on_running)

            last_message = f"Cloning {catalog['name']} repository..."
            for line in process.stderr:
                cleaned = line.strip()
                if not cleaned:
                    continue
                last_message = cleaned

                def on_progress(state: dict) -> None:
                    state["download"].update(
                        {
                            "status": "running",
                            "pid": process.pid,
                            "model_id": model_id,
                            "target_path": str(clone_target),
                            "source_url": source_url,
                            "message": cleaned,
                        }
                    )

                update_state(on_progress)

            stdout_text = process.stdout.read() if process.stdout else ""
            process.wait()
            if process.returncode == 0:

                def on_success(state: dict) -> None:
                    model_state = state["models"][model_id]
                    model_state["download_path"] = str(clone_target)
                    model_state["download_directory"] = str(clone_target.parent)
                    model_state["last_download_error"] = None
                    model_state["download_finished_at"] = int(time.time())
                    state["download"].update(
                        {
                            "status": "completed",
                            "pid": None,
                            "model_id": model_id,
                            "bytes_downloaded": 0,
                            "total_bytes": None,
                            "percent": 100,
                            "target_path": str(clone_target),
                            "source_url": source_url,
                            "message": f"{catalog['name']} repository clone complete.",
                        }
                    )

                update_state(on_success)
                return

            error_message = (last_message or stdout_text or "Repository clone failed").strip()
            if clone_target.exists():
                shutil.rmtree(clone_target, ignore_errors=True)

            def on_failure(state: dict) -> None:
                model_state = state["models"][model_id]
                model_state["download_path"] = str(clone_target)
                model_state["download_directory"] = str(clone_target.parent)
                model_state["last_download_error"] = error_message
                model_state["download_finished_at"] = int(time.time())
                state["download"].update(
                    {
                        "status": "failed",
                        "pid": None,
                        "model_id": model_id,
                        "target_path": str(clone_target),
                        "source_url": source_url,
                        "message": f"{catalog['name']} repository clone failed.",
                    }
                )

            update_state(on_failure)
        except Exception as exc:  # pragma: no cover - runtime-dependent
            if clone_target.exists():
                shutil.rmtree(clone_target, ignore_errors=True)

            error_message = str(exc) or "Repository clone failed"

            def on_failure(state: dict) -> None:
                model_state = state["models"][model_id]
                model_state["download_path"] = str(clone_target)
                model_state["download_directory"] = str(clone_target.parent)
                model_state["last_download_error"] = error_message
                model_state["download_finished_at"] = int(time.time())
                state["download"].update(
                    {
                        "status": "failed",
                        "pid": None,
                        "model_id": model_id,
                        "target_path": str(clone_target),
                        "source_url": source_url,
                        "message": f"{catalog['name']} repository clone failed.",
                    }
                )

            update_state(on_failure)

    threading.Thread(target=worker, daemon=True).start()


class OCRAppHandler(BaseHTTPRequestHandler):
    server_version = "OCRResearchApp/0.2"

    def _json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _serve_file(self, path: Path, content_type: str | None = None) -> None:
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        body = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or guess_content_type(path))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path

        if route in {"/", "/index.html"}:
            self._serve_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return

        if route == "/app.js":
            self._serve_file(STATIC_DIR / "app.js", "application/javascript; charset=utf-8")
            return

        if route == "/styles.css":
            self._serve_file(STATIC_DIR / "styles.css", "text/css; charset=utf-8")
            return

        if route == "/api/status":
            self._json(current_status())
            return

        if route.startswith("/uploads/"):
            requested = route.removeprefix("/uploads/")
            filename = urllib.parse.unquote(requested)
            self._serve_file(UPLOADS_DIR / filename)
            return

        if route.startswith("/outputs/"):
            requested = route.removeprefix("/outputs/")
            filename = urllib.parse.unquote(requested)
            self._serve_file(OUTPUTS_DIR / filename, "text/markdown; charset=utf-8")
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path

        if route == "/api/model/select":
            payload = self._read_json_body()
            model_id = payload.get("model_id")
            if model_id not in MODEL_CATALOG:
                self._json({"error": "Unknown model selection."}, HTTPStatus.BAD_REQUEST)
                return

            status = current_status()
            if status["download"]["status"] in {"running", "queued"}:
                self._json(
                    {"error": "Wait for the current download to finish before switching models."},
                    HTTPStatus.CONFLICT,
                )
                return

            def on_select(state: dict) -> None:
                state["selected_model_id"] = model_id
                model_state = state["models"][model_id]
                state["download"].update(
                    {
                        "status": "idle",
                        "pid": None,
                        "model_id": model_id,
                        "bytes_downloaded": 0,
                        "total_bytes": None,
                        "percent": 0,
                        "target_path": model_state["download_path"],
                        "source_url": model_state["source_url"],
                        "message": "Waiting to start download.",
                    }
                )

            self._json({"ok": True, "status": update_state(on_select)})
            return

        if route == "/api/ocr/options":
            payload = self._read_json_body()
            model_id = payload.get("model_id")
            if model_id != "paddleocr-vl-1.5":
                self._json(
                    {"error": "Only PaddleOCR-VL-1.5 has configurable OCR options right now."},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            markdown_style = payload.get("markdown_style")
            pdf_structure = payload.get("pdf_structure")
            if markdown_style not in {"pretty", "raw"}:
                self._json({"error": "Invalid Paddle markdown style."}, HTTPStatus.BAD_REQUEST)
                return
            if pdf_structure not in {"merged", "per_page"}:
                self._json({"error": "Invalid Paddle PDF structure option."}, HTTPStatus.BAD_REQUEST)
                return

            def on_update_options(state: dict) -> None:
                state["ocr_options"]["paddle"]["markdown_style"] = markdown_style
                state["ocr_options"]["paddle"]["pdf_structure"] = pdf_structure

            self._json({"ok": True, "status": update_state(on_update_options)})
            return

        if route == "/api/model/download":
            payload = self._read_json_body()
            status = current_status()
            if status["download"]["status"] in {"running", "queued"}:
                self._json({"error": "Download already in progress."}, HTTPStatus.CONFLICT)
                return

            if not payload.get("confirmed"):
                self._json(
                    {"error": "Download requires explicit confirmation before it starts."},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            selected = status["selected_model"]
            model_id = selected["id"]
            target_path = normalize_download_path(payload.get("download_path") or selected["download_path"])
            source_url = selected["download_url"]

            if target_path.exists():
                self._json(
                    {
                        "error": (
                            f"A file or directory already exists at {target_path}. "
                            "Choose a different location or remove the existing target first."
                        )
                    },
                    HTTPStatus.CONFLICT,
                )
                return

            def on_start(state: dict) -> None:
                state["selected_model_id"] = model_id
                model_state = state["models"][model_id]
                model_state["download_path"] = str(target_path)
                model_state["download_directory"] = str(target_path.parent)
                model_state["last_download_error"] = None
                model_state["download_started_at"] = int(time.time())
                model_state["download_finished_at"] = None
                state["download"].update(
                    {
                        "status": "queued",
                        "pid": None,
                        "model_id": model_id,
                        "bytes_downloaded": 0,
                        "total_bytes": None,
                        "percent": 0,
                        "target_path": str(target_path),
                        "source_url": source_url,
                        "message": "Download queued. Waiting for network transfer to begin.",
                    }
                )

            update_state(on_start)
            start_download_thread(model_id, target_path, source_url)
            self._json(
                {
                    "ok": True,
                    "message": f"Started downloading {selected['name']}.",
                    "target_path": str(target_path),
                    "source_url": source_url,
                    "model_id": model_id,
                }
            )
            return

        if route == "/api/model/load":
            status = current_status()
            selected = status["selected_model"]
            model_id = selected["id"]
            model_path = model_path_from_state(selected)
            if not model_downloaded(selected):
                self._json(
                    {"error": f"Selected model is not available at {model_path}."},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            def on_load(state: dict) -> None:
                for each_model in state["models"].values():
                    each_model["loaded"] = False
                state["models"][model_id]["loaded"] = True
                state["models"][model_id]["last_load_error"] = None

            updated = update_state(on_load)
            self._json(
                {
                    "ok": True,
                    "message": (
                        f"{selected['name']} marked as loaded from {model_path} for OCR using "
                        f"{selected['active_backend']}."
                    ),
                    "status": updated,
                }
            )
            return

        if route == "/api/ocr":
            status = current_status()
            selected = status["selected_model"]
            if not selected["loaded"]:
                self._json(
                    {"error": "Load the selected model before running OCR."},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                },
            )

            if "file" not in form:
                self._json({"error": "No file uploaded."}, HTTPStatus.BAD_REQUEST)
                return

            uploaded = form["file"]
            if not getattr(uploaded, "file", None) or not uploaded.filename:
                self._json({"error": "Uploaded file is empty."}, HTTPStatus.BAD_REQUEST)
                return

            safe_name = safe_filename(uploaded.filename)
            stored_name = f"{int(time.time())}-{safe_name}"
            target_path = UPLOADS_DIR / stored_name

            with target_path.open("wb") as handle:
                shutil.copyfileobj(uploaded.file, handle)

            try:
                model_path = model_path_from_state(selected)
                if selected["id"] == "paddleocr-vl-1.5":
                    ocr_result = run_paddleocr_vl(target_path, model_path)
                else:
                    ocr_result = run_macos_vision_ocr(target_path)
            except Exception as exc:  # pragma: no cover - runtime-dependent
                self._json(
                    {
                        "error": str(exc),
                        "file_url": file_url(target_path),
                        "filename": uploaded.filename,
                    },
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
                return

            combined_text = "\n\n".join(
                page.get("text", "").strip()
                for page in ocr_result.get("pages", [])
                if page.get("text", "").strip()
            ).strip()
            markdown_output = build_markdown_output(uploaded.filename, selected, ocr_result)
            suggested_output_name = f"{Path(safe_filename(uploaded.filename)).stem}.md"
            paddle_options = status["ocr_options"]["paddle"] if selected["id"] == "paddleocr-vl-1.5" else None

            response = {
                "ok": True,
                "filename": uploaded.filename,
                "file_url": file_url(target_path),
                "content_type": guess_content_type(target_path),
                "backend": ocr_result.get("backend", "unknown"),
                "model_id": selected["id"],
                "model_name": selected["name"],
                "extracted_text": combined_text,
                "markdown_output": markdown_output,
                "suggested_output_name": suggested_output_name,
                "ocr_options_used": paddle_options,
                "option_effective_mode": "ui_only" if paddle_options else None,
                "pages": ocr_result.get("pages", []),
            }

            update_state(lambda state: state.__setitem__("last_ocr", response))
            self._json(response)
            return

        if route == "/api/output/save":
            payload = self._read_json_body()
            raw_filename = payload.get("filename", "")
            markdown_output = payload.get("markdown_output", "")

            if not markdown_output.strip():
                self._json({"error": "No Markdown output is available to save."}, HTTPStatus.BAD_REQUEST)
                return

            safe_name = safe_markdown_filename(raw_filename)
            target_path = OUTPUTS_DIR / safe_name
            target_path.write_text(markdown_output, encoding="utf-8")

            def on_save(state: dict) -> None:
                if state.get("last_ocr"):
                    state["last_ocr"]["saved_output_path"] = str(target_path)
                    state["last_ocr"]["saved_output_name"] = safe_name

            update_state(on_save)
            self._json(
                {
                    "ok": True,
                    "filename": safe_name,
                    "saved_path": str(target_path),
                    "saved_url": f"/outputs/{urllib.parse.quote(safe_name)}",
                    "message": f"Saved Markdown output to {target_path}.",
                }
            )
            return

        if route == "/api/reset":
            self._json({"ok": True, "status": update_state(lambda state: state.update(build_default_state()))})
            return

        self.send_error(HTTPStatus.NOT_FOUND)


def main() -> None:
    ensure_dirs()
    update_state(lambda state: None)
    httpd = ThreadingHTTPServer((HOST, PORT), OCRAppHandler)
    print(f"Serving OCR research app at http://{HOST}:{PORT}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
