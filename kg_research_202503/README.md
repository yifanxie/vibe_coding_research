# GraphMind Research Harness

This directory contains an offline-first research harness for evaluating hybrid layered knowledge-graph generation against the local `./text_samples/` corpus.

## What it does

- Reads Markdown summaries from `./text_samples/`
- Builds a common research graph format with:
  - explicit `lv1` / `lv2` / `lv3` node levels
  - typed relationship edges
  - scored proximity edges
  - evidence snippets grounded in the source text
- Benchmarks:
  - `whole_document`
  - `section_aware`
  - `hybrid_semantic`
- Benchmarks layouts:
  - `layered_dag`
  - `force_similarity`
  - `hybrid_constrained`
- Benchmarks edge policies:
  - `typed_only`
  - `proximity_only`
  - `both`
- Writes JSON artifacts, HTML previews, and a recommendation memo.

## Running it

From the repo root:

```bash
node research/kg_research_202503/run-experiments.mjs
```

Useful flags:

```bash
node research/kg_research_202503/run-experiments.mjs --provider heuristic
node research/kg_research_202503/run-experiments.mjs --provider openai
node research/kg_research_202503/run-experiments.mjs --model gpt-4.1-mini
node research/kg_research_202503/run-experiments.mjs --limit 2
node research/kg_research_202503/run-experiments.mjs --proximity-threshold 0.48
```

## OpenAI configuration

The harness automatically loads `OPENAI_API_KEY` from:

- the current shell environment, or
- `./dashboard/.env.local`

Recommended `dashboard/.env.local` entry:

```dotenv
OPENAI_API_KEY=your_key_here
```

If no key is available, `--provider auto` falls back to heuristic mode so the harness is still runnable.

## Output

Generated outputs are written to:

- `./research/kg_research_202503/output/`
- `./research/kg_research_202503/RECOMMENDATION.md`

Each document gets:

- `source.json`
- one `graph.json` per strategy
- one `.json` and `.html` artifact per layout/edge-policy combination

## Notes

- This harness is intentionally separate from the GraphMind product code.
- It is designed to support immediate heuristic experiments and later OpenAI-backed runs without changing the file layout.
