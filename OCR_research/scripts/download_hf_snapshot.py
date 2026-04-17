#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

from huggingface_hub import snapshot_download


def emit(event: str, **payload) -> None:
    message = {"event": event, **payload}
    print(json.dumps(message), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--target-path", required=True)
    args = parser.parse_args()

    target_path = Path(args.target_path).expanduser().resolve()
    target_path.parent.mkdir(parents=True, exist_ok=True)

    emit("status", message=f"Downloading Hugging Face snapshot for {args.repo_id}...")
    snapshot_download(
        repo_id=args.repo_id,
        local_dir=str(target_path),
        local_dir_use_symlinks=False,
    )
    emit("complete", target_path=str(target_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
