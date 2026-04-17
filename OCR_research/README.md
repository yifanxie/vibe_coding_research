# OCR Model Pilot

This is a lightweight local HTML app for the OCR research pilot.

## What it does

- Presents a simple browser UI for multiple OCR models
- Defaults to `PaddleOCR-VL-1.5`
- Also includes `Qwen 3.5 4B`
- Lets you choose which model to use for OCR work
- Adds saved Paddle-specific demo options for Markdown style and PDF structure
- Lets you start a model download into a reusable location
- Lets you mark the selected model as loaded for OCR work
- Lets you upload a scanned PDF or image
- Shows the original file side by side with Markdown output
- Lets you switch between raw Markdown and Markdown preview
- Lets you save Markdown output into `./outputs` with a user-chosen filename

## Current backend behavior

The UI and model controls are model-aware.

For this laptop pilot:

- `PaddleOCR-VL-1.5` now runs through the real local model weights with:
  - `scripts/run_paddleocr_vl.py`
- `Qwen 3.5 4B` still uses the local macOS Vision helper:
  - `scripts/macos_vision_ocr.swift`

## Run locally

```bash
python3 app.py
```

Then open:

```text
http://127.0.0.1:8010
```

## Notes

- `PaddleOCR-VL-1.5` downloads as a Hugging Face snapshot so the actual model weights are present
- `Qwen 3.5 4B` downloads as a single GGUF file
- Saved Markdown outputs are written to `./outputs`
- Download requires network access at runtime
- The Paddle local runtime expects a project venv at `.venv` with the required model dependencies installed

## Batch OCR CLI

You can process a whole folder of OCR jobs from the terminal with the current local `transformers` backend:

```bash
./.venv/bin/python batch_paddleocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/ \
  --backend transformers \
  --device mps \
  --config ./batch_ocr_config.example.yaml
```

You can also run the same batch flow against a running `mlx_vlm.server`:

```bash
./.venv/bin/python batch_paddleocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/paddle_mlx_batch \
  --backend mlx-vlm-server \
  --mlx-server-url http://localhost:8111/ \
  --use-doc-orientation-classify \
  --use-doc-unwarping \
  --config ./batch_ocr_config.example.yaml
```

Important for `mlx-vlm-server` mode:

- before running the batch CLI with `--backend mlx-vlm-server`, you must first start `mlx_vlm.server` in the Apple Silicon Paddle environment
- if the server is not already running, the batch jobs will fail because the Paddle client cannot connect to the local VLM service
- recommended startup flow:

```bash
source ./scripts/activate_paddle_apple_env.sh
export PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
mlx_vlm.server --port 8111
```

### Supported batch parameters:

- `--input-folder`: scans for supported OCR files and creates one job per file
- `--output-folder`: writes Markdown outputs with matching relative names
- `--backend`: `transformers` or `mlx-vlm-server`
- `--device`: `mps`, `cpu`, `cuda`, or `auto` with default `mps`
- `--config`: optional YAML/JSON/TOML config for values like `max_new_tokens` and `pdf_render_scale`
- `--capture-logs` / `--no-capture-logs`: enable or disable log capture; default is enabled
- `--log-dir`: directory for saved batch logs; default is `./logs`

### Additional MLX batch parameters:

- `--mlx-server-url`: URL for the running `mlx_vlm.server`
- `--mlx-api-model-name`: model identifier passed to Paddle's MLX server client. For this project, prefer the local model path such as `./models/PaddleOCR-VL-1.5` rather than the Hugging Face repo id.
- `--apple-paddleocr-bin`: override path to the `paddleocr` executable in the Apple Silicon environment
- `--use-doc-orientation-classify` / `--no-use-doc-orientation-classify`: control Paddle document orientation classification in MLX mode
- `--use-doc-unwarping` / `--no-use-doc-unwarping`: control Paddle document unwarping in MLX mode

### Default MLX tuning in the current CLI:

- `max_new_tokens` defaults to `768` for `--backend mlx-vlm-server`
- `use_doc_orientation_classify` defaults to `true` for `--backend mlx-vlm-server`
- `use_doc_unwarping` defaults to `true` for `--backend mlx-vlm-server`
- the sample batch config file now reflects those same defaults

### Recent MLX OCR quality adjustments:

- the previous sample config used `max_new_tokens: 192`, which was too low for dense Chinese document pages and large HTML table outputs
- the current sample config now uses `max_new_tokens: 768` to reduce premature truncation during table-heavy extraction
- Paddle document preprocessing flags are now exposed directly in the batch CLI so camera-captured pages can be corrected before recognition:
  - `--use-doc-orientation-classify`
  - `--use-doc-unwarping`
- for `mlx-vlm-server` runs, both preprocessing flags now default to `true`
- these changes are intended to improve difficult inputs such as phone photos with perspective distortion, uneven lighting, and dense tables

If you use a local MLX server such as `http://localhost:8111/`, the batch CLI now automatically sets `NO_PROXY` for `localhost`, `127.0.0.1`, and `::1` before launching the Paddle client. This avoids a common failure where local requests are accidentally routed through a system HTTP proxy.

The CLI prints progress for:

- model loading
- data loading
- per-page inference
- per-job completion time
- final batch summary

By default, batch logs are also saved under `./logs`.

Important:

- this batch CLI always starts from the project runtime at `./.venv`
- when `--backend mlx-vlm-server` is selected, it shells out to the `paddleocr` client in `./.venv_paddle_apple`
- you do **not** need the Apple Silicon Paddle setup below in order to run the current batch CLI, as long as `./.venv` is already working
- you **do** need the Apple Silicon Paddle setup below if you want the `mlx-vlm-server` backend mode
- the Apple Silicon setup below is for the official Paddle `paddleocr[doc-parser] + mlx-vlm` path

## Apple Silicon Paddle Setup

To prepare the official Paddle Apple Silicon dependency stack in a separate environment:

```bash
./scripts/setup_paddle_apple_silicon.sh
```

That creates `.venv_paddle_apple` and installs:

- `paddlepaddle==3.2.1`
- `paddleocr[doc-parser]`
- `mlx-vlm>=0.3.11`

This is a separate environment from `./.venv`.

Use it when you want to test the official Paddle Apple Silicon path from the Paddle docs, especially the `mlx_vlm.server` acceleration flow.

## Run MLX-VLM Server In This Workspace

Activate the dedicated Apple Silicon environment:

```bash
source ./scripts/activate_paddle_apple_env.sh
```

That helper script does two things:

- activates `./.venv_paddle_apple`
- points PaddleX cache into `./.paddlex_cache` so it stays inside this workspace
- auto-loads `./.env.local` if it exists, which is the recommended place to keep a local `HF_TOKEN`

If `mlx_vlm.server` needs to download models from Hugging Face, set your token in a local file that is not committed:

1. create a local env file from the example

```bash
cp .env.local.example .env.local
```

2. edit `./.env.local` and set your token

```bash
export HF_TOKEN="hf_your_real_token_here"
```

Notes:

- `./.env.local` is git-ignored in this project and is the safest recommended place for the token in this workspace
- you do not need to put the token into any Paddle or MLX source code
- the activation script also mirrors `HF_TOKEN` into `HUGGING_FACE_HUB_TOKEN` for compatibility with libraries that look for that variable name

If PaddleX connectivity checks are noisy in your environment, you can optionally add:

```bash
export PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
```

Then start the MLX service:

```bash
mlx_vlm.server --model "$(pwd)/models/PaddleOCR-VL-1.5" --port 8111
```

Keep that terminal open while using the client in another terminal.

## Run PaddleOCR-VL Against MLX-VLM Server

Open a second terminal and activate the same Apple Silicon environment:

```bash
source ./scripts/activate_paddle_apple_env.sh
export PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
```

Then call the official Paddle command-line client:

```bash
paddleocr doc_parser \
  --input ./input/batch1/vl1.54.png \
  --save_path ./outputs/paddle_mlx \
  --vl_rec_backend mlx-vlm-server \
  --vl_rec_server_url http://localhost:8111/ \
  --use_doc_orientation_classify true \
  --use_doc_unwarping true \
  --max_new_tokens 768 \
  --vl_rec_api_model_name "$(pwd)/models/PaddleOCR-VL-1.5"
```

You can replace the input file with a PDF or another image file.

Notes:

- `--save_path` should be an output directory
- Paddle will save results under that directory using the input file basename
- for `PaddleOCR-VL-1.5`, `mlx_vlm.server` should be pointed at the local snapshot directory containing `model.safetensors`; using the repo id `PaddlePaddle/PaddleOCR-VL-1.5` can make the MLX server resolve the Hugging Face cache instead, which caused the missing-safetensors error

## Important Clarification

- the current browser app is still using our local `transformers` runner in `./.venv`
- `batch_paddleocr_jobs.py` now supports both:
  - the local `transformers` runner
  - the official `mlx-vlm-server` path
- starting `mlx_vlm.server` does **not** automatically change the browser app behavior
- the Apple Silicon setup is mainly for:
  - diagnosing performance on Mac
  - comparing the official Paddle path against the current local runner
  - using the new batch CLI MLX mode
