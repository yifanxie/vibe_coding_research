# PaddleOCR-VL-1.5 Implementation Recommendation Plan

**Date**: 2026-04-17  
**Project Context**: Private AI OCR laptop pilot, with later Raspberry Pi appliance ambition  
**Primary Model**: `PaddleOCR-VL-1.5`  
**Current Scope**: standalone OCR for scanned PDFs and image files, `English` and `Chinese`, printed and handwritten text

---

## Executive Summary

`PaddleOCR-VL-1.5` is now the strongest implementation path for the OCR pilot because it can already be run locally with real model weights and gives a better long-term product shape than the previous demo fallback path.

The recommended plan is:

1. Stabilize the current laptop-based local implementation
2. Make the UI and saved outputs reflect real Paddle behavior more accurately
3. Add repeatable validation and packaging for offline local use
4. Only then assess portability to Raspberry Pi-class hardware

This plan intentionally keeps `table extraction` out of phase 1, since the current goal is `standalone OCR output`, not full document parsing coverage.

---

## 1. Current State

The current prototype has already crossed an important milestone:

- `PaddleOCR-VL-1.5` can now be downloaded with real local weights
- the app can call the real Paddle runner for OCR
- the browser OCR flow returns Paddle-backed results instead of the previous macOS Vision fallback
- the current implementation supports image OCR and PDF page rendering via local preprocessing

Current implementation files:

- [app.py](/Users/yifanxie/playground/vibe_writing_experiments/research/OCR_research/app.py)
- [scripts/run_paddleocr_vl.py](/Users/yifanxie/playground/vibe_writing_experiments/research/OCR_research/scripts/run_paddleocr_vl.py)
- [scripts/download_hf_snapshot.py](/Users/yifanxie/playground/vibe_writing_experiments/research/OCR_research/scripts/download_hf_snapshot.py)
- [models/PaddleOCR-VL-1.5/modeling_paddleocr_vl.py](/Users/yifanxie/playground/vibe_writing_experiments/research/OCR_research/models/PaddleOCR-VL-1.5/modeling_paddleocr_vl.py)
- [README.md](/Users/yifanxie/playground/vibe_writing_experiments/research/OCR_research/README.md)

Important current limitation:

- Paddle-specific UI options such as `Pretty Markdown` and `Merged document` are stored in the app, but they do not yet change inference behavior

---

## 2. Recommended Architecture Direction

For phase 1, the best architecture is:

- `Frontend`: lightweight HTML/JS OCR workbench
- `App server`: local Python server for model management, upload handling, and result formatting
- `Paddle runtime`: isolated Python runner in `.venv`
- `Model storage`: reusable Hugging Face snapshot directory on local disk
- `Outputs`: Markdown-first OCR output saved into `./outputs`

Recommended principle:

- keep Paddle execution isolated from the web app process

This is the right direction because it:

- reduces coupling between UI and model runtime
- makes debugging and dependency pinning easier
- keeps a clean path for later packaging or replacement
- makes future batch OCR and structured export easier to add

---

## 3. Recommended Implementation Phases

## Phase 1: Stabilize the Laptop Pilot

**Goal**: make the current Paddle-backed OCR path dependable for repeated local use

### Recommended actions

- Freeze the runtime versions used by Paddle
- document the required `.venv` setup explicitly
- keep the model snapshot layout stable
- add stricter startup checks for:
  - `.venv/bin/python`
  - required Python packages
  - required model files
- make the app surface real runtime errors clearly in the UI
- preserve the current fallback separation:
  - Paddle uses real Paddle runtime
  - Qwen remains on its own path

### Why this phase matters

The current implementation works, but it still depends on a manually stabilized environment. That is good enough for development, but not yet good enough for repeatable pilot use.

### Deliverable

- a reproducible laptop setup that can be re-created without trial-and-error

---

## Phase 2: Align UX With Real Paddle Behavior

**Goal**: make the demo feel honest and useful now that the backend is real

### Recommended actions

- update result metadata to explicitly show Paddle runtime backend used
- mark Paddle options as either:
  - `active`
  - or `saved but not yet applied`
- prioritize wiring the simplest real option first:
  - `Pretty Markdown` formatting behavior
- leave `Merged document` vs `Per page` as the next backend-backed feature after that
- update saved Markdown headers to include:
  - model name
  - backend used
  - file processed
  - processing timestamp

### Why this phase matters

The current UX is close, but some controls still imply capabilities that are not fully wired. Tightening that gap will improve trust and reduce confusion during pilot feedback.

### Deliverable

- a UI that clearly reflects what Paddle is actually doing today

---

## Phase 3: Add Validation and Operational Readiness

**Goal**: turn the prototype into a pilot tool that is safe to run repeatedly

### Recommended actions

- add a `smoke test` command for:
  - runtime import
  - model load
  - one sample image inference
- add a small local benchmark folder with representative files:
  - scanned PDF
  - image text sample
  - mixed English/Chinese sample
  - handwritten sample
- log per-run metadata:
  - filename
  - selected model
  - backend
  - processing time
  - success or failure
- add timeout handling for long-running OCR jobs
- add file-size and page-count guardrails
- make output saving robust for repeated runs

### Why this phase matters

This phase creates the operational backbone needed before wider testing or internal sharing. Without it, every failure looks like a one-off mystery.

### Deliverable

- a repeatable, diagnosable OCR pilot environment

---

## Phase 4: Prepare for Portable Appliance Feasibility

**Goal**: evaluate whether this implementation can realistically evolve toward the Raspberry Pi direction

### Recommended actions

- measure memory usage during real OCR inference
- measure latency on:
  - single image
  - single scanned PDF page
  - multi-page PDF
- estimate whether the current runtime is viable on:
  - `16GB` Pi-class device
  - `8GB` Pi-class device
- identify whether a reduced Paddle path, alternate backend, or hybrid route is needed
- separate `portable product fit` from `laptop pilot success`

### Recommendation

Do not assume the current laptop implementation is automatically Raspberry Pi ready. It is better to treat Pi deployment as a separate feasibility checkpoint after the laptop pilot is stable.

### Deliverable

- a clear go/no-go assessment for Raspberry Pi-class deployment

---

## 4. Concrete Recommendations

### Recommendation 1: Keep Paddle as the default OCR model

This remains the right choice because it is now the only path in the prototype using a real OCR model runtime for the targeted document workflow.

### Recommendation 2: Treat the Paddle runtime as a managed subsystem

The `.venv` and model snapshot should be treated as part of the product runtime, not just local developer convenience.

### Recommendation 3: Freeze compatibility instead of chasing latest packages

The current implementation required compatibility fixes. For this project, version stability matters more than always being current.

### Recommendation 4: Prefer a Markdown-first output contract

This aligns well with:

- human review
- later summarization
- downstream indexing
- future RAG/document workflows

### Recommendation 5: Keep phase 1 focused on OCR, not full document intelligence

Do not expand scope yet into:

- table extraction
- structured form extraction
- layout-grounded citation
- full document reconstruction

These should come later, after the OCR base path is stable.

---

## 5. Recommended Near-Term Backlog

Priority order:

1. Add a runtime setup document and dependency lock file
2. Add a `health/smoke test` script for Paddle model load and one inference pass
3. Make UI messaging reflect real Paddle backend usage consistently
4. Wire `Pretty Markdown` as a real applied option
5. Add per-run timing and failure logging
6. Add a small benchmark sample set in the workspace
7. Evaluate memory and latency for multi-page PDFs

---

## 6. Risks and Mitigations

### Risk 1: Runtime fragility

The current stack needed dependency and compatibility fixes.

**Mitigation**:

- pin versions
- document setup
- add smoke tests

### Risk 2: Misleading UI

Some Paddle options are stored but not yet applied.

**Mitigation**:

- label option status clearly
- wire options incrementally

### Risk 3: Large-model portability gap

Laptop success does not guarantee Pi success.

**Mitigation**:

- benchmark before committing to appliance packaging
- keep the option open for a hybrid or reduced-footprint path later

### Risk 4: Slow multi-page document processing

PDF OCR may become too slow for practical use.

**Mitigation**:

- measure page-level timing
- add progress feedback
- consider per-page processing controls

---

## 7. Success Criteria for the Next Iteration

The next iteration should be considered successful if:

- Paddle setup can be reproduced on a clean local environment
- the app consistently uses Paddle weights for OCR when Paddle is selected
- error states are understandable from the UI
- saved Markdown outputs include reliable metadata
- at least one Paddle option begins affecting real output behavior
- small representative OCR samples run successfully end-to-end

---

## 8. Recommended Final Position

The right implementation strategy is to continue investing in `PaddleOCR-VL-1.5` as the primary OCR path for the laptop pilot, while treating the current milestone as `working but not yet hardened`.

The best next move is not adding more features broadly. It is to stabilize the Paddle runtime, make the UI honest about active behavior, and introduce a small but repeatable validation workflow. That will give the project a much stronger base for later structured extraction work and for any serious Raspberry Pi feasibility decision.
