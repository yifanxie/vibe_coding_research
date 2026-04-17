#!/bin/zsh
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "${ROOT_DIR}/.venv_paddle_apple/bin/activate"
export PADDLE_PDX_CACHE_HOME="${ROOT_DIR}/.paddlex_cache"

# Load local secrets and machine-specific overrides if present.
if [[ -f "${ROOT_DIR}/.env.local" ]]; then
  source "${ROOT_DIR}/.env.local"
fi

# HF Hub tooling accepts HF_TOKEN; some libraries also look for
# HUGGING_FACE_HUB_TOKEN, so mirror it when only one is set.
if [[ -n "${HF_TOKEN:-}" && -z "${HUGGING_FACE_HUB_TOKEN:-}" ]]; then
  export HUGGING_FACE_HUB_TOKEN="${HF_TOKEN}"
fi
