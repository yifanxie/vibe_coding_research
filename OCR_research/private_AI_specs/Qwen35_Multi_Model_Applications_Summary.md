# Private AI Appliance — Multi-Model Summary (Qwen 3.5)

**Purpose**: Consolidate model inventory from architecture/research documents and extension opportunities for Basic vs Premium tiers.  
**Sources**: `02_Technical_Research_Report_Qwen35.md`, `03_Architecture_Design_Document_BASIC_Qwen35.md`, `03_Architecture_Design_Document_PREMIUM_Qwen35.md`.

---

## 1. Models required (as documented)

### Technical research report (high level)


| Tier        | Named models / components                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic**   | **Qwen 3.5 4B** (Q4_K_M, native vision); **Whisper Base**; **Piper TTS**                                                                      |
| **Premium** | **Qwen 3.5 9B** (Q4_K_M, native vision); **Whisper**; **Piper TTS**; RAG via ChromaDB + corpus (embedding model **not** named in this report) |


### Basic tier architecture (chat + voice + vision, no RAG)


| Role           | Model                                                            |
| -------------- | ---------------------------------------------------------------- |
| Chat + vision  | **Qwen 3.5 4B** (GGUF Q4_K_M, Qwen chat template, native vision) |
| Speech-to-text | **whisper.cpp — Base**                                           |
| Text-to-speech | **Piper**                                                        |
| Optional       | **Qwen 3.5 9B** (download / switch where RAM allows)             |


**Default multi-model stack**: Qwen 3.5 4B + Whisper Base + Piper.

### Premium / Enterprise architecture (chat + voice + vision + RAG + OCR + agents)


| Role            | Model / component                                                                           |
| --------------- | ------------------------------------------------------------------------------------------- |
| Quality LLM/VLM | **Qwen 3.5 9B**                                                                             |
| Fast LLM/VLM    | **Qwen 3.5 4B** (user-switchable / hot-swap with 9B)                                        |
| Speech-to-text  | **whisper.cpp**                                                                             |
| Text-to-speech  | **Piper**                                                                                   |
| RAG embeddings  | **sentence-transformers/all-MiniLM-L6-v2** (ONNX on ARM)                                    |
| OCR             | **Tesseract** (primary); **Qwen vision** (same Qwen weights) for complex layouts / fallback |
| Future option   | **Qwen 3.5 27B** (documented as future; not enabled in sample config)                       |


**Premium multi-model stack**: Qwen 9B + Qwen 4B + Whisper + Piper + MiniLM + Tesseract, with Qwen vision on the OCR path.

---

## 2. Other multi-model applications (by tier)

### Basic tier (≈8GB RAM, no RAG in spec)

Fits **ASR → LLM (± vision) → TTS** or **vision → LLM** pipelines. Optional tiny add-ons (wake word, VAD) are plausible if productized; not required by current docs.


| Pattern                      | Pipeline                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| Hands-free assistant         | Optional wake/VAD + Whisper + Qwen + Piper                           |
| Interpreter / translation    | Whisper → Qwen (translate) → Piper                                   |
| Meeting / lecture capture    | Whisper → Qwen (summary, actions, chapters)                          |
| Photo / receipt / label QA   | Image → Qwen vision; optional Piper readout                          |
| Low-vision scene description | Camera → Qwen vision → Piper                                         |
| Language tutoring            | Whisper (learner audio) → Qwen (feedback) → Piper                    |
| Light memo search            | Whisper transcripts + keyword/BM25 (no embedding stack unless added) |


Large **semantic document libraries** are a poor fit for Basic as specified (no Chroma/RAG layer in the Basic architecture doc).

### Premium tier (≈16GB RAM, RAG, OCR, agents)

Adds **retrieve → (OCR/layout) → reason → cite → (optional) speak** over corpora.


| Pattern                          | Pipeline                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| General RAG / “ask my library”   | MiniLM embeddings + ChromaDB + Qwen 9B                      |
| Messy / scan-heavy PDFs          | Tesseract and/or Qwen vision → chunk → embed → Qwen Q&A     |
| Scheduled digest / watch folder  | Agent → ingest → OCR/embed → Qwen summary / notify / Piper  |
| Policy / compliance Q&A          | Hybrid search + Qwen with cite-or-refuse behavior           |
| Multimodal knowledge base        | Qwen vision on figures → text chunks → MiniLM → Qwen chat   |
| Field SOP / troubleshooting      | Qwen vision (equipment photo) + RAG (manuals) + Qwen answer |
| Contract / dual-document compare | Multi-doc RAG + Qwen 9B reasoning                           |


### Not casual on current hardware

- Always-on **multiple large LLMs** (e.g. 9B + 27B + separate huge code model) without unload/swap.
- **Heavy rerankers** or always-on **judge** models: possible only with strict load/unload discipline; harder on Basic.
- **Rich diarization** for many speakers: typically needs specialized models beyond Whisper alone.

---

## 3. One-line positioning

- **Basic**: Strong for **voice + vision + chat** and simple **audio → text → speech** products.  
- **Premium**: Same plus **document intelligence** (embed, retrieve, OCR/layout, agents)—suited to knowledge work, ops, and compliance-style use cases.

---

*Written from product/architecture notes; hardware figures follow the referenced Qwen 3.5 documents.*