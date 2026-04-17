# Architecture Design Document - Basic Tier (Qwen 3.5)

**Scope**: Basic Tier Only (Chat/Voice/Vision - No RAG)  
**Date**: April 8, 2026  
**Models**: Qwen 3.5 4B (Primary), Qwen 3.5 9B (Premium Upgrade)  
**Based on**: Technical Research Report - Qwen 3.5 Update  

---

## 1. Scope Note

This document covers the **Basic Tier** architecture using **Qwen 3.5 models**.

**Key Change from Previous Version**:
- **Vision is now included in Basic tier** (all Qwen 3.5 models have native multimodal capabilities)
- RAM requirement increased to **8GB minimum** (vs 4GB with Llama 3.2 3B)
- Chat template changed to **Qwen format** (not Llama 3)

For RAG features, see `03_Architecture_Design_Document_PREMIUM_Qwen35.md`.

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BASIC TIER (Qwen 3.5)                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Hardware Layer                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │ Raspberry Pi │  │ 8GB RAM      │  │ 64GB eMMC        │ │ │
│  │  │ CM5 Module   │  │ (required)   │  │ (min storage)    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │ WiFi 6       │  │ Bluetooth 5.2│  │ LED + Button     │ │ │
│  │  │ (AP mode)    │  │ (BLE beacon) │  │ (no display)     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────┼──────────────────────────────────┐ │
│  │                   System Layer (Alpine Linux)              │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ Hostapd + DNSMASQ (WiFi AP: PrivateAI-XXXX)           ││ │
│  │  │ Nginx (PWA static files + reverse proxy)              ││ │
│  │  │ FastAPI (OpenAI-compatible API server)                ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  └────────────────────────┼──────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────┼──────────────────────────────────┐ │
│  │                   AI Runtime Layer                           │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ llama.cpp server (with ARM NEON optimizations)         ││ │
│  │  │  ├── Model: Qwen 3.5 4B Q4_K_M (~2.87GB)              ││ │
│  │  │  ├── Chat Template: Qwen (not Llama3)                 ││ │
│  │  │  ├── Port: 8081 (localhost only)                      ││ │
│  │  │  ├── Context: 4096 tokens                           ││ │
│  │  │  └── Vision: Native (all Qwen 3.5 models)            ││ │
│  │  │                                                       ││ │
│  │  │ whisper.cpp (STT - Base model)                        ││ │
│  │  │ Piper TTS (text-to-speech)                            ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  └────────────────────────┼──────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────┼──────────────────────────────────┐ │
│  │                   PWA Interface Layer                        │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ Served at 192.168.4.1 (captive portal)                ││ │
│  │  │  ├── Chat Interface (streaming)                      ││ │
│  │  │  ├── Model Manager (download, switch)                 ││ │
│  │  │  ├── Vision Input (camera/photo upload)              ││ │
│  │  │  ├── Voice Input (Web Speech API)                    ││ │
│  │  │  └── Settings (temperature, system prompt)           ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Breakdown

### 3.1 Hardware Module

**Platform**: Raspberry Pi CM5 8GB (minimum)

| Component | Specification | Notes |
|-----------|--------------|-------|
| **SoC** | BCM2712 (ARM Cortex-A76) | Quad-core 2.4GHz |
| **RAM** | **8GB LPDDR4X** (required) | Qwen 3.5 4B needs 4GB+ for model |
| **Storage** | **64GB eMMC** (minimum) | Model (2.9GB) + OS (3GB) + user data |
| **WiFi** | Dual-band 802.11ac | AP mode for zero-setup |
| **Bluetooth** | 5.2 BLE | Beacon + optional pairing |
| **GPIO** | 28-pin | LED, button, optional sensors |
| **Power** | 5V 5A USB-C | 27W for stable operation |
| **Audio** | I2S or USB audio | MEMS mic + speaker amp |

**Physical Interface**:
- **Status LED**: RGB tri-color (power, WiFi, AI activity)
- **Multi-function button**: Power on/off, wake/sleep, reset
- **No touchscreen**: All interaction via PWA on user's device

### 3.2 Network Module (Hostapd + DNSMASQ)

```yaml
WiFi AP Configuration:
  SSID: "PrivateAI-XXXX" (where XXXX = last 4 of MAC)
  Password: "privateai2026" (or unique per device)
  Channel: 6 (2.4GHz) or 36 (5GHz)
  IP Range: 192.168.4.2 - 192.168.4.50
  Gateway: 192.168.4.1 (device itself)
  
Captive Portal:
  Detection URLs: captive.apple.com, connectivitycheck.gstatic.com
  Redirect: All HTTP → 192.168.4.1/index.html
  
DNS:
  Local: private-ai.local → 192.168.4.1
  Fallback: None (offline-only by default)
```

### 3.3 AI Runtime Module (llama.cpp)

**Primary Model**: Qwen 3.5 4B Q4_K_M

**Launch Configuration**:
```bash
./llama-server \
  -m /models/Qwen_Qwen3.5-4B-Q4_K_M.gguf \
  --port 8081 \
  --host 127.0.0.1 \
  -c 4096 \
  -n 512 \
  --temp 0.7 \
  --top-p 0.9 \
  --repeat-penalty 1.1 \
  --chat-template qwen \
  --vision-model  # Native vision enabled
```

**Key Parameters**:
| Flag | Value | Purpose |
|------|-------|---------|
| `-c 4096` | 4096 tokens | Context window size |
| `-n 512` | 512 tokens | Max response length |
| `--chat-template qwen` | Qwen format | Required for correct prompting |
| `--vision-model` | Auto-enabled | Native vision processing |

**Performance Expectations**:
- Inference speed: **18-22 tokens/second** (Pi 5, 8GB)
- First token latency: 0.5-2 seconds
- Vision processing: 3-6 seconds per image
- Memory usage: ~4.5GB when loaded

### 3.4 API Server Module (FastAPI)

**Endpoints**:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health + model status |
| `/v1/models` | GET | List available models |
| `/v1/models/load` | POST | Load model into VRAM |
| `/v1/chat/completions` | POST | OpenAI-compatible chat |
| `/v1/chat/completions/stream` | POST | Streaming chat |
| `/v1/vision` | POST | Image analysis (Qwen native) |
| `/system/status` | GET | CPU, RAM, temperature |

**System Prompt Template** (Qwen format):
```
<|im_start|>system
You are a helpful AI assistant running locally on a Private AI Appliance.
Model: Qwen 3.5 4B
Capabilities: General Q&A, coding, vision (images), voice, 201 languages
Privacy: All processing is local - your data never leaves this device.
---

## 4. Data Models (Updated for Qwen)

### 4.1 Model Registry Schema

```python
@dataclass
class ModelInfo:
    id: str                    # "qwen-3.5-4b"
    name: str                  # "Qwen 3.5 4B"
    gguf_filename: str         # "Qwen_Qwen3.5-4B-Q4_K_M.gguf"
    size_bytes: int            # 2,870,000,000
    quantization: str          # "Q4_K_M"
    parameters: str            # "4B"
    
    # Qwen-specific
    chat_template: str          # "qwen" (not "llama3")
    has_vision: bool           # True (all Qwen 3.5)
    mmlu_score: float          # 88.8
    languages: int             # 201
    license: str               # "Apache 2.0"
    
    # Performance
    inference_speed: str       # "20 tok/s"
    ram_required_gb: float     # 4.5
    
    # UI
    description: str
    tier: str                  # "basic" | "premium"
    installed: bool
    download_url: str
```

### 4.2 Vision Request/Response

```python
# Vision Input (Qwen native format)
class VisionRequest:
    model: str = "qwen-3.5-4b"
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: int = 512

class Message:
    role: str = "user"
    content: List[ContentItem]

class ContentItem:
    type: str  # "text" | "image_url"
    text: Optional[str]
    image_url: Optional[ImageUrl]

class ImageUrl:
    url: str  # "data:image/jpeg;base64,/9j/4AAQ..."
```

---

## 5. Configuration Parameters

### 5.1 Model Settings

```yaml
# /etc/private-ai/models.yaml

primary_model:
  id: "qwen-3.5-4b"
  name: "Qwen 3.5 4B"
  gguf_path: "/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf"
  chat_template: "qwen"  # IMPORTANT
  
  # Context
  context_size: 4096
  max_tokens: 512
  
  # Generation
  temperature: 0.7
  top_p: 0.9
  repeat_penalty: 1.1
  
  # Vision (native in Qwen)
  vision_enabled: true
  vision_detail: "auto"  # auto | low | high

# Optional upgrade path
upgrade_model:
  id: "qwen-3.5-9b"
  name: "Qwen 3.5 9B"
  gguf_path: "/models/Qwen_Qwen3.5-9B-Q4_K_M.gguf"
  requires_ram_gb: 8
  premium_only: true
```

### 5.2 System Requirements

```yaml
# Minimum hardware for Qwen 3.5 4B
ram_gb: 8          # Was 4GB with Llama 3.2 3B
storage_gb: 64     # Was 32GB (larger model)
cpu_cores: 4       # ARM Cortex-A76
wifi: "802.11ac"   # AP mode capable
```

---

## 6. PWA Interface Specifications

### 6.1 Model Manager UI

**Features**:
1. **Model Download**:
   - Show available Qwen 3.5 models (4B, 9B)
   - Progress bar for download
   - Size: 2.87GB for 4B, ~5.8GB for 9B

2. **Model Switching**:
   - Load/unload models
   - RAM check before loading (warn if <4GB free)
   - Estimated load time: 3-5 seconds

3. **Vision Toggle**:
   - Enabled by default (all Qwen models support vision)
   - Quality selector: "Fast" (4B) vs "Quality" (9B)

### 6.2 Vision Interface

```javascript
// Vision input component
class VisionInput {
  async captureImage() {
    // Use device camera or file upload
    const image = await this.getImage();
    
    // Convert to base64
    const base64 = await this.toBase64(image);
    
    // Send to API
    const response = await fetch('/v1/vision', {
      method: 'POST',
      body: JSON.stringify({
        model: 'qwen-3.5-4b',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` }}
          ]
        }]
      })
    });
    
    return response.json();
  }
}
```

---

## 7. Deliverable Specifications

### 7.1 API Server Deliverable

```python
# Required endpoints for Basic Tier (Qwen 3.5)

class APIServerBasic:
    """FastAPI server with Qwen 3.5 model support"""
    
    async def load_model(self, model_id: str) -> LoadResult:
        """Load Qwen 3.5 model with proper chat template"""
        model = MODEL_REGISTRY[model_id]
        
        # Verify RAM availability
        free_ram = get_free_ram_gb()
        if free_ram < model.ram_required_gb:
            raise InsufficientRAMError(
                f"Need {model.ram_required_gb}GB, only {free_ram}GB available"
            )
        
        # Launch llama.cpp with Qwen template
        process = await asyncio.create_subprocess_exec(
            "llama-server",
            "-m", model.gguf_path,
            "--chat-template", "qwen",  # CRITICAL
            "--port", "8081",
            # ... other args
        )
        
        return LoadResult(
            model_id=model_id,
            status="loaded",
            ram_used_gb=model.ram_required_gb
        )
    
    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """OpenAI-compatible endpoint using Qwen format"""
        # Convert messages to Qwen chat template
        formatted = self.apply_qwen_template(request.messages)
        
        response = await self.llama_client.complete(formatted)
        
        return ChatResponse(
            model="qwen-3.5-4b",
            choices=[...],
            usage=TokenUsage(...)
        )
```

### 7.2 PWA Interface Deliverable

**Required Components**:

1. **Model Manager**:
   - Model list with Qwen 3.5 badges
   - Download progress (2.87GB indicator)
   - RAM availability warning
   - "Upgrade to 9B" button (Premium upsell)

2. **Chat Interface**:
   - Streaming text display
   - Vision attachment button (camera icon)
   - Voice input (Web Speech API)
   - Model indicator in header ("Qwen 3.5 4B")

3. **Vision UI**:
   - Image upload zone
   - Camera capture (mobile)
   - Preview thumbnail
   - "Analyzing..." state (3-6 seconds)

### 7.3 Hardware Deliverable

**Updated BOM for Qwen 3.5**:

| Component | Before (Llama) | After (Qwen) | Cost Impact |
|-----------|---------------|--------------|-------------|
| Pi CM5 | 4GB variant | **8GB variant** | +$30 |
| eMMC | 32GB | **64GB** | +$15 |
| **Total BOM Delta** | | | **+$45** |

**Price Adjustment**:
- DIY Kit: $249 (was $199)
- Assembled: $449 (was $399)

---

## 8. Migration from Llama to Qwen

### 8.1 Data Migration

| Aspect | From (Llama) | To (Qwen) | Action |
|--------|--------------|-----------|--------|
| Model file | `Llama-3.2-3B-Q4_K_M.gguf` | `Qwen_Qwen3.5-4B-Q4_K_M.gguf` | Download new |
| Chat template | `llama3` | `qwen` | Update launch args |
| System prompt | Old format | Qwen format | Update PWA |
| Conversations | Compatible | Compatible | No migration needed |
| API responses | Compatible | Compatible | No change |

### 8.2 Configuration Update

```bash
# Update model configuration
sudo tee /etc/private-ai/model.conf <<EOF
[model]
# Old (Llama)
# gguf_path = /models/Llama-3.2-3B-Q4_K_M.gguf
# chat_template = llama3

# New (Qwen)
gguf_path = /models/Qwen_Qwen3.5-4B-Q4_K_M.gguf
chat_template = qwen
vision_enabled = true
EOF

# Restart services
sudo systemctl restart private-ai
```

---

## 9. Testing Checklist (Qwen 3.5)

### 9.1 Model Loading Tests

- [ ] Download Qwen 3.5 4B GGUF (2.87GB)
- [ ] Load model on 8GB Pi: Verify <5 second load time
- [ ] Attempt load on 4GB Pi: Verify graceful failure message
- [ ] Verify chat template is "qwen" (check logs)

### 9.2 Inference Tests

- [ ] Simple chat: 18-22 tok/s sustained
- [ ] Chinese input: Verify 201-language support
- [ ] Vision test: Upload image, get description in <6 seconds

### 9.3 Integration Tests

- [ ] PWA detects Qwen model correctly
- [ ] Vision button appears (enabled by default)
- [ ] RAM warning shows if switching to 9B on 8GB system

---

## 10. Items to Confirm - Qwen-Specific

### Technical

1. **Should we cache vision embeddings?** Qwen 3.5 recalculates per request.
2. **Quantization fallback**: If Q4_K_M too slow on Pi 4, offer Q3_K_L?
3. **Hot-swap**: Can we switch 4B ↔ 9B without full restart?

### Product

1. **Marketing vision**: "All tiers include vision" or "Better vision in Premium"?
2. **Upgrade messaging**: How to position 9B vs 4B for Premium upsell?
3. **Language marketing**: Emphasize 201 languages in global markets?

---

*Document Version: 2.0-Qwen*  
*Models: Qwen 3.5 4B (Basic), Qwen 3.5 9B (Premium)*  
*Vision: Native in all models (major architectural change)*
