#!/usr/bin/env python3
import argparse
import json
import sys
import time
from pathlib import Path
from typing import Callable

import fitz
import torch
from PIL import Image
from transformers import AutoModelForCausalLM, AutoProcessor


PROMPTS = {"ocr": "OCR:"}
LOGGER = Callable[[str], None]


def default_logger(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def noop_logger(_: str) -> None:
    return


def normalize_device_preference(device_preference: str) -> str:
    value = (device_preference or "auto").strip().lower()
    if value not in {"auto", "mps", "cpu", "cuda"}:
        raise ValueError(f"Unsupported device preference: {device_preference}")
    return value


def candidate_devices(device_preference: str) -> list[str]:
    preference = normalize_device_preference(device_preference)
    if preference != "auto":
        return [preference]

    devices: list[str] = []
    if torch.backends.mps.is_available():
        devices.append("mps")
    if torch.cuda.is_available():
        devices.append("cuda")
    devices.append("cpu")
    return devices


def choose_dtype(device: str):
    if device == "cuda":
        return torch.bfloat16
    if device == "mps":
        return torch.float16
    return torch.float32


def load_images(input_path: Path, pdf_render_scale: float, logger: LOGGER) -> tuple[list[tuple[int, Image.Image]], float]:
    start_time = time.perf_counter()
    suffix = input_path.suffix.lower()
    if suffix == ".pdf":
        logger(f"[data] Opening PDF {input_path.name}")
        document = fitz.open(input_path)
        pages = []
        logger(f"[data] Rendering {document.page_count} page(s) at scale {pdf_render_scale:.2f}")
        for index, page in enumerate(document):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(pdf_render_scale, pdf_render_scale), alpha=False)
            mode = "RGB" if pixmap.n < 4 else "RGBA"
            image = Image.frombytes(mode, [pixmap.width, pixmap.height], pixmap.samples)
            if image.mode != "RGB":
                image = image.convert("RGB")
            pages.append((index + 1, image))
        document.close()
        return pages, time.perf_counter() - start_time

    logger(f"[data] Loading image {input_path.name}")
    image = Image.open(input_path).convert("RGB")
    return [(1, image)], time.perf_counter() - start_time


def run_page(
    model,
    processor,
    image: Image.Image,
    prompt: str,
    device: str,
    max_new_tokens: int,
    page_number: int,
    logger: LOGGER,
) -> tuple[str, float]:
    logger(f"[inference] Page {page_number}: preparing inputs")
    prep_started_at = time.perf_counter()
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
        images_kwargs={
            "size": {
                "shortest_edge": processor.image_processor.min_pixels,
                "longest_edge": 1280 * 28 * 28,
            }
        },
    )
    inputs = inputs.to(device)
    prep_elapsed = time.perf_counter() - prep_started_at
    logger(f"[inference] Page {page_number}: input prep took {prep_elapsed:.2f}s, generating up to {max_new_tokens} tokens")

    generation_started_at = time.perf_counter()
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=max_new_tokens)
    generation_elapsed = time.perf_counter() - generation_started_at

    decoded = processor.decode(
        outputs[0][inputs["input_ids"].shape[-1] : -1],
        skip_special_tokens=True,
    )
    logger(f"[inference] Page {page_number}: generation took {generation_elapsed:.2f}s")
    return decoded.strip(), generation_elapsed


def load_runtime(model_path: Path, device_preference: str, logger: LOGGER) -> tuple[object, object, str, float]:
    started_at = time.perf_counter()
    logger("[model] Loading processor")
    processor = AutoProcessor.from_pretrained(
        str(model_path),
        trust_remote_code=True,
        local_files_only=True,
        use_fast=False,
    )

    errors: list[str] = []
    for device in candidate_devices(device_preference):
        dtype = choose_dtype(device)
        logger(f"[model] Trying device={device} dtype={dtype}")
        try:
            model = AutoModelForCausalLM.from_pretrained(
                str(model_path),
                trust_remote_code=True,
                local_files_only=True,
                torch_dtype=dtype,
            ).to(device).eval()
            elapsed = time.perf_counter() - started_at
            logger(f"[model] Model loaded on {device} in {elapsed:.2f}s")
            return processor, model, device, elapsed
        except Exception as exc:  # pragma: no cover - device/runtime-dependent
            errors.append(f"{device}: {exc}")
            logger(f"[model] Failed on {device}: {exc}")

    raise RuntimeError("Unable to load PaddleOCR-VL runtime. " + " | ".join(errors))


def run_document(
    input_path: Path,
    processor,
    model,
    device: str,
    *,
    task: str,
    max_new_tokens: int,
    pdf_render_scale: float,
    logger: LOGGER,
) -> dict:
    pages, data_loading_time = load_images(input_path, pdf_render_scale, logger)
    logger(f"[data] Loaded {len(pages)} page(s) in {data_loading_time:.2f}s")

    inference_started_at = time.perf_counter()
    page_payloads = []
    page_timings = []
    prompt = PROMPTS.get(task, "OCR:")
    for page_number, image in pages:
        page_text, page_inference_time = run_page(
            model,
            processor,
            image,
            prompt,
            device,
            max_new_tokens,
            page_number,
            logger,
        )
        page_payloads.append({"page": page_number, "text": page_text})
        page_timings.append({"page": page_number, "inference_time_s": round(page_inference_time, 3)})

    inference_time = time.perf_counter() - inference_started_at
    total_time = data_loading_time + inference_time
    logger(f"[done] OCR completed in {total_time:.2f}s")
    return {
        "backend": f"paddleocr-vl-transformers-{device}",
        "pages": page_payloads,
        "metrics": {
            "data_loading_time_s": round(data_loading_time, 3),
            "inference_time_s": round(inference_time, 3),
            "total_time_s": round(total_time, 3),
            "page_timings": page_timings,
        },
    }


def perform_ocr(
    *,
    model_path: Path,
    input_path: Path,
    task: str,
    device_preference: str,
    max_new_tokens: int,
    pdf_render_scale: float,
    logger: LOGGER,
) -> dict:
    processor, model, device, model_load_time = load_runtime(model_path, device_preference, logger)
    payload = run_document(
        input_path,
        processor,
        model,
        device,
        task=task,
        max_new_tokens=max_new_tokens,
        pdf_render_scale=pdf_render_scale,
        logger=logger,
    )
    payload["metrics"]["model_load_time_s"] = round(model_load_time, 3)
    payload["metrics"]["end_to_end_time_s"] = round(model_load_time + payload["metrics"]["total_time_s"], 3)
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--input-path", required=True)
    parser.add_argument("--task", default="ocr")
    parser.add_argument("--device", default="auto", choices=["auto", "mps", "cpu", "cuda"])
    parser.add_argument("--max-new-tokens", type=int, default=512)
    parser.add_argument("--pdf-render-scale", type=float, default=2.0)
    parser.add_argument("--quiet", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    model_path = Path(args.model_path)
    input_path = Path(args.input_path)
    if not model_path.exists():
        raise SystemExit(f"Model path not found: {model_path}")
    if not input_path.exists():
        raise SystemExit(f"Input path not found: {input_path}")

    logger = noop_logger if args.quiet else default_logger
    payload = perform_ocr(
        model_path=model_path,
        input_path=input_path,
        task=args.task,
        device_preference=args.device,
        max_new_tokens=args.max_new_tokens,
        pdf_render_scale=args.pdf_render_scale,
        logger=logger,
    )
    json.dump(payload, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
