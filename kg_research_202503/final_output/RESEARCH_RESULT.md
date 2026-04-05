# Knowledge Graph Research Result

## Summary
- Research workspace is now consolidated under `./research/kg_research_202503/`.
- The archived experiment harness, raw outputs, and recommendation artifacts live directly in this folder.
- The final handoff package is in `./research/kg_research_202503/final_output/`.

## Optimized Result Highlight
- Best overall pipeline: `hybrid_semantic + force_similarity + typed_only`
- Average total score: `0.753`
- Fallback pipeline: `hybrid_semantic + hybrid_constrained + typed_only`
- Why it won:
  - strongest lv1/lv2 readability in the matrix
  - highest typed-edge usefulness score
  - strongest overall scanability after visual cleanup

## Key Experiment Outputs
- Full experiment matrix summary:
  - `../output/summary.json`
- Original recommendation memo:
  - `../RECOMMENDATION.md`
- Original recommended review bundle:
  - `../output/recommended/index.html`
- Final reusable review bundle:
  - `./recommended_visual_bundle/index.html`
- Final reusable review bundle manifest:
  - `./recommended_visual_bundle/manifest.json`

## What Was Refactored
- The review rendering logic that previously lived inside the one-off exporter for `recommended/index.html` is now separated into:
  - `./lib/review_bundle_renderer.mjs`
  - `./config/recommended_review.config.json`
  - `./generate_final_output.mjs`
- This makes the final visual bundle reusable and configurable without editing the archived experiment scripts directly.
- Key configurable dimensions now include:
  - canvas width and height
  - lv1 / lv2 / lv3 band positions
  - node sizes by level
  - overlap padding
  - iteration count for collision resolution
  - whether edges are shown
  - whether level badges are shown

## Final Visual Optimization Notes
- The final render intentionally prioritizes human inspection over strict fidelity to the original force-layout coordinates.
- Improvements applied in the final renderer:
  - stronger collision avoidance to reduce node overlap
  - wider canvas and larger level separation
  - reusable level-based spacing rules
  - explicit edge display
  - hidden `LV1` / `LV2` badges for cleaner labels

## Document-Level Results For The Winning Setup
- `cursor-agent-saas-ai`: `0.768`
- `bitcoin-dubious-speculation`: `0.754`
- `where-to-invest-in-a-multipolar-world-ww3`: `0.749`
- `china-s-next-boom-analyst-reveals-the-top-sectors-to-invest-in-now-shaun-rein`: `0.740`

## Important Caveats
- The final visual cleanup affects presentation only; it does not change the underlying experiment scores already computed in `../output/summary.json`.
- PNG files in `./recommended_visual_bundle/png/` are copied from the archived recommended bundle so the final package includes immediately viewable screenshots alongside the reusable renderer code.
