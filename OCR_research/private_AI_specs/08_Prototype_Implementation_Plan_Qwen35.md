# v0 Prototype Implementation Plan (Qwen 3.5 Edition)

**Goal**: Build working prototype with Qwen 3.5 models  
**Estimated Time**: 4-6 hours  
**Hardware**: Raspberry Pi 5 8GB (minimum, 16GB recommended)  
**Models**: Qwen 3.5 4B (Basic), Qwen 3.5 9B (Premium)  

---

## Executive Summary

This guide builds a Private AI Appliance prototype using **Qwen 3.5 models**. Key differences from Llama-based version:

| Aspect | Llama (Previous) | Qwen 3.5 (This Guide) |
|--------|------------------|----------------------|
| Base Model | Llama 3.2 3B Q4 | **Qwen 3.5 4B Q4_K_M** |
| Size | 1.8 GB | **2.87 GB** |
| RAM Required | 3-4 GB | **4-5 GB** |
| Vision | ❌ Separate model | **✅ Native (all models)** |
| Chat Template | `llama3` | **`qwen`** |
| MMLU Score | ~63% | **88.8%** |
| Minimum Pi | 4GB RAM | **8GB RAM required** |

---

## Prerequisites

### Hardware (Updated for Qwen 3.5)

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Raspberry Pi** | Pi 5 8GB | Pi 5 8GB or 16GB | Qwen 4B needs 4.5GB+ for model |
| **Storage** | 64GB microSD | 128GB microSD | Model (2.87GB) + OS + user data |
| **Cooling** | Heatsink | Active cooling | Inference generates heat |
| **Power** | 5V 5A USB-C | Official 27W supply | Stable power required |
| **Audio** | USB mic (optional) | USB mic + speaker | For voice features |

**⚠️ Critical**: 4GB Raspberry Pi will **NOT** work with Qwen 3.5 4B. **8GB minimum required**.

---

## Phase 1: Base System Setup (30 min)

### Step 1.1: Flash Raspberry Pi OS

Using Raspberry Pi Imager:
1. Select **Raspberry Pi 5**
2. Select **Raspberry Pi OS Lite (64-bit)**
3. Click gear icon (⚙️) for advanced settings:
   - Hostname: `private-ai-v0`
   - Enable SSH: ✓ (Use password auth)
   - Username: `pi` / Password: `privateai2026`
   - WiFi: Your network (temporary, for setup only)
4. Flash to 64GB+ microSD

### Step 1.2: First Boot & SSH

```bash
# Wait 2-3 minutes for first boot
# Find IP or use hostname
ssh pi@private-ai-v0.local

# Or with IP:
ssh pi@192.168.1.XXX
```

### Step 1.3: System Updates

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install build dependencies
sudo apt install -y \
    build-essential cmake git wget \
    python3 python3-pip python3-venv \
    libopenblas-dev libssl-dev \
    nginx hostapd dnsmasq iptables \
    ffmpeg alsa-utils libasound2-dev

# Set CPU governor to performance
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
```

### Step 1.4: Create Project Structure

```bash
mkdir -p ~/private-ai-v0/{backend,frontend,models,scripts}
cd ~/private-ai-v0

# Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-multipart pydantic
```

---

## Phase 2: Build llama.cpp for Qwen 3.5 (45 min)

### Step 2.1: Clone and Build

```bash
cd ~
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# IMPORTANT: Build with ARM optimizations
mkdir build && cd build

cmake .. \
    -DLLAMA_NATIVE=OFF \
    -DLLAMA_ARM_NEON=ON \
    -DLLAMA_BUILD_SERVER=ON \
    -DCMAKE_BUILD_TYPE=Release

# Build (15-20 minutes on Pi 5)
make -j4

# Verify binaries exist
ls -la bin/llama-server bin/llama-cli
```

### Step 2.2: Download Qwen 3.5 4B Model

```bash
cd ~/private-ai-v0/models

# Download Qwen 3.5 4B Q4_K_M (recommended quantization)
wget https://huggingface.co/bartowski/Qwen_Qwen3.5-4B-GGUF/resolve/main/Qwen_Qwen3.5-4B-Q4_K_M.gguf

# Verify download (should be ~2.87GB)
ls -lh *.gguf

# Optional: Download 9B for Premium tier (if you have 16GB Pi)
# wget https://huggingface.co/bartowski/Qwen_Qwen3.5-9B-GGUF/resolve/main/Qwen_Qwen3.5-9B-Q4_K_M.gguf
```

### Step 2.3: Test Qwen 3.5 with llama.cpp

```bash
cd ~/llama.cpp/build/bin

# Launch server with Qwen chat template (CRITICAL)
./llama-server \
    -m ~/private-ai-v0/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf \
    --port 8081 \
    --host 127.0.0.1 \
    -c 4096 \
    -n 512 \
    --temp 0.7 \
    --chat-template qwen  # <-- IMPORTANT: Use Qwen template!
```

In another terminal, test:

```bash
# Test with Qwen chat format
curl http://127.0.0.1:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-3.5-4b",
    "messages": [
      {"role": "system", "content": "You are a helpful AI assistant running locally."},
      {"role": "user", "content": "Hello! Can you confirm you're running on a Raspberry Pi?"}
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'
```

**Expected**: JSON response with AI reply within 2-5 seconds mentioning local/private/offline operation.

**Stop the server** (Ctrl+C) after testing.

---

## Phase 3: API Server with Qwen 3.5 Support (60 min)

### Step 3.1: Create FastAPI Backend

Create `~/private-ai-v0/backend/main.py`:

```python
#!/usr/bin/env python3
"""
Private AI v0 - API Server (Qwen 3.5 Edition)
Provides OpenAI-compatible API for local Qwen 3.5 models
"""

import os
import json
import subprocess
import requests
from typing import Optional, List, Dict, Any, AsyncGenerator
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configuration
LLAMA_SERVER_URL = "http://127.0.0.1:8081"
MODEL_PATH = os.path.expanduser("~/private-ai-v0/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf")
FALLBACK_MODEL = os.path.expanduser("~/private-ai-v0/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf")

# Qwen 3.5 System Prompt Template
QWEN_SYSTEM_PROMPT = """You are a helpful AI assistant running locally on a Private AI Appliance.
You are powered by the Qwen 3.5 model, which supports 201 languages and has native vision capabilities.
Key characteristics:
- All processing happens on-device - your data never leaves this device
- You can analyze images when users share them with you
- You support 201 languages for global users
- You provide helpful, accurate, and privacy-focused assistance
Current model: {model_name}"""

app = FastAPI(
    title="Private AI v0 (Qwen 3.5)",
    description="Local Qwen 3.5 API for Private AI Appliance",
    version="0.2.0-qwen"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: Any  # Can be string or array (for vision)

class ChatCompletionRequest(BaseModel):
    model: str = "qwen-3.5-4b"
    messages: List[ChatMessage]
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=512, ge=1, le=4096)
    stream: bool = False
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)

# Global state
llama_process = None
current_model_info = {
    "id": "qwen-3.5-4b",
    "name": "Qwen 3.5 4B",
    "parameters": "4B",
    "has_vision": True,
    "languages": 201,
    "license": "Apache 2.0"
}

@app.on_event("startup")
async def startup_event():
    global llama_process
    
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"WARNING: Model not found at {MODEL_PATH}")
        if os.path.exists(FALLBACK_MODEL):
            print(f"Using fallback: {FALLBACK_MODEL}")
        else:
            raise RuntimeError("No Qwen 3.5 model found! Download from HuggingFace.")
    
    # Check RAM availability
    import psutil
    mem = psutil.virtual_memory()
    if mem.total < 6 * 1024 * 1024 * 1024:  # Less than 6GB
        print(f"WARNING: Only {mem.total/1e9:.1f}GB RAM detected.")
        print("Qwen 3.5 4B requires ~4.5GB for model + OS overhead.")
        print("8GB Pi strongly recommended. 4GB Pi will struggle.")
    
    # Start llama-server with Qwen chat template
    model_to_use = MODEL_PATH if os.path.exists(MODEL_PATH) else FALLBACK_MODEL
    
    llama_process = subprocess.Popen([
        "/home/pi/llama.cpp/build/bin/llama-server",
        "-m", model_to_use,
        "--port", "8081",
        "--host", "127.0.0.1",
        "-c", "4096",
        "-n", "512",
        "--temp", "0.7",
        "--chat-template", "qwen"  # CRITICAL: Qwen format
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    import time
    time.sleep(5)  # Qwen 3.5 may take slightly longer to load
    print(f"Started llama-server with Qwen 3.5 (PID {llama_process.pid})")

@app.on_event("shutdown")
async def shutdown_event():
    global llama_process
    if llama_process:
        llama_process.terminate()
        print("Shutdown llama-server")

@app.get("/health")
async def health_check():
    try:
        resp = requests.get(f"{LLAMA_SERVER_URL}/health", timeout=5)
        return {
            "status": "healthy",
            "llama_server": "running" if resp.status_code == 200 else "error",
            "model": current_model_info,
            "version": "0.2.0-qwen"
        }
    except:
        return {
            "status": "degraded",
            "llama_server": "not responding",
            "model": current_model_info
        }

@app.get("/system/status")
async def system_status():
    import psutil
    
    # Get temperature
    temp = None
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = round(int(f.read().strip()) / 1000, 1)
    except:
        pass
    
    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory": {
            "total_gb": round(psutil.virtual_memory().total / 1e9, 2),
            "available_gb": round(psutil.virtual_memory().available / 1e9, 2),
            "percent": psutil.virtual_memory().percent
        },
        "temperature_c": temp,
        "current_model": current_model_info,
        "uptime_seconds": int(time.time() - psutil.boot_time())
    }

@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": "qwen-3.5-4b",
                "object": "model",
                "created": 1710000000,
                "owned_by": "private-ai",
                "qwen_35": {
                    "parameters": "4B",
                    "quantization": "Q4_K_M",
                    "has_vision": True,
                    "languages": 201,
                    "mmlu_score": "88.8%"
                }
            }
        ]
    }

@app.post("/v1/chat/completions")
async def chat_completion(request: ChatCompletionRequest):
    """Chat with Qwen 3.5"""
    try:
        # Apply Qwen system prompt if not present
        messages = []
        has_system = False
        for m in request.messages:
            if m.role == "system":
                has_system = True
            messages.append({"role": m.role, "content": m.content})
        
        if not has_system:
            # Prepend Qwen system prompt
            system_msg = QWEN_SYSTEM_PROMPT.format(model_name=current_model_info["name"])
            messages.insert(0, {"role": "system", "content": system_msg})
        
        payload = {
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "top_p": request.top_p,
            "stream": False
        }
        
        response = requests.post(
            f"{LLAMA_SERVER_URL}/v1/chat/completions",
            json=payload,
            timeout=120
        )
        
        return response.json()
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Qwen 3.5 inference timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def simple_chat(request: Dict[str, Any]):
    """Simple chat endpoint for PWA (Qwen 3.5)"""
    message = request.get("message", "")
    history = request.get("history", [])
    
    # Add system prompt with Qwen info
    messages = [
        {"role": "system", "content": QWEN_SYSTEM_PROMPT.format(model_name=current_model_info["name"])}
    ] + history + [{"role": "user", "content": message}]
    
    try:
        response = requests.post(
            f"{LLAMA_SERVER_URL}/v1/chat/completions",
            json={
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 512,
                "stream": False
            },
            timeout=120
        )
        
        result = response.json()
        assistant_message = result["choices"][0]["message"]["content"]
        
        return {
            "response": assistant_message,
            "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            "finish_reason": result["choices"][0].get("finish_reason", "stop"),
            "model": "qwen-3.5-4b"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/vision")
async def vision_analysis(image: UploadFile = File(...), prompt: str = "Describe this image"):
    """Vision analysis using Qwen 3.5 native capabilities"""
    # Save uploaded image
    image_path = f"/tmp/{image.filename}"
    with open(image_path, "wb") as f:
        f.write(await image.read())
    
    # Convert to base64
    import base64
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()
    
    # Qwen 3.5 vision format
    messages = [
        {"role": "system", "content": "You are a helpful assistant that can analyze images."},
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
        ]}
    ]
    
    try:
        response = requests.post(
            f"{LLAMA_SERVER_URL}/v1/chat/completions",
            json={
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 512
            },
            timeout=180  # Vision takes longer
        )
        
        result = response.json()
        return {
            "description": result["choices"][0]["message"]["content"],
            "model": "qwen-3.5-4b",
            "vision": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {str(e)}")

if __name__ == "__main__":
    import time
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 3.2: Create Systemd Service

Create `~/private-ai-v0/backend/private-ai.service`:

```ini
[Unit]
Description=Private AI API Server (Qwen 3.5)
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/private-ai-v0
Environment=PATH=/home/pi/private-ai-v0/venv/bin
Environment=MODEL_NAME=Qwen 3.5 4B
ExecStart=/home/pi/private-ai-v0/venv/bin/python /home/pi/private-ai-v0/backend/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Install:

```bash
sudo cp ~/private-ai-v0/backend/private-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable private-ai
sudo systemctl start private-ai

# Check status
sudo systemctl status private-ai
curl http://localhost:8000/health
```

---

## Phase 4: PWA with Qwen 3.5 Features (60 min)

### Step 4.1: Update PWA to Show Qwen 3.5 Info

In `client/app.js`, update the model info display:

```javascript
// Update system status display for Qwen 3.5
function updateModelInfo(modelData) {
    const modelInfo = document.getElementById('model-info');
    modelInfo.innerHTML = `
        <div class="model-badge">
            <span class="model-icon">🤖</span>
            <span class="model-name">${modelData.name}</span>
            <span class="model-specs">${modelData.parameters} • ${modelData.languages} languages</span>
            ${modelData.has_vision ? '<span class="vision-badge">👁️ Vision</span>' : ''}
        </div>
    `;
}

// In chat, mention Qwen 3.5 capabilities
const welcomeMessage = `
Welcome! You're chatting with ${currentModel.name}.
🌐 Supports 201 languages • 👁️ Vision enabled • 🔒 100% private
`;
```

### Step 4.2: Add Vision UI Component

Add to `client/index.html`:

```html
<!-- Vision upload button -->
<div id="vision-input" class="vision-upload">
    <input type="file" id="imageInput" accept="image/*" hidden>
    <button id="visionBtn" title="Analyze image">📷</button>
    <div id="imagePreview" class="image-preview" style="display: none;"></div>
</div>
```

Add to `client/app.js`:

```javascript
// Vision handling
class VisionInput {
    constructor() {
        this.imageInput = document.getElementById('imageInput');
        this.visionBtn = document.getElementById('visionBtn');
        this.preview = document.getElementById('imagePreview');
        
        this.visionBtn.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImage(e));
    }
    
    async handleImage(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px;">`;
            this.preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        // Upload for analysis
        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', 'Describe this image in detail');
        
        try {
            const response = await fetch('/v1/vision', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            app.addMessage('assistant', `📷 Image Analysis:\n${data.description}`);
        } catch (error) {
            app.addMessage('system', 'Failed to analyze image');
        }
    }
}
```

---

## Phase 5: WiFi AP Setup (45 min)

Same as original guide (no changes needed for Qwen 3.5):

```bash
# Run the AP setup script from original guide
~/private-ai-v0/scripts/setup-ap.sh
```

---

## Phase 6: Final Integration & Testing (30 min)

### Step 6.1: Create Status Script for Qwen 3.5

`~/private-ai-v0/scripts/status.sh`:

```bash
#!/bin/bash
echo "=== Private AI v0 (Qwen 3.5) Status ==="
echo ""

echo "System:"
echo "  Temperature: $(vcgencmd measure_temp 2>/dev/null || echo 'N/A')"
echo "  RAM: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo ""

echo "Qwen 3.5 Model:"
if [ -f ~/private-ai-v0/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf ]; then
    echo "  ✓ Qwen 3.5 4B downloaded ($(ls -lh ~/private-ai-v0/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf | awk '{print $5}'))"
else
    echo "  ✗ Model not found - run download script"
fi
echo ""

echo "Services:"
systemctl is-active private-ai >/dev/null && echo "  ✓ API Server" || echo "  ✗ API Server"
systemctl is-active nginx >/dev/null && echo "  ✓ Web Server" || echo "  ✗ Web Server"
systemctl is-active hostapd >/dev/null && echo "  ✓ WiFi AP" || echo "  ✗ WiFi AP"
echo ""

echo "Test Commands:"
echo "  Chat: curl http://localhost:8000/chat -X POST -d '{\"message\":\"Hello\"}'"
echo "  Vision: Upload image via PWA or API"
echo ""

echo "Qwen 3.5 Capabilities:"
echo "  • 201 languages supported"
echo "  • Native vision (all models)"
echo "  • MMLU-Redux: 88.8%"
echo "  • Apache 2.0 License"
```

### Step 6.2: Qwen 3.5 Testing Checklist

- [ ] **Model Loading**: Qwen 3.5 4B loads in <5 seconds
- [ ] **Chinese Input**: 你好 → Response in Chinese
- [ ] **French Input**: Bonjour → Response in French  
- [ ] **Vision Test**: Upload photo → Get description in <6 seconds
- [ ] **Code Generation**: "Write a Python function" → Working code
- [ ] **Chat Template**: Verify Qwen format in logs (not Llama3)
- [ ] **RAM Check**: `htop` shows ~4.5GB used by llama-server
- [ ] **Temperature**: Stays <75°C under sustained load

### Step 6.3: Performance Benchmarks (Qwen 3.5 on Pi 5)

Run these to validate:

```bash
cd ~/llama.cpp/build/bin

# Benchmark Qwen 3.5 4B
./llama-bench -m ~/private-ai-v0/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf

# Expected results on Pi 5:
# - Q4_K_M: ~18-22 tokens/second
# - First token: ~500-1500ms
# - Memory: ~4.5GB loaded
```

---

## Qwen 3.5 vs Llama: Key Differences Summary

| Aspect | Implementation Change |
|--------|----------------------|
| **Chat Template** | `--chat-template qwen` (not `llama3`) |
| **System Prompt** | Use `<\|im_start\|>system` format |
| **Vision** | Native - all models support it |
| **Languages** | Test with Chinese, Arabic, French |
| **RAM Check** | Verify 8GB Pi is used |
| **Model Size** | 2.87GB download (not 1.8GB) |
| **Inference Speed** | Expect 18-22 tok/s (not 25-35) |

---

## Quick Reference: Qwen 3.5 Commands

```bash
# Check Qwen 3.5 is running
curl http://localhost:8000/health | jq '.model'

# Test multilingual
curl -X POST http://localhost:8000/chat \
  -d '{"message":"你好，你会说中文吗？"}'

# Check system is using Qwen template
sudo journalctl -u private-ai -n 50 | grep "chat-template"

# Monitor Qwen 3.5 RAM usage
ps aux | grep llama-server
htop  # Look for ~4.5GB usage
```

---

## Troubleshooting - Qwen 3.5 Specific

### Issue: "Out of memory" when loading Qwen 3.5 4B
**Cause**: 4GB Pi insufficient  
**Fix**: Must use **8GB Raspberry Pi 5**

### Issue: "Unknown chat template" errors
**Cause**: Using `llama3` template instead of `qwen`  
**Fix**: Update llama.cpp launch: `--chat-template qwen`

### Issue: Vision not working
**Cause**: Image format or size  
**Fix**: Ensure image <2MB, use JPEG format

### Issue: Non-English responses poor
**Cause**: Expected - Qwen 3.5 should be excellent  
**Fix**: Verify model is Qwen (not accidentally using old Llama)

---

## Next Steps

### To Add Qwen 3.5 9B (Premium Tier):

```bash
# On 16GB Raspberry Pi
cd ~/private-ai-v0/models
wget https://huggingface.co/bartowski/Qwen_Qwen3.5-9B-GGUF/resolve/main/Qwen_Qwen3.5-9B-Q4_K_M.gguf

# Update backend to support switching
# Add model selector to PWA
```

### To Test RAG (Next Phase):

```bash
# Install ChromaDB
pip install chromadb sentence-transformers

# Document processing pipeline
# (See Premium Architecture Document)
```

---

**Build Complete!** Your Private AI Appliance now runs Qwen 3.5 with:
- ✅ 88.8% MMLU accuracy (vs 63% Llama 3B)
- ✅ Native vision in all models
- ✅ 201 language support
- ✅ Apache 2.0 license
- ⚠️ Requires 8GB Pi (not 4GB)

*Updated: April 8, 2026*  
*Model: Qwen 3.5 4B Q4_K_M*  
*Chat Template: qwen*
