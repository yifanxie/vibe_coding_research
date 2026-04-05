# GraphMind Knowledge Graph Research Recommendation

## Summary
- Research corpus: `./text_samples/`
- Output directory: `./research/kg_research_202503/output/`
- Runtime mode: OpenAI-backed extraction using `gpt-4.1-mini`
- Best overall pipeline: **hybrid_semantic + force_similarity + typed_only**
- Fallback pipeline: **hybrid_semantic + hybrid_constrained + typed_only**

## Why The Winner Ranked First
- It produced the strongest combined score for readable lv1/lv2 structure, cluster coherence, and scanability.
- It kept typed edges interpretable while still allowing semantic proximity to influence placement.
- It stayed within the max-3-layer objective more consistently than denser alternatives.

## Recommended Default
- Strategy: `hybrid_semantic`
- Layout: `force_similarity`
- Edge policy: `typed_only`
- Average score: **0.753**

## Recommended Fallback
- Use the fallback when the default produces too many weak proximity links or feels visually busy on long documents.
- Strategy: `hybrid_semantic`
- Layout: `hybrid_constrained`
- Edge policy: `typed_only`
- Average score: **0.744**

## Top Configurations
| Rank | Strategy | Layout | Edge policy | Avg total | Top-level | Readability | Cluster | Scanability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | hybrid_semantic | force_similarity | typed_only | 0.753 | 0.702 | 0.805 | 0.507 | 1 |
| 2 | hybrid_semantic | force_similarity | proximity_only | 0.749 | 0.702 | 0.805 | 0.507 | 1 |
| 3 | hybrid_semantic | force_similarity | both | 0.748 | 0.702 | 0.805 | 0.507 | 0.992 |
| 4 | hybrid_semantic | hybrid_constrained | typed_only | 0.744 | 0.702 | 0.805 | 0.473 | 0.985 |
| 5 | hybrid_semantic | hybrid_constrained | proximity_only | 0.743 | 0.702 | 0.805 | 0.473 | 1 |
| 6 | section_aware | force_similarity | typed_only | 0.741 | 0.708 | 0.765 | 0.491 | 0.985 |
| 7 | hybrid_semantic | hybrid_constrained | both | 0.74 | 0.702 | 0.805 | 0.473 | 0.978 |
| 8 | section_aware | force_similarity | proximity_only | 0.735 | 0.708 | 0.765 | 0.491 | 1 |

## Notes
- This research harness is offline-first and does not modify the GraphMind product UI.
- The current GraphMind production baseline is still summary-only extraction plus DAG layout, so the recommendation here should be treated as a candidate architecture for a future product iteration.
