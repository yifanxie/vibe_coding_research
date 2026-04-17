# Architecture Design Document - Premium/Enterprise Tier (Qwen 3.5)

**Scope**: Premium & Enterprise Tiers (Chat/Voice/Vision + Full RAG)  
**Date**: April 8, 2026  
**Models**: Qwen 3.5 9B (Primary), Qwen 3.5 4B (Fast Mode), Qwen 3.5 27B (Enterprise)  
**Based on**: Technical Research Report - Qwen 3.5 Update  

---

## 1. Scope Note

This document extends the Basic Tier architecture (Qwen 3.5 4B) to include:
- **Larger models**: Qwen 3.5 9B for superior quality
- **Full RAG**: ChromaDB vector search + document processing
- **Enterprise**: 24/7 agent, clustering, audit logging

**Key Architectural Change**:
- Vision is now **native to all Qwen 3.5 models** (not a tier differentiator)
- **RAG is now the primary tier differentiator** (document intelligence)
- RAM requirement: **16GB minimum** for Qwen 3.5 9B + RAG

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PREMIUM/ENTERPRISE TIER (Qwen 3.5 + RAG)                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Hardware Layer (16GB RAM)                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ││
│  │  │ Raspberry Pi │  │ 16GB RAM   │  │ 128GB NVMe   │  │ USB Audio    │  ││
│  │  │ CM5 16GB     │  │ (required) │  │ (NVMe SSD)   │  │ 3-mic array  │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐│
│  │                   Data Layer (SQLite + ChromaDB)                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐ ││
│  │  │ SQLite: Conversations, preferences, agent schedules, audit logs    │ ││
│  │  │ ChromaDB: Document embeddings, vector search, semantic index       │ ││
│  │  │ File System: PDFs, images, documents (up to 100GB)               │ ││
│  │  └────────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐│
│  │                   AI Runtime Layer (Premium Models)                       ││
│  │  ┌────────────────────────────────────────────────────────────────────┐ ││
│  │  │ llama.cpp (Primary)                                                │ ││
│  │  │  ├── Model: Qwen 3.5 9B Q4_K_M (~5.8GB) - Quality mode            │ ││
│  │  │  ├── Model: Qwen 3.5 4B Q4_K_M (~2.9GB) - Fast mode               │ ││
│  │  │  ├── Chat Template: qwen                                         │ ││
│  │  │  ├── Vision: Native (MMMU-Pro: 70.1)                             │ ││
│  │  │  └── Port: 8081                                                  │ ││
│  │  │                                                                    │ ││
│  │  │ whisper.cpp (STT) + Piper (TTS)                                │ ││
│  │  │ OCR Pipeline (Tesseract + optional LLM-based)                    │ ││
│  │  └────────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐│
│  │                   Premium-Only Services                                   ││
│  │  ┌────────────────────────────────────────────────────────────────────┐ ││
│  │  │ RAG Pipeline                                                       │ ││
│  │  │  ├── Document Ingestion: PDF, DOCX, images                        │ ││
│  │  │  ├── OCR: Tesseract / Qwen vision for complex layouts           │ ││
│  │  │  ├── Chunking: Recursive text splitting                         │ ││
│  │  │  ├── Embedding: all-MiniLM-L6-v2 (ONNX)                         │ ││
│  │  │  ├── Vector Store: ChromaDB (local)                             │ ││
│  │  │  └── Search: Hybrid (semantic + keyword)                        │ ││
│  │  │                                                                    │ ││
│  │  │ 24/7 Agent Scheduler                                              │ ││
│  │  │  ├── Time-based triggers (cron-like)                            │ ││
│  │  │  ├── File system watchers                                         │ ││
│  │  │  ├── Webhook/API triggers                                        │ ││
│  │  │  └── Background processing queue                                  │ ││
│  │  │                                                                    │ ││
│  │  │ Enterprise Extensions (Enterprise tier only)                        │ ││
│  │  │  ├── Audit logging (immutable)                                   │ ││
│  │  │  ├── SIEM integration (syslog)                                  │ ││
│  │  │  ├── RBAC (multi-user support)                                   │ ││
│  │  │  └── Clustering (federated search across devices)                │ ││
│  │  └────────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐│
│  │                   PWA Interface (Premium Features)                        ││
│  │  ├── Document Management: Upload, organize, delete                      ││
│  │  ├── RAG Chat: "Ask your documents" with citations                     ││
│  │  ├── Agent Configuration: Schedule, triggers, workflows                 ││
│  │  ├── Model Selection: 4B (fast) vs 9B (quality)                         ││
│  │  ├── Vision Analysis: Batch image processing                          ││
│  │  └── Admin: Audit logs, user management (Enterprise)                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Premium AI Runtime (Qwen 3.5)

### 3.1 Dual-Model Strategy

**Strategy**: Offer both 4B (fast) and 9B (quality) models, user-switchable

```yaml
# /etc/private-ai/premium-models.yaml

fast_mode:
  id: "qwen-3.5-4b"
  name: "Qwen 3.5 4B - Fast"
  gguf: "/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf"
  ram_required_gb: 4.5
  inference_speed: "22 tok/s"
  use_case: "Quick chat, simple Q&A, mobile use"
  
quality_mode:
  id: "qwen-3.5-9b"
  name: "Qwen 3.5 9B - Quality"
  gguf: "/models/Qwen_Qwen3.5-9B-Q4_K_M.gguf"
  ram_required_gb: 8.5
  inference_speed: "12 tok/s"
  use_case: "Complex reasoning, document analysis, coding"
  mmlu_pro: 82.5  # Beats GPT-120B
  mmmu_pro: 70.1  # Superior visual reasoning
  
enterprise_option:
  id: "qwen-3.5-27b"
  name: "Qwen 3.5 27B - Maximum"
  note: "Requires 24GB+ RAM, cloud-connected or enterprise hardware"
  available: false  # Future expansion
```

### 3.2 Qwen 3.5 9B Specifications

| Specification | Value | Comparison |
|--------------|-------|------------|
| **Parameters** | 9B | Dense transformer |
| **GGUF Size (Q4_K_M)** | ~5.8 GB | 2× larger than 4B |
| **RAM Required** | ~8.5 GB | Needs 16GB Pi |
| **Inference Speed** | 10-14 tok/s | Slower but higher quality |
| **MMLU-Pro** | **82.5%** | Beats GPT-OSS-120B (80.8%) |
| **MMMU-Pro Vision** | **70.1** | Professional-grade vision |
| **MathVision** | **88.6** | Exceeds GPT-5.2 |
| **Languages** | 201 | Global coverage |
| **License** | Apache 2.0 | Full commercial use |

### 3.3 Model Hot-Swapping

**Implementation**: Allow switching 4B ↔ 9B without restart

```python
class ModelManagerPremium:
    """Manage multiple Qwen 3.5 models with hot-swapping"""
    
    async def switch_model(self, target_model_id: str) -> SwitchResult:
        current = self.get_loaded_model()
        target = MODEL_REGISTRY[target_model_id]
        
        # Check if we can fit both temporarily
        if current and target.ram_required_gb + current.ram_required_gb > TOTAL_RAM_GB:
            # Must unload current first
            await self.unload_model(current.id)
        
        # Load new model
        await self.load_model(target_model_id)
        
        return SwitchResult(
            from_model=current.id if current else None,
            to_model=target_model_id,
            downtime_seconds=3.5  # Load time
        )
```

---

## 4. RAG Architecture (ChromaDB + Qwen 3.5)

### 4.1 Document Processing Pipeline

```
User Upload (PDF/Image) → OCR → Text Extraction → Chunking → Embeddings → ChromaDB
                              ↓
                    Qwen 3.5 Vision (for complex layouts)
```

**OCR Options**:

| Method | Speed | Quality | Use When |
|--------|-------|---------|----------|
| Tesseract | Fast | Good | Simple text PDFs |
| Qwen 3.5 Vision | Medium | Excellent | Complex layouts, tables, mixed media |
| Hybrid | Balanced | Best | Automatic selection based on content |

### 4.2 Chunking Strategy

```python
# Premium chunking with Qwen 3.5 context awareness
CHUNK_CONFIG = {
    "chunk_size": 512,        # tokens
    "chunk_overlap": 50,      # tokens
    "separator": "\n\n",      # Paragraph break
    "max_chunk_size": 1024,   # For long documents
    
    # Qwen-specific: Use vision for image-heavy documents
    "vision_chunking": True,  # Extract text from images in PDFs
}
```

### 4.3 Embedding + Search

```python
# Embedding model (lightweight, runs on CPU)
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

# ChromaDB configuration
CHROMADB_CONFIG = {
    "collection_name": "documents",
    "embedding_function": ONNXEmbedding(),  # Optimized for ARM
    "distance_metric": "cosine",
}

# Hybrid search (Premium feature)
class HybridSearcher:
    def search(self, query: str, filters: dict = None):
        # Semantic search via embeddings
        semantic_results = self.chroma_db.similarity_search(query, k=10)
        
        # Keyword search for exact matches
        keyword_results = self.keyword_search(query, filters)
        
        # Combine and rerank
        return self.rerank_hybrid(semantic_results, keyword_results)
```

### 4.4 RAG Chat with Qwen 3.5

```python
# RAG-augmented chat using Qwen 3.5
async def rag_chat(user_query: str, conversation_history: list):
    # 1. Search documents
    search_results = await hybrid_searcher.search(user_query, top_k=5)
    
    # 2. Build context with citations
    context = ""
    citations = []
    for i, result in enumerate(search_results):
        context += f"\n[Document {i+1}]: {result.text}\n"
        citations.append({
            "number": i+1,
            "source": result.metadata.source,
            "page": result.metadata.page
        })
    
    # 3. Format for Qwen
    system_prompt = f"""<|im_start|>system
You are a helpful assistant analyzing documents. Use the provided context to answer.
If the answer isn't in the context, say so.
Context: {context}
---

<|im_start|>user
{user_query}

<|im_start|>assistant
"""
    
    # 4. Generate with Qwen 3.5 9B
    response = await llama_client.complete(system_prompt)
    
    # 5. Add citations to response
    response_with_citations = add_citation_markers(response, citations)
    
    return {
        "response": response_with_citations,
        "citations": citations,
        "sources": [c["source"] for c in citations]
    }
```

---

## 5. Extended SQLite Schema (Premium)

### 5.1 Documents Table

```sql
-- Document metadata and processing status
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_path TEXT,
    file_size_bytes INTEGER,
    mime_type TEXT,
    
    -- Processing status
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    processing_status TEXT, -- 'pending', 'ocr', 'chunking', 'indexed', 'error'
    processing_error TEXT,
    
    -- Document metadata
    page_count INTEGER,
    word_count INTEGER,
    language_detected TEXT,
    
    -- User metadata
    tags TEXT, -- JSON array
    category TEXT,
    notes TEXT,
    
    -- RAG metadata
    chunk_count INTEGER,
    indexed_timestamp DATETIME,
    last_queried DATETIME
);
```

### 5.2 Agent Schedule Table

```sql
-- 24/7 Agent triggers and schedules
CREATE TABLE agent_schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    
    -- Trigger type
    trigger_type TEXT, -- 'time', 'file_watch', 'webhook', 'startup'
    
    -- Time-based (cron-like)
    cron_expression TEXT, -- "0 8 * * *" = 8am daily
    
    -- File watch
    watch_path TEXT,
    watch_pattern TEXT, -- "*.pdf"
    
    -- Action
    action_type TEXT, -- 'summarize', 'index', 'notify', 'custom'
    action_config TEXT, -- JSON
    
    -- Status
    enabled BOOLEAN DEFAULT 1,
    last_run DATETIME,
    next_run DATETIME,
    run_count INTEGER DEFAULT 0
);
```

### 5.3 Audit Log (Enterprise)

```sql
-- Immutable audit trail (Enterprise only)
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Actor
    user_id TEXT, -- For multi-user (Enterprise)
    session_id TEXT,
    client_ip TEXT,
    
    -- Action
    action_type TEXT, -- 'chat', 'document_upload', 'model_switch', 'login'
    resource_type TEXT, -- 'conversation', 'document', 'model'
    resource_id TEXT,
    
    -- Details (sanitized)
    request_summary TEXT, -- No PII
    response_summary TEXT,
    tokens_used INTEGER,
    
    -- Integrity (Enterprise)
    hash_chain TEXT -- Link to previous record for tamper detection
);
```

---

## 6. ChromaDB Schema

### 6.1 Collections

```python
# Collection: document_chunks
{
    "name": "document_chunks",
    "metadata": {
        "embedding_model": "all-MiniLM-L6-v2",
        "embedding_dim": 384,
        "distance": "cosine"
    }
}

# Document in collection
{
    "id": "chunk_001_doc_123",
    "document": "The quick brown fox...",
    "metadata": {
        "doc_id": "doc_123",
        "filename": "contract.pdf",
        "chunk_index": 0,
        "page": 1,
        "total_pages": 10,
        "source_type": "pdf",
        "indexed_at": "2026-04-08T10:30:00Z"
    },
    "embedding": [0.023, -0.045, ...]  # 384-dim vector
}

# Collection: query_cache (optional optimization)
{
    "name": "query_cache",
    "metadata": {
        "description": "Cache frequent queries for faster RAG"
    }
}
```

---

## 7. Premium API Endpoints

### 7.1 Extended Endpoints

| Endpoint | Method | Description | Tier |
|----------|--------|-------------|------|
| `/v1/rag/chat` | POST | Chat with document citations | Premium+ |
| `/v1/rag/search` | POST | Semantic search across documents | Premium+ |
| `/v1/documents` | GET/POST/DELETE | Document management | Premium+ |
| `/v1/documents/{id}/index` | POST | Trigger (re)indexing | Premium+ |
| `/v1/agent/schedules` | GET/POST | 24/7 Agent configuration | Premium+ |
| `/v1/agent/triggers` | POST | Manual trigger agent | Premium+ |
| `/v1/admin/audit` | GET | Audit log (Enterprise) | Enterprise |
| `/v1/admin/users` | GET/POST | User management (Enterprise) | Enterprise |

### 7.2 RAG Chat Request/Response

```python
# Request
class RAGChatRequest:
    model: str = "qwen-3.5-9b"  # Premium: use 9B for quality
    messages: List[Message]
    search_context: bool = True  # Enable RAG
    max_citations: int = 5
    filters: Optional[DocumentFilter]  # Filter by date, tag, etc.

# Response
class RAGChatResponse:
    id: str
    model: str
    choices: List[Choice]
    citations: List[Citation]  # NEW: Document citations
    usage: TokenUsage
    search_metadata: SearchMetadata  # NEW: Query performance

class Citation:
    number: int
    source: str  # "document_name.pdf"
    page: int
    text_snippet: str
    relevance_score: float
```

---

## 8. PWA Premium Extensions

### 8.1 Document Management UI

```javascript
// Document upload with progress
class DocumentManager {
  async uploadDocuments(files) {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload with progress tracking
      const response = await fetch('/v1/documents', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progress) => {
          this.updateProgress(file.name, progress);
        }
      });
      
      // Auto-index after upload
      const doc = await response.json();
      await this.indexDocument(doc.id);
    }
  }
  
  async indexDocument(docId) {
    // Show "Indexing..." with Qwen 3.5 OCR progress
    await fetch(`/v1/documents/${docId}/index`, {
      method: 'POST'
    });
  }
}
```

### 8.2 RAG Chat Interface

```javascript
// Chat with citations
class RAGChatInterface {
  renderMessageWithCitations(message) {
    const parts = message.content.split(/\[Citation (\d+)\]/g);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // It's a citation number
        const citation = message.citations[parseInt(part) - 1];
        return `<sup class="citation" title="${citation.source} p.${citation.page}">[${part}]</sup>`;
      }
      return part;
    }).join('');
  }
  
  async sendRAGQuery(query) {
    const response = await fetch('/v1/rag/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: 'qwen-3.5-9b',  // Premium: use quality model
        messages: [{ role: 'user', content: query }],
        search_context: true,
        max_citations: 5
      })
    });
    
    const data = await response.json();
    this.displayResponse(data.choices[0].message, data.citations);
  }
}
```

### 8.3 Model Selector (Premium)

```html
<!-- Model toggle: Fast vs Quality -->
<div class="model-selector">
  <button class="model-btn active" data-model="qwen-3.5-4b">
    <span class="model-name">Fast</span>
    <span class="model-desc">Qwen 3.5 4B • 22 tok/s</span>
  </button>
  <button class="model-btn" data-model="qwen-3.5-9b">
    <span class="model-name">Quality</span>
    <span class="model-desc">Qwen 3.5 9B • 12 tok/s • Best for RAG</span>
  </button>
</div>
```

---

## 9. Enterprise Extensions

### 9.1 Audit & Compliance

```python
# Enterprise audit system
class AuditLogger:
    def log(self, event: AuditEvent):
        # Calculate hash chain for tamper resistance
        previous_hash = self.get_last_hash()
        event_hash = self.calculate_hash(event, previous_hash)
        
        db.execute("""
            INSERT INTO audit_logs 
            (timestamp, user_id, action_type, resource_type, 
             request_summary, tokens_used, hash_chain)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now(),
            event.user_id,
            event.action_type,
            event.resource_type,
            self.sanitize(event.request),
            event.tokens_used,
            event_hash
        ))
        
        # Forward to SIEM if configured
        if SIEM_CONFIG:
            self.forward_to_siem(event)
```

### 9.2 Clustering (Multi-Device)

```python
# Enterprise: Federated search across multiple AI devices
class ClusterManager:
    def federated_search(self, query: str):
        # Query all nodes in cluster
        results = []
        for node in self.discover_nodes():
            node_results = node.search_local(query)
            results.extend(node_results)
        
        # Merge and deduplicate
        return self.merge_results(results)
```

---

## 10. Configuration - Premium Additions

```yaml
# /etc/private-ai/premium.conf

# RAG Configuration
rag:
  embedding_model: "sentence-transformers/all-MiniLM-L6-v2"
  embedding_backend: "onnx"  # Optimized for ARM
  chunk_size: 512
  chunk_overlap: 50
  top_k_search: 5
  
  # OCR options
  ocr:
    primary: "tesseract"
    fallback: "qwen-vision"  # Use Qwen 3.5 for complex layouts
    auto_select: true
  
  # ChromaDB
  vector_store:
    path: "/data/chromadb"
    anonymized_telemetry: false

# Agent Configuration
agent:
  enabled: true
  max_concurrent_jobs: 3
  default_timezone: "UTC"
  
# Enterprise
enterprise:
  audit_logging: true
  audit_retention_days: 2555  # 7 years
  siem_endpoint: null  # Configure for integration
  rbac_enabled: false
  max_users: 1  # Unlimited in Enterprise
```

---

## 11. Migration from Basic to Premium (Qwen 3.5)

### 11.1 Data Migration

```bash
# 1. Backup Basic tier data
sudo cp -r /data/basic /backup/basic-$(date +%Y%m%d)

# 2. Install Premium packages
sudo apt install -y tesseract-ocr tesseract-ocr-eng
pip install chromadb sentence-transformers

# 3. Download Qwen 3.5 9B
wget https://huggingface.co/bartowski/Qwen_Qwen3.5-9B-GGUF/resolve/main/Qwen_Qwen3.5-9B-Q4_K_M.gguf

# 4. Initialize ChromaDB
python3 -c "import chromadb; client = chromadb.PersistentClient(path='/data/chromadb')"

# 5. Re-index existing documents (if any)
curl -X POST http://localhost:8000/v1/documents/reindex-all

# 6. Update configuration
sudo tee /etc/private-ai/tier <<EOF
PREMIUM
EOF
```

### 11.2 User Experience

**Upgrade Path**:
1. User purchases Premium license (unlocks 9B model + RAG)
2. System downloads Qwen 3.5 9B (~5.8GB)
3. ChromaDB initializes
4. "Documents" tab appears in PWA
5. User can now upload PDFs and ask questions

---

## 12. Testing - Premium Qwen 3.5

### 12.1 RAG Testing

- [ ] Upload 10-page PDF → Index in <30 seconds
- [ ] Query: "What does section 3 say?" → Returns accurate answer with citation
- [ ] Upload image-heavy PDF → Qwen 3.5 Vision OCR activates
- [ ] Search 100 documents → <500ms response time
- [ ] Test citation accuracy → Verify page numbers correct

### 12.2 Vision Quality Testing

- [ ] Chart interpretation with 4B vs 9B → 9B noticeably better
- [ ] Handwritten text → Qwen 3.5 Vision superior to Tesseract
- [ ] Multi-page document flow → Maintains context across pages

### 12.3 Agent Testing

- [ ] Schedule daily summary → Executes at correct time
- [ ] Watch folder for PDFs → Auto-indexes within 5 seconds
- [ ] Trigger webhook → Agent responds to external events

---

## 13. Items to Confirm - Premium Qwen

### Technical

1. **Embedding model**: all-MiniLM-L6-v2 sufficient or upgrade to larger?
2. **OCR strategy**: Default to Tesseract or Qwen 3.5 Vision for all?
3. **Chunk size**: 512 tokens optimal for Qwen 3.5 context?

### Product

1. **Vision tiering**: Market 4B vision as "good" and 9B as "excellent"?
2. **RAG storage limits**: Per-user or shared pool in Enterprise?
3. **Agent pricing**: Include in Premium or Enterprise-only feature?

---

## 14. Key Differentiators (Revised)

| Feature | Basic Tier | Premium Tier | Enterprise |
|---------|-----------|--------------|------------|
| **Vision** | ✅ Qwen 3.5 4B (Good) | ✅ Qwen 3.5 9B (Excellent) | ✅ Qwen 3.5 9B + Custom |
| **RAG** | ❌ No documents | ✅ ChromaDB + 100GB | ✅ Unlimited + Federated |
| **Agent** | ❌ None | ✅ 24/7 scheduling | ✅ Multi-agent |
| **Audit** | ❌ None | ❌ None | ✅ Immutable logs |

**Major Change**: Vision is now universal (all tiers), making **RAG the primary tier differentiator**.

---

*Document Version: 2.0-Qwen-Premium*  
*Primary Model: Qwen 3.5 9B (Quality) / 4B (Fast)*  
*RAG: ChromaDB + Qwen 3.5 Vision OCR*  
*Key Differentiator: Document Intelligence (not Vision)*
