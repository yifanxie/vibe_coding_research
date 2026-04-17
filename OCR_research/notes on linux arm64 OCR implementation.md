# Notes on Linux ARM64 OCR Implementation

**Date**: 2026-04-17

## Purpose

This note summarizes how to think about a Linux ARM64 OCR build for a Raspberry Pi CM5 style target, using the current Apple Silicon PaddleOCR workspace as the starting point.

It also captures a recommended model direction in case PaddleOCR remains difficult to support on Linux ARM64 and the implementation needs to move toward `llama.cpp` and `GGUF` compatible vision models.

## Short Answer

Yes, a Docker-based `linux/arm64` build is useful as a simulation layer for packaging, dependency resolution, and smoke testing.

It is **not** a full simulation of a Raspberry Pi CM5 device.

A Docker ARM64 build can help answer:

- does the software install cleanly on Linux ARM64
- do Python dependencies, model files, and runtime paths resolve correctly
- can the OCR runner process representative images and PDFs
- can the app and batch pipeline be packaged in a repeatable way

It cannot fully answer:

- real inference speed on CM5
- peak RAM pressure on the actual board
- thermal throttling behavior
- board-specific driver, camera, or kernel issues
- real-world stability under sustained edge-device load

## Key Points of Consideration for ARM64 Simulation

### 1. Separate software simulation from hardware validation

The current workspace already shows that runtime behavior depends heavily on the execution backend:

- local Python `transformers` path
- Apple-specific `mlx_vlm.server` path
- app-server orchestration around those runtimes

For Linux ARM64, Docker should be treated as a **software compatibility simulator**, not a **performance simulator**.

### 2. Keep backend assumptions portable

The Apple path in this repo depends on:

- a dedicated `.venv_paddle_apple`
- `paddleocr[doc-parser]`
- `mlx-vlm`
- `mps` / Apple-specific acceleration assumptions

Those parts should not be carried forward into the Linux ARM64 design unchanged.

The reusable pattern is the separation of:

- app/UI layer
- model runtime layer
- model cache / download layer
- batch OCR interface
- output formatting and persistence

### 3. Expect dependency friction on Linux ARM64

Even if Docker succeeds, Linux ARM64 deployment can still fail later because of:

- missing prebuilt wheels
- ARM-specific Python package issues
- slower source builds
- system library mismatches
- larger model memory pressure than expected

This is especially relevant for PaddleOCR, which is already a concern for your ARM64 target.

### 4. Design around smoke tests, not full-scale benchmarks

The first success criterion should be:

- container builds on `linux/arm64`
- model loads
- single image OCR succeeds
- single PDF page OCR succeeds
- Markdown output is written correctly

Only after that should the project test:

- multi-page PDFs
- table-heavy documents
- dense bilingual documents
- long-running batch jobs

### 5. Optimize for a swappable OCR engine

The current codebase already benefits from having an isolated OCR runner and batch entrypoint.

That same structure should be preserved for Linux ARM64 so the engine can be swapped between:

- PaddleOCR-based runtime
- GGUF VLM runtime through `llama.cpp`
- lightweight fallback OCR such as Tesseract or RapidOCR

## What Generalizes from the Apple Silicon Build

The Apple-specific setup should not be copied literally, but several implementation patterns are worth keeping.

### Reusable pattern 1: isolate the OCR runtime

The current workspace separates the web app from the OCR execution environment. That is the right architecture for Linux ARM64 as well.

Generalized version:

- one app/runtime environment for the UI and orchestration
- one dedicated OCR runtime environment or service
- one stable model directory mounted into the runtime

This keeps model and dependency churn away from the rest of the app.

### Reusable pattern 2: keep model cache inside the project boundary

The current setup uses a local cache directory and model directory inside the workspace.

That should generalize to Linux ARM64 as:

- `/app/models`
- `/app/cache`
- `/app/outputs`
- `/app/logs`

This makes Docker images and mounted volumes much easier to reason about.

### Reusable pattern 3: activate environment + machine-local secrets explicitly

The Apple helper script loads:

- the correct virtual environment
- cache environment variables
- `.env.local`
- Hugging Face token aliases

The Linux ARM64 build should do the same with a portable activation or entrypoint pattern:

- activate runtime
- export cache/model paths
- load optional `.env.local`
- map `HF_TOKEN` to any runtime-specific variable names

### Reusable pattern 4: preserve a batch CLI contract

The current `batch_paddleocr_jobs.py` shape is a good abstraction even if the OCR engine changes.

The Linux ARM64 OCR runner should still expose:

- `--input-folder`
- `--output-folder`
- `--backend`
- `--config`
- model path or model identifier
- logging options

This lets the app layer remain stable while the backend evolves.

### Reusable pattern 5: normalize output to Markdown

The most portable contract in this project is not the model, but the output format.

That should remain:

- Markdown-first
- page-aware when needed
- batch-friendly
- saveable to `./outputs`

For ARM64 migration, keeping a stable Markdown output contract is more important than preserving the exact Paddle invocation.

## Generalized Technical Steps for a Linux ARM64 Build with PaddleOCR

Even if PaddleOCR is not the final answer, the current Apple build suggests a useful migration sequence.

### Step 1. Build a dedicated Linux ARM64 runtime image

Create a Docker image that targets `linux/arm64` and includes:

- Python 3.10 or 3.11
- system libraries required for image and PDF handling
- a dedicated virtual environment
- mounted directories for models, cache, logs, inputs, and outputs

The goal here is reproducibility first, not optimization.

### Step 2. Convert Apple-specific assumptions to Linux-safe defaults

Replace:

- `mps` defaults with `cpu`
- Apple-only `mlx-vlm` server assumptions
- Apple environment names such as `.venv_paddle_apple`

With:

- generic runtime names such as `.venv_ocr_arm64`
- Linux ARM64 entrypoint scripts
- CPU-first settings and conservative token limits

### Step 3. Keep OCR execution behind a backend boundary

Retain the current high-level flow:

- app uploads file
- app invokes OCR runner
- OCR runner processes image or PDF
- OCR runner emits Markdown
- app saves outputs and metadata

This boundary makes it easier to replace PaddleOCR later without rewriting the whole stack.

### Step 4. Add a container smoke test

The Linux ARM64 image should have a first-pass smoke test that checks:

- Python imports
- OCR package import
- model path existence
- one sample image inference
- one sample PDF-page inference
- Markdown output write success

This should be the gate for every image build.

### Step 5. Measure memory before scaling document complexity

On ARM64 edge devices, memory is likely to fail before correctness does.

Start by measuring:

- model load time
- resident memory after load
- peak memory on single image OCR
- peak memory on single PDF page OCR

Only after that should the project move to:

- multi-page PDFs
- table-heavy scans
- mixed-language documents

### Step 6. Keep a fallback OCR path

Even if the main engine is a GGUF VLM, a low-cost fallback path is worth preserving for:

- clean printed documents
- failure recovery
- low-memory mode
- fast preflight extraction

That fallback can be a classic OCR engine rather than a VLM.

## Recommendation if PaddleOCR Is Not Viable on Linux ARM64

The table you provided suggests that the best alternatives should be judged against these criteria:

- Linux ARM64 friendliness
- `llama.cpp` / `GGUF` support
- ability to preserve tables and layout
- quality of Markdown output
- reasonable fit for Raspberry Pi CM5 class hardware

### Options from the attached comparison table

#### Research track: PaddleOCR-VL-1.5-GGUF

Also include [`PaddlePaddle/PaddleOCR-VL-1.5-GGUF`](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5-GGUF) as a research option.

Why it is relevant:

- it may offer a bridge between the current PaddleOCR-VL evaluation work and a more portable `GGUF` deployment shape
- it keeps the project closer to the current document-oriented OCR direction
- it is worth testing if the goal is to preserve as much PaddleOCR-VL behavior as possible while exploring a non-standard runtime path

Why it is still a research option rather than the primary recommendation:

- the main deployment risk for this project is still Linux ARM64 practicality, not just file format compatibility
- `GGUF` availability alone does not guarantee clean `llama.cpp` support, acceptable memory use, or good table-to-Markdown behavior on CM5-class hardware
- it should be validated as an experiment alongside the other candidates rather than assumed to solve the Paddle ARM64 compatibility issue by itself

#### 1. GLM-OCR / GLM-4V-OCR

Best fit when the main requirement is structured document extraction, especially:

- tables
- formulas
- complex layouts
- multilingual documents

From your table, this is the strongest direct replacement candidate for PaddleOCR-VL.

Why it stands out:

- strongest structured extraction positioning
- explicit fit for `llama.cpp` GGUF deployment
- closest match to the current document-oriented OCR ambition
- best chance of preserving table structure into Markdown

Primary risk:

- still needs real validation on CM5 memory and speed
- structured extraction quality in practice may depend heavily on prompting and image preprocessing

#### 2. LightOnOCR-1B / RolmOCR variant

Strong candidate when speed and low resource use matter more than maximum structure fidelity.

Why it is attractive:

- lightweight
- good layout awareness
- likely easier on ARM64 hardware

Why it is not my first recommendation for this project:

- the table positions it as a strong lightweight OCR model, but not as clearly the best choice for table reconstruction quality
- likely better as a fast secondary option than as the primary structured-doc engine

#### 3. Qwen3-VL-2B-Instruct

Interesting because it could unify OCR and general reasoning in one model family.

Why it is attractive:

- document understanding plus downstream reasoning
- aligns with your existing Qwen familiarity

Why I would not choose it first for this use case:

- it looks better suited to a broader multimodal assistant role than a focused structured OCR replacement
- on CM5-style hardware, 2B may be harder to justify if the main job is OCR and table-to-Markdown

#### 4. DeepSeek-OCR / Qianfan-OCR

Looks promising for general OCR and noisy documents.

Why it is attractive:

- good real-world document robustness
- potentially strong on messy inputs

Why it is not the lead recommendation here:

- the table does not position it as the strongest option for table-oriented Markdown reconstruction
- it reads more like a general document OCR pick than a structured extraction pick

#### 5. Tesseract 5+ or RapidOCR

Useful as fallback infrastructure, not as the primary answer for this project.

Why to keep it in the stack:

- easy ARM64 story
- low resource usage
- simple recovery path

Why not to lead with it:

- weaker on complex layouts
- table extraction quality is likely behind the VLM-style options
- Markdown output will usually need more post-processing to become clean and useful

## Recommended Model Direction

### Primary recommendation: GLM-OCR / GLM-4V-OCR

Based on the comparison table you attached, `GLM-OCR` is the best primary candidate for a Linux ARM64 OCR path when the target output must handle tables well and export to Markdown cleanly.

It is the best fit because it appears to combine:

- the strongest structured document extraction focus
- `llama.cpp` / `GGUF` deployment compatibility
- multilingual support
- a direct replacement profile for the current PaddleOCR-VL role

For this project, that makes it the most natural candidate to test first for:

- table-to-Markdown output
- scanned PDF pages
- English + Chinese documents
- portable ARM64 deployment

### Secondary recommendation: LightOnOCR-1B as the speed-oriented fallback

If `GLM-OCR` proves too heavy or slow on the actual device, `LightOnOCR-1B` is the best second option to trial next.

It looks like the most credible compromise between:

- speed
- ARM64 fit
- some structure awareness

This would make it a good fallback or low-resource mode.

## Recommendation Specifically for Table Recognition to Markdown

If the highest-priority output requirement is:

- OCR text extraction
- table recognition
- layout preservation
- Markdown export quality

then the recommendation is:

1. Test `GLM-OCR / GLM-4V-OCR` first as the primary structured OCR engine.
2. Keep `LightOnOCR-1B` as a lower-resource backup path.
3. Keep `Tesseract` or `RapidOCR` only as an emergency fallback for basic text extraction.

The practical reason is that table-to-Markdown quality depends less on raw OCR accuracy alone and more on whether the model preserves:

- row and column boundaries
- merged-cell relationships
- reading order
- layout grouping

From your table, `GLM-OCR` is the option most explicitly oriented toward that problem.

## Suggested Next Build Plan

### Phase 1. Containerize the current OCR interface

Build a `linux/arm64` Docker image that packages:

- the app server
- the batch CLI contract
- mounted model/cache/output volumes
- a smoke-test command

Do this even before finalizing the replacement model, because it hardens the deployment shape.

### Phase 2. Swap model runtime behind the same interface

Keep the current app and batch interface stable, but replace the Paddle execution path with:

- a `llama.cpp` compatible OCR backend
- GGUF model loading
- prompt templates tuned for Markdown and table extraction

### Phase 3. Establish a document benchmark set

Before choosing the final model, benchmark with:

- clean printed text
- table-heavy scanned pages
- English/Chinese bilingual documents
- camera-captured pages with distortion
- low-quality or noisy scans

Also include [`PaddlePaddle/PaddleOCR-VL-1.5-GGUF`](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5-GGUF) in the benchmark matrix as a research baseline, especially if you want to measure how much table quality and Markdown structure you would lose or preserve relative to the current Paddle-oriented direction.

### Phase 4. Decide the production stack after real CM5 tests

Use Docker ARM64 for build validation, then use real CM5 hardware for:

- memory viability
- latency
- thermal behavior
- sustained batch stability

## Reference: Current Repo CLI Patterns

The current repository already has a useful command-line style that the new Linux ARM64 implementation should follow.

The main design idea worth preserving is:

- simple top-level commands
- explicit input and output paths
- a `--backend` switch
- optional config file support
- predictable logging behavior

### 1. Current local app entrypoint

Current repo command:

```bash
python3 app.py
```

Recommended equivalent style in the new implementation:

```bash
python3 app.py
```

or, if the ARM64 build later gets its own startup wrapper:

```bash
./scripts/run_ocr_app_arm64.sh
```

### 2. Current batch OCR command using the local runner

Current repo command:

```bash
./.venv/bin/python batch_paddleocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/ \
  --backend transformers \
  --device mps \
  --config ./batch_ocr_config.example.yaml
```

Command style to preserve in the Linux ARM64 implementation:

```bash
./.venv_ocr_arm64/bin/python batch_ocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/arm64_batch \
  --backend gguf \
  --device cpu \
  --config ./batch_ocr_config.yaml
```

Why this shape is good:

- input and output paths are obvious
- backend selection is explicit
- runtime configuration stays externalized
- it remains easy to swap OCR engines without changing the app contract

### 3. Current batch OCR command using an alternate backend service

Current repo command:

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

Command style to preserve in the Linux ARM64 implementation:

```bash
./.venv_ocr_arm64/bin/python batch_ocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/gguf_server_batch \
  --backend llama.cpp-server \
  --server-url http://localhost:8080/ \
  --config ./batch_ocr_config.yaml
```

This pattern is useful if the new implementation separates:

- the OCR server process
- the batch client process
- model serving from document orchestration

### 4. Current Apple environment activation pattern

Current repo command:

```bash
source ./scripts/activate_paddle_apple_env.sh
```

Command style to preserve in the Linux ARM64 implementation:

```bash
source ./scripts/activate_ocr_arm64_env.sh
```

This is worth keeping because it gives one predictable place to:

- activate the correct virtual environment
- load `.env.local`
- set cache directories
- map model download tokens

### 5. Current direct OCR backend invocation pattern

Current repo command:

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

Command style to preserve in the Linux ARM64 implementation:

```bash
ocr_runner parse \
  --input ./input/batch1/vl1.54.png \
  --save-path ./outputs/gguf_ocr \
  --backend gguf \
  --server-url http://localhost:8080/ \
  --max-new-tokens 768 \
  --model "$(pwd)/models/GLM-OCR-GGUF"
```

The exact flags will differ by model backend, but the interface shape should stay familiar:

- one input path
- one output path
- one backend selector
- one model selector
- a small number of inference tuning flags

### 6. Recommended stable CLI contract for the new implementation

To stay close to the current repo, the new Linux ARM64 OCR runner should ideally preserve these flags where possible:

- `--input-folder`
- `--output-folder`
- `--backend`
- `--config`
- `--device`
- `--model-path` or `--model`
- `--capture-logs`
- `--log-dir`

For service-backed modes, add a small number of backend-specific flags such as:

- `--server-url`
- `--api-model-name`
- `--max-new-tokens`

### 7. Suggested example commands for the future implementation

Single-folder batch OCR:

```bash
./.venv_ocr_arm64/bin/python batch_ocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/glm_batch \
  --backend gguf \
  --device cpu \
  --model-path ./models/GLM-OCR-GGUF \
  --config ./batch_ocr_config.yaml \
  --capture-logs
```

Server-backed OCR batch:

```bash
./.venv_ocr_arm64/bin/python batch_ocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/glm_server_batch \
  --backend llama.cpp-server \
  --server-url http://localhost:8080/ \
  --model-path ./models/GLM-OCR-GGUF \
  --config ./batch_ocr_config.yaml
```

Low-resource fallback batch:

```bash
./.venv_ocr_arm64/bin/python batch_ocr_jobs.py \
  --input-folder ./input/batch1 \
  --output-folder ./outputs/fallback_batch \
  --backend rapidocr \
  --device cpu \
  --config ./batch_ocr_config.yaml
```

These examples are intentionally shaped to feel like a continuation of the current repo rather than a completely different toolchain.

## Final Recommendation

Use Docker ARM64 as a packaging and smoke-test layer, not as a final proof of Raspberry Pi viability.

For a non-Paddle Linux ARM64 direction, prioritize `GLM-OCR / GLM-4V-OCR` first if table-aware Markdown output is the main requirement. Keep `LightOnOCR-1B` as the next model to test if device limits make the primary option impractical.

The architecture from the current Apple build that is most worth preserving is not the Apple-specific runtime itself, but the separation between:

- orchestration
- OCR backend
- model/cache paths
- batch CLI
- Markdown output contract

That separation will make the Linux ARM64 transition much easier, regardless of which OCR model wins.
