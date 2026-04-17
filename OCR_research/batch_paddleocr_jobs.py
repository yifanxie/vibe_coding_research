#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

import yaml

from scripts.run_paddleocr_vl import default_logger, load_runtime, run_document


ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = ROOT / "models" / "PaddleOCR-VL-1.5"
DEFAULT_APPLE_PADDLEOCR_BIN = ROOT / ".venv_paddle_apple" / "bin" / "paddleocr"
DEFAULT_APPLE_CACHE_DIR = ROOT / ".paddlex_cache"
DEFAULT_LOGS_DIR = ROOT / "logs"
DEFAULT_TRANSFORMERS_MAX_NEW_TOKENS = 512
DEFAULT_MLX_MAX_NEW_TOKENS = 768
SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
LOGGER = Callable[[str], None]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Batch OCR runner for PaddleOCR-VL-1.5")
    parser.add_argument("--input-folder", required=True, help="Folder containing OCR input files")
    parser.add_argument("--output-folder", required=True, help="Folder to write Markdown outputs into")
    parser.add_argument(
        "--model-path",
        default=str(DEFAULT_MODEL_PATH),
        help="Path to the local PaddleOCR-VL-1.5 model snapshot",
    )
    parser.add_argument(
        "--backend",
        default="transformers",
        choices=["transformers", "mlx-vlm-server"],
        help="OCR backend mode. 'transformers' uses the local .venv runner, 'mlx-vlm-server' uses paddleocr doc_parser against a running MLX service.",
    )
    parser.add_argument(
        "--device",
        default="mps",
        choices=["mps", "cpu", "cuda", "auto"],
        help="Execution device preference; defaults to mps",
    )
    parser.add_argument(
        "--config",
        help="Optional YAML/JSON/TOML config file for parameters like max_new_tokens and pdf_render_scale",
    )
    parser.add_argument("--task", default="ocr", help="OCR task prompt type")
    parser.add_argument("--max-new-tokens", type=int, help="Override max_new_tokens")
    parser.add_argument("--pdf-render-scale", type=float, help="Override PDF render scale")
    parser.add_argument(
        "--use-doc-orientation-classify",
        action=argparse.BooleanOptionalAction,
        default=None,
        help="Enable or disable Paddle document orientation classification in mlx-vlm-server mode.",
    )
    parser.add_argument(
        "--use-doc-unwarping",
        action=argparse.BooleanOptionalAction,
        default=None,
        help="Enable or disable Paddle document unwarping in mlx-vlm-server mode.",
    )
    parser.add_argument(
        "--mlx-server-url",
        help="URL for a running mlx_vlm.server when --backend mlx-vlm-server is used",
    )
    parser.add_argument(
        "--mlx-api-model-name",
        help="Model identifier passed to paddleocr for the mlx-vlm server backend",
    )
    parser.add_argument(
        "--apple-paddleocr-bin",
        default=str(DEFAULT_APPLE_PADDLEOCR_BIN),
        help="Path to the paddleocr executable in the Apple Silicon environment",
    )
    parser.add_argument(
        "--capture-logs",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Capture batch CLI output into a log file under ./logs. Defaults to true.",
    )
    parser.add_argument(
        "--log-dir",
        default=str(DEFAULT_LOGS_DIR),
        help="Directory for captured batch logs. Defaults to ./logs",
    )
    return parser.parse_args()


def load_config(config_path: Path | None) -> dict:
    if config_path is None:
        return {}
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    suffix = config_path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        return yaml.safe_load(config_path.read_text()) or {}
    if suffix == ".json":
        return json.loads(config_path.read_text())
    if suffix == ".toml":
        import tomllib

        return tomllib.loads(config_path.read_text())

    raise ValueError("Config file must be .yaml, .yml, .json, or .toml")


def resolve_setting(args_value, config: dict, key: str, default):
    if args_value is not None:
        return args_value
    if key in config and config[key] is not None:
        return config[key]
    return default


def list_jobs(input_folder: Path) -> list[Path]:
    files = [path for path in input_folder.rglob("*") if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS]
    return sorted(files)


def output_path_for(input_folder: Path, output_folder: Path, input_file: Path) -> Path:
    relative = input_file.relative_to(input_folder)
    return (output_folder / relative).with_suffix(".md")


def append_cli_arg(command: list[str], flag: str, value) -> None:
    if value is None:
        return
    command.extend([flag, str(value)])


def append_cli_bool_arg(command: list[str], flag: str, value: bool | None) -> None:
    if value is None:
        return
    command.extend([flag, "true" if value else "false"])


def merge_no_proxy(existing: str | None, hosts: list[str]) -> str:
    values = [item.strip() for item in (existing or "").split(",") if item.strip()]
    for host in hosts:
        if host and host not in values:
            values.append(host)
    return ",".join(values)


def configure_local_mlx_proxy_bypass(env: dict[str, str], mlx_server_url: str, logger: LOGGER) -> None:
    parsed = urlparse(mlx_server_url)
    hostname = (parsed.hostname or "").strip().lower()
    if hostname not in {"localhost", "127.0.0.1", "::1"}:
        return

    local_hosts = [hostname, "localhost", "127.0.0.1", "::1"]
    env["NO_PROXY"] = merge_no_proxy(env.get("NO_PROXY") or env.get("no_proxy"), local_hosts)
    env["no_proxy"] = env["NO_PROXY"]

    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
        if key in env:
            logger(f"[batch] Preserving {key} for non-local traffic while bypassing proxies for {hostname} via NO_PROXY.")

    logger(f"[batch] Local MLX server detected; NO_PROXY set to {env['NO_PROXY']}")


def make_logger(*, capture_logs: bool, log_dir: Path, backend: str) -> tuple[LOGGER, Path | None, Callable[[], None]]:
    log_path = None
    handle = None
    if capture_logs:
        log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        log_path = log_dir / f"batch_{backend}_{timestamp}.log"
        handle = log_path.open("w", encoding="utf-8")

    def logger(message: str) -> None:
        default_logger(message)
        if handle is not None:
            handle.write(message + "\n")
            handle.flush()

    def close_logger() -> None:
        if handle is not None:
            handle.close()

    return logger, log_path, close_logger


def build_markdown_output(input_file: Path, backend: str, metrics: dict, pages: list[dict]) -> str:
    lines = [
        "# OCR Output",
        "",
        f"- Source file: {input_file.name}",
        f"- OCR backend: {backend}",
        f"- Total pages: {len(pages)}",
        f"- Data loading time (s): {metrics.get('data_loading_time_s', 'n/a')}",
        f"- Inference time (s): {metrics.get('inference_time_s', 'n/a')}",
        f"- Total OCR time (s): {metrics.get('total_time_s', 'n/a')}",
        "",
        "## Extracted Content",
        "",
    ]
    for page in pages:
        lines.extend(
            [
                f"### Page {page.get('page', '?')}",
                "",
                "~~~text",
                (page.get("text", "") or "(No text extracted)").rstrip(),
                "~~~",
                "",
            ]
        )
    return "\n".join(lines).strip()


def run_job_with_transformers_backend(
    *,
    jobs: list[Path],
    input_folder: Path,
    output_folder: Path,
    model_path: Path,
    task: str,
    device: str,
    max_new_tokens: int,
    pdf_render_scale: float,
    logger: LOGGER,
) -> tuple[int, int]:
    logger(f"[batch] Model path: {model_path}")
    logger(f"[batch] Device preference: {device}")
    logger(f"[batch] max_new_tokens={max_new_tokens}, pdf_render_scale={pdf_render_scale}")

    processor, model, resolved_device, model_load_time = load_runtime(model_path, device, logger)
    logger(f"[batch] Shared model load complete in {model_load_time:.2f}s")

    successes = 0
    failures = 0
    for index, input_file in enumerate(jobs, start=1):
        job_started_at = time.perf_counter()
        output_path = output_path_for(input_folder, output_folder, input_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        logger(f"[job {index}/{len(jobs)}] Starting {input_file.relative_to(input_folder)}")
        try:
            result = run_document(
                input_file,
                processor,
                model,
                resolved_device,
                task=task,
                max_new_tokens=max_new_tokens,
                pdf_render_scale=pdf_render_scale,
                logger=logger,
            )
            markdown_output = build_markdown_output(input_file, result["backend"], result.get("metrics", {}), result.get("pages", []))
            output_path.write_text(markdown_output, encoding="utf-8")
            job_elapsed = time.perf_counter() - job_started_at
            logger(f"[job {index}/{len(jobs)}] Saved {output_path} in {job_elapsed:.2f}s")
            successes += 1
        except Exception as exc:  # pragma: no cover - runtime-dependent
            job_elapsed = time.perf_counter() - job_started_at
            logger(f"[job {index}/{len(jobs)}] FAILED after {job_elapsed:.2f}s: {exc}")
            failures += 1

    return successes, failures


def run_job_with_mlx_backend(
    *,
    jobs: list[Path],
    input_folder: Path,
    output_folder: Path,
    apple_paddleocr_bin: Path,
    mlx_server_url: str,
    mlx_api_model_name: str,
    device: str,
    max_new_tokens: int,
    use_doc_orientation_classify: bool | None,
    use_doc_unwarping: bool | None,
    config: dict,
    logger: LOGGER,
) -> tuple[int, int]:
    if not apple_paddleocr_bin.exists():
        raise SystemExit(f"paddleocr binary not found: {apple_paddleocr_bin}")

    logger(f"[batch] paddleocr binary: {apple_paddleocr_bin}")
    logger(f"[batch] MLX server URL: {mlx_server_url}")
    logger(f"[batch] MLX api model name: {mlx_api_model_name}")
    logger(
        "[batch] MLX doc preprocessing: "
        f"use_doc_orientation_classify={use_doc_orientation_classify}, "
        f"use_doc_unwarping={use_doc_unwarping}, "
        f"max_new_tokens={max_new_tokens}"
    )
    if "pdf_render_scale" in config:
        logger("[batch] pdf_render_scale is ignored in mlx-vlm-server mode because Paddle handles document loading internally.")

    env = os.environ.copy()
    env.setdefault("PADDLE_PDX_CACHE_HOME", str(DEFAULT_APPLE_CACHE_DIR))
    env.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    Path(env["PADDLE_PDX_CACHE_HOME"]).mkdir(parents=True, exist_ok=True)
    configure_local_mlx_proxy_bypass(env, mlx_server_url, logger)

    successes = 0
    failures = 0
    for index, input_file in enumerate(jobs, start=1):
        job_started_at = time.perf_counter()
        output_path = output_path_for(input_folder, output_folder, input_file)
        output_dir = output_path.parent
        output_dir.mkdir(parents=True, exist_ok=True)
        logger(f"[job {index}/{len(jobs)}] Starting {input_file.relative_to(input_folder)}")
        logger(f"[job {index}/{len(jobs)}] Connecting to mlx_vlm.server at {mlx_server_url}")

        command = [
            str(apple_paddleocr_bin),
            "doc_parser",
            "--input",
            str(input_file),
            "--save_path",
            str(output_dir),
            "--vl_rec_backend",
            "mlx-vlm-server",
            "--vl_rec_server_url",
            mlx_server_url,
            "--vl_rec_api_model_name",
            mlx_api_model_name,
            "--max_new_tokens",
            str(max_new_tokens),
        ]

        min_pixels = config.get("min_pixels")
        max_pixels = config.get("max_pixels")
        vl_rec_max_concurrency = config.get("vl_rec_max_concurrency")
        repetition_penalty = config.get("repetition_penalty")
        temperature = config.get("temperature")
        top_p = config.get("top_p")

        append_cli_arg(command, "--min_pixels", min_pixels)
        append_cli_arg(command, "--max_pixels", max_pixels)
        append_cli_arg(command, "--vl_rec_max_concurrency", vl_rec_max_concurrency)
        append_cli_arg(command, "--repetition_penalty", repetition_penalty)
        append_cli_arg(command, "--temperature", temperature)
        append_cli_arg(command, "--top_p", top_p)
        append_cli_bool_arg(command, "--use_doc_orientation_classify", use_doc_orientation_classify)
        append_cli_bool_arg(command, "--use_doc_unwarping", use_doc_unwarping)

        # In mlx-vlm-server mode, the server handles the Apple GPU path. The optional
        # --device flag is only meaningful for the rest of the Paddle pipeline.
        if device == "cpu":
            append_cli_arg(command, "--device", "cpu")

        try:
            process = subprocess.Popen(
                command,
                cwd=str(ROOT),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            streamed_lines = 0
            assert process.stdout is not None
            for line in process.stdout:
                cleaned = line.rstrip()
                if not cleaned:
                    continue
                streamed_lines += 1
                logger(f"[paddlecli {index}/{len(jobs)}] {cleaned}")

            return_code = process.wait()
            job_elapsed = time.perf_counter() - job_started_at
            if return_code != 0:
                raise RuntimeError(
                    f"paddleocr doc_parser exited with code {return_code}. "
                    "If the MLX server is local, confirm it is running and that NO_PROXY includes localhost and 127.0.0.1."
                )

            expected_output = output_path
            if not expected_output.exists():
                raise RuntimeError(
                    f"Expected Markdown output was not created at {expected_output}. "
                    f"paddleocr completed with {streamed_lines} output line(s)."
                )

            logger(f"[job {index}/{len(jobs)}] Saved {expected_output} in {job_elapsed:.2f}s")
            successes += 1
        except Exception as exc:  # pragma: no cover - runtime-dependent
            job_elapsed = time.perf_counter() - job_started_at
            logger(f"[job {index}/{len(jobs)}] FAILED after {job_elapsed:.2f}s: {exc}")
            failures += 1

    return successes, failures


def main() -> int:
    args = parse_args()
    config = load_config(Path(args.config).expanduser().resolve() if args.config else None)

    input_folder = Path(args.input_folder).expanduser().resolve()
    output_folder = Path(args.output_folder).expanduser().resolve()
    model_path = Path(args.model_path).expanduser().resolve()
    apple_paddleocr_bin = Path(args.apple_paddleocr_bin).expanduser().resolve()
    log_dir = Path(args.log_dir).expanduser().resolve()
    if not input_folder.exists() or not input_folder.is_dir():
        raise SystemExit(f"Input folder not found or not a directory: {input_folder}")
    if args.backend == "transformers" and not model_path.exists():
        raise SystemExit(f"Model path not found: {model_path}")

    output_folder.mkdir(parents=True, exist_ok=True)
    default_max_new_tokens = (
        DEFAULT_MLX_MAX_NEW_TOKENS if args.backend == "mlx-vlm-server" else DEFAULT_TRANSFORMERS_MAX_NEW_TOKENS
    )
    max_new_tokens = int(resolve_setting(args.max_new_tokens, config, "max_new_tokens", default_max_new_tokens))
    pdf_render_scale = float(resolve_setting(args.pdf_render_scale, config, "pdf_render_scale", 2.0))
    task = resolve_setting(args.task, config, "task", "ocr")
    use_doc_orientation_classify = resolve_setting(
        args.use_doc_orientation_classify,
        config,
        "use_doc_orientation_classify",
        True if args.backend == "mlx-vlm-server" else None,
    )
    use_doc_unwarping = resolve_setting(
        args.use_doc_unwarping,
        config,
        "use_doc_unwarping",
        True if args.backend == "mlx-vlm-server" else None,
    )
    mlx_server_url = resolve_setting(args.mlx_server_url, config, "mlx_server_url", "http://localhost:8111/")
    mlx_api_model_name = resolve_setting(
        args.mlx_api_model_name,
        config,
        "mlx_api_model_name",
        str(model_path),
    )

    jobs = list_jobs(input_folder)
    if not jobs:
        raise SystemExit(f"No supported OCR files found in {input_folder}")

    logger, log_path, close_logger = make_logger(
        capture_logs=args.capture_logs,
        log_dir=log_dir,
        backend=args.backend,
    )
    logger(f"[batch] Found {len(jobs)} job(s) in {input_folder}")
    logger(f"[batch] Output folder: {output_folder}")
    logger(f"[batch] Backend mode: {args.backend}")
    if log_path is not None:
        logger(f"[batch] Capturing logs to {log_path}")

    try:
        total_started_at = time.perf_counter()
        if args.backend == "transformers":
            successes, failures = run_job_with_transformers_backend(
                jobs=jobs,
                input_folder=input_folder,
                output_folder=output_folder,
                model_path=model_path,
                task=task,
                device=args.device,
                max_new_tokens=max_new_tokens,
                pdf_render_scale=pdf_render_scale,
                logger=logger,
            )
        else:
            successes, failures = run_job_with_mlx_backend(
                jobs=jobs,
                input_folder=input_folder,
                output_folder=output_folder,
                apple_paddleocr_bin=apple_paddleocr_bin,
                mlx_server_url=mlx_server_url,
                mlx_api_model_name=mlx_api_model_name,
                device=args.device,
                max_new_tokens=max_new_tokens,
                use_doc_orientation_classify=use_doc_orientation_classify,
                use_doc_unwarping=use_doc_unwarping,
                config=config,
                logger=logger,
            )

        total_elapsed = time.perf_counter() - total_started_at
        logger(f"[summary] Completed batch in {total_elapsed:.2f}s with {successes} success(es) and {failures} failure(s)")
        if log_path is not None:
            logger(f"[summary] Log file saved to {log_path}")
        return 0 if failures == 0 else 1
    finally:
        close_logger()


if __name__ == "__main__":
    raise SystemExit(main())
