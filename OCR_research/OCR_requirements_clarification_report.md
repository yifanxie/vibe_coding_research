# Requirements Clarification Report

## 1. Requirement Understanding

This research activity is for the `Private AI` project and focuses on identifying OCR-capable model options that can run within a portable, privacy-preserving, on-device environment.

The phase 1 goal is `standalone OCR output`, not full document Q&A or RAG. The desired solution should support:

- Reading non-text or scan-based PDF documents
- Reading text from common image files
- Handling both printed text and handwritten text
- Operating within the hardware and privacy direction already defined in `./private_AI_specs`

Based on the existing specs and the clarified direction, this work should align with a `private`, `offline-first`, `portable-device` product direction, with the following environments:

- Product target: Raspberry Pi appliance
- Research and pilot target: laptop-based local pilot first
- Likely later hardware classes:
  - Basic portable appliance: Raspberry Pi class device with `8GB` RAM
  - Premium portable appliance: Raspberry Pi class device with `16GB` RAM for higher-quality document intelligence

This clarification report treats the current request as a `research and specification` task, not an implementation task. The goal is to define what must be evaluated and what the OCR subsystem must achieve so that model selection can happen against a clear spec.

## 2. Requirement Confirmation

### 2.1 Functional Requirements

- The system must ingest non-text PDFs, including scanned PDFs and image-heavy PDFs.
- The system must extract readable text from uploaded image files such as `JPG`, `PNG`, and similar common formats.
- Table extraction is explicitly out of scope for phase 1.
- The system must preserve enough document structure for downstream use cases such as search, citation, summarization, and question answering.
- The system must support `English` and `Chinese` in phase 1.
- The system must support both printed text and handwritten text in phase 1.
- The system must support both single-file processing and repeatable evaluation across a benchmark set of representative documents.
- The system must expose extracted text in a usable machine-readable form.
- The system must allow comparison of more than one candidate model or OCR pipeline, rather than assuming a single final model from the start.
- The system should support a balance of accuracy, speed, and hardware fit, rather than optimizing for only one dimension.

### 2.2 Preferred Tech Stack

This section captures currently implied preferences from `./private_AI_specs`, not final implementation commitments.

- Deployment style: offline-capable local appliance or software-only local pilot
- Inference style: on-device processing, no required cloud dependency
- Candidate OCR-capable model families/components currently implied by the specs:
  - `Qwen 3.5 4B` as a small multimodal candidate for portable devices
  - `Qwen 3.5 9B` as a higher-quality multimodal candidate where larger hardware is available
  - `Tesseract` as a lightweight OCR baseline for simple text-heavy documents
- Evaluation should allow `single-model` and `hybrid-pipeline` candidates, because the existing Premium architecture already assumes that complex layouts and tables may need a different path from simple OCR.

### 2.3 Data Scale

- Initial scope is a research dataset rather than full production corpus ingestion.
- The evaluation set should include at minimum:
  - contracts
  - invoices
  - reports
  - forms
  - academic PDFs
  - common image files with text
  - printed-text samples
  - handwritten-text samples
  - English samples
  - Chinese samples
- Existing Premium specs suggest eventual document storage scale up to `100GB`, but that should be treated as future product capacity, not the minimum research dataset.
- Current user/concurrency assumption is likely low during research and prototype stages, likely single-user or very small-team usage.

### 2.4 Performance Requirements

- OCR in the laptop pilot must complete within a user-tolerable time for small and medium documents, while also producing evidence about likely performance on Raspberry Pi-class hardware later.
- The spec should define separate expectations for:
  - single image OCR
  - single scanned PDF
  - handwritten sample OCR
  - mixed English/Chinese OCR
  - batch evaluation runs
- For Premium-tier alignment, indexing or processing a typical `10-page PDF` should remain within the same rough usability expectations already implied in the current specs.
- The research must measure both latency and quality, because the likely tradeoff is:
  - smaller models or OCR engines are faster
  - larger multimodal models are slower but may better understand layout and tables

### 2.5 Quality Standards

- The evaluation must measure text extraction quality, not only whether any text is returned.
- Table extraction quality is not a phase 1 acceptance criterion.
- The evaluation must measure robustness on complex and mixed-media documents.
- The evaluation must include failure analysis for cases such as:
  - low-resolution scans
  - rotated pages
  - handwritten annotations
  - multilingual documents
- The final recommendation should identify:
  - best small-model option
  - best quality-focused option
  - whether a hybrid strategy is required
- The phase 1 recommendation should optimize for `best balance`, meaning acceptable OCR quality with reasonable latency and realistic fit for later Raspberry Pi deployment.

### 2.6 Deployment Environment

- Primary product environment: portable Private AI appliance aligned with current project specs
- Phase 1 research environment: software-only pilot on a laptop for faster evaluation and prototyping
- Baseline hardware assumptions from current specs:
  - `8GB` RAM minimum for the smaller Qwen path
  - `16GB` RAM minimum for the larger document-intelligence path
- Networking assumption: solution should still function when offline

### 2.7 Non-Functional Requirements

- Privacy: document content must stay local to the device unless the project explicitly changes direction
- Portability: the recommended solution must fit a device class that can reasonably be described as portable in the Private AI product context
- Maintainability: the OCR capability should not depend on a brittle or highly manual workflow
- Reliability: the system should degrade gracefully when OCR quality is poor or tables cannot be cleanly reconstructed
- Extensibility: OCR output should remain usable for future RAG, search, and document Q&A features already described in Premium specs
- Transparency: the evaluation should make it clear why one candidate is chosen over another

## 3. Technical Constraints

- The current specs strongly constrain the solution toward `offline`, `on-device`, `private` processing.
- `Qwen 3.5 4B` is the small-model baseline already aligned with the Basic tier architecture.
- `Qwen 3.5 9B` is the higher-quality candidate already aligned with the Premium tier architecture.
- `8GB` RAM is the practical lower bound for the current Qwen-based portable direction.
- `16GB` RAM is the practical lower bound if higher-quality document understanding and RAG-style document intelligence are required.
- OCR requirements are not just simple printed text recognition; they also include handwritten text and bilingual use cases.
- Since table extraction is out of scope for phase 1, the first recommendation can focus more directly on text quality, bilingual robustness, and handwritten handling.

## 4. Non-Technical Constraints

- The work should stay aligned with the existing `Private AI` roadmap rather than introducing a disconnected research direction.
- The outcome must be understandable by product and architecture stakeholders, not only engineers.
- The recommendation should support product tiering if needed, for example:
  - smaller portable baseline
  - higher-quality premium option
- The scope should remain focused on standalone OCR capability, not general model benchmarking across unrelated tasks.

## 5. Candidate Model / Pipeline Scope to Evaluate

This is not a final selection. It is the current shortlist implied by the specs and the user request.

- `Tesseract` baseline
  - Role: lightweight OCR baseline for simple scanned printed text
  - Value: low resource cost, useful benchmark floor
- `Qwen 3.5 4B`
  - Role: smallest currently documented multimodal candidate aligned with portable-device constraints
  - Value: likely strongest fit for a portable private AI baseline if acceptable OCR quality can be achieved across printed and handwritten inputs
- `Qwen 3.5 9B`
  - Role: higher-quality multimodal candidate for better document and mixed-media understanding
  - Value: likely strongest fit when document quality matters more than speed or RAM
- `Hybrid OCR pipeline`
  - Role: route simple pages to lightweight OCR and harder pages to a multimodal model
  - Value: may be the best compromise between speed, device fit, and accuracy

## 6. Recommended Research Deliverables

- A candidate shortlist with clear fit-for-purpose notes
- A benchmark dataset definition for OCR evaluation
- A scoring rubric covering:
  - text extraction accuracy
  - printed-text performance
  - handwritten-text performance
  - English performance
  - Chinese performance
  - latency on target hardware
  - RAM and storage footprint
  - suitability for offline private deployment
- A recommendation memo naming:
  - recommended baseline option
  - recommended premium option
  - whether hybrid routing is required

## 7. Standard Evaluation Approach for Phase 1

The failure-rate target is intentionally still open. For OCR research, the standard approach is usually to evaluate quality at several levels rather than rely on a single pass/fail number.

- `Character Error Rate (CER)`
  - Useful when small transcription mistakes matter, especially for Chinese and mixed-language text
- `Word Error Rate (WER)`
  - Useful for English and other space-delimited languages
- `Document-level exactness`
  - Useful for checking whether a page or file is good enough for practical downstream use
- `Field-level accuracy`
  - Useful for forms, invoices, and contracts when specific fields matter more than full-page transcription perfection
- `Human usability review`
  - Useful for handwritten notes and messy scans where strict automated metrics may miss practical usefulness
- `Latency and resource usage`
  - Needed because the chosen option must still fit the private, portable-device direction

For this project, a balanced evaluation rubric should compare candidates on:

- OCR text quality for printed English
- OCR text quality for printed Chinese
- OCR text quality for handwritten English
- OCR text quality for handwritten Chinese
- Performance across the target document mix:
  - contracts
  - invoices
  - reports
  - forms
  - academic PDFs
- End-to-end latency on the laptop pilot
- Estimated fit for later Raspberry Pi deployment

## 8. Remaining Open Items

- What exact benchmark size should phase 1 use, for example number of files per document type and per language?
- Should the phase 1 benchmark include mixed-language pages with both English and Chinese on the same page?
- Should the recommendation define separate acceptance thresholds for printed vs handwritten OCR?
- How should practical success be defined for the first recommendation:
  - best average score across all document types
  - minimum acceptable score on every category
  - weighted score based on the most important document types
- Should forms and invoices be scored partly at the field level even though table extraction is out of scope?

## 9. Working Assumptions Used in This Draft

- The OCR work is intended to support the existing Private AI appliance roadmap, not a separate cloud product.
- The first serious portable target is a Raspberry Pi appliance, but phase 1 experimentation happens on a laptop-based local pilot first.
- The recommendation should cover both a `small portable baseline` and a `higher-quality premium path`.
- Table extraction is not part of phase 1.
- The requirement includes scanned PDFs and image files as first-class inputs.
- The requirement includes both printed and handwritten text.
- The requirement includes `English` and `Chinese` in phase 1.
- The phase 1 goal is standalone OCR output.
- The recommendation should optimize for `best balance`.

## 10. Clear Spec Draft

The Private AI OCR research activity shall evaluate OCR-capable model or pipeline options using a laptop-based local pilot, with the goal of selecting an approach that can later fit the project's Raspberry Pi appliance direction. Phase 1 shall focus on standalone OCR output for scanned PDFs and common image files, covering both printed and handwritten text in `English` and `Chinese`, across contracts, invoices, reports, forms, and academic PDFs. The output of the research shall identify the best balanced baseline option for small portable hardware, the best higher-quality option for larger local hardware, and whether a hybrid OCR strategy is required to achieve acceptable OCR quality, latency, and private on-device deployment fit.
