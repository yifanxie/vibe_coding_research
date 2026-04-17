#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="${ROOT_DIR}/.venv_paddle_apple"
CONDA_ENV_DIR="${ROOT_DIR}/.conda_paddle_apple"
CACHE_DIR="${ROOT_DIR}/.paddlex_cache"

function ensure_supported_python() {
  local version_output
  version_output="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  if [[ "${version_output}" == "3.10" || "${version_output}" == "3.11" ]]; then
    echo "python3"
    return
  fi

  if command -v conda >/dev/null 2>&1; then
    if [[ ! -x "${CONDA_ENV_DIR}/bin/python" ]]; then
      conda create -p "${CONDA_ENV_DIR}" python=3.11 -y >&2
    fi
    echo "${CONDA_ENV_DIR}/bin/python"
    return
  fi

  echo "Unsupported python3 version ${version_output}. Install Python 3.10/3.11 or conda." >&2
  exit 1
}

PYTHON_BIN="$(ensure_supported_python)"

rm -rf "${VENV_DIR}"
"${PYTHON_BIN}" -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"

python -m pip install --upgrade pip setuptools wheel
python -m pip install paddlepaddle==3.2.1 || python -m pip install paddlepaddle==3.2.1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
python -m pip install -U "paddleocr[doc-parser]"
python -m pip install "mlx-vlm>=0.3.11"

mkdir -p "${CACHE_DIR}"

echo "Apple Silicon Paddle environment is ready at ${VENV_DIR}"
echo "Activate with: source ${ROOT_DIR}/scripts/activate_paddle_apple_env.sh"
echo "Start MLX service with: mlx_vlm.server --port 8111"
