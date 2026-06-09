# Pet Eating Behaviour Analyser — Design & Results

An AI pipeline that watches cat surveillance footage and answers: **is the cat eating, what is it eating, and how dangerous is it?**

---

## Design

### Core Output

| Field | Type | Example |
|-------|------|---------|
| `is_eating` | Yes / No / Uncertain | Yes |
| `food_identified` | string | Cooked chicken |
| `risk_level` | 5-level scale | 🟢 Low |

**Risk scale:**

| Level | Examples |
|-------|---------|
| ⚪ None | Not eating |
| 🟢 Low | Commercial cat food, boneless cooked meat, cat grass |
| 🟡 Medium | Unknown insects, unidentified plants, raw fish |
| 🟠 High | Onion, garlic, chocolate, cooked bones, grapes |
| 🔴 Critical | Bleach, medicines, batteries, sharp objects |

---

### Why Not Send the Full Video?

Sending a raw 2-minute clip directly to the model is slow, expensive, and inaccurate — experiments (from `llm_discovery.txt`) showed that the video-mode API struggles on ambiguous targets like a moth. Dense frame sampling outperforms it.

The solution is a **two-stage pipeline** that only calls the expensive identification step on windows that actually contain eating behaviour.

---

### Two-Stage Clip Analyser

```
2-min clip
    │
    ▼
Stage 1 · Quick Screen
  Sample 16 frames at 7.5s intervals
  1× model call — "which windows have eating signal?"
    │
    ▼  (exits early if nothing found)
Stage 2 · Food Identification   ← parallel
  3 snapshots per hit window
  up to 5× model calls in parallel
    │
    ▼
Stage 3 · Aggregate
  highest risk wins · confidence weighted
```

**Hard constraint: 2-minute clip → result in under 2 minutes.**

Time budget:

| Stage | Budget |
|-------|--------|
| Frame extraction | ≤ 10s |
| Stage 1 screen | ≤ 30s |
| Stage 2 parallel ID | ≤ 75s |
| Aggregation | ≤ 5s |
| **Total** | **≤ 2 min** |

---

### Full-Day Pipeline

Running the clip analyser naïvely on an 8-hour day (240 × 2-min clips) would cost ~$1.44/day — 4× over budget. The solution is to filter clips **before** calling the model.

**Stage 0.5 — Motion Detection (local, free)**

Three conditions must all hold simultaneously; a single twitching tail or breathing chest does not pass:

| Condition | Threshold | Filters out |
|-----------|-----------|------------|
| Pixel intensity change | > 12/255 | Breathing, micro-movements |
| Changed-pixel area | > 4% of frame | Tail twitches, localised grooming |
| Both sustained | ≥ 5 seconds | Walking transitions |

After filtering, ~25% of footage reaches the model.

**Full-day flow:**

```
8h recording
    ↓  Stage 0.5 (motion filter, free)
Active clips only (~25%)
    ↓  SQLite job queue + async workers
Clip Analyser (Stage 1 → 2 → 3)
    ↓  Stage 4: keep only High-confidence eating events
Database + thumbnail
    ↓  Stage 5 at 23:59
Daily digest
```

**Cost after filtering:**

| Step | Clips/day | Cost/day |
|------|----------|---------|
| Motion filter | 240 → ~60 | $0 |
| Stage 1 screen | 60 | ~$0.36 |
| Stage 2 food ID (~15% hit rate) | ~9 | ~$0.14 |
| **Total** | | **~$0.50 · $15/month** |

---

### Key Design Decisions

**Prompt specificity matters.** An early version of the risk prompt said `"Low: plain cooked meat"` — the model would still classify cooked chicken as `High`, apparently associating "human food" with danger. Explicitly naming `"boneless cooked chicken or turkey WITHOUT visible bones = Low"` eliminated the false alarm.

**Single-chunk veto is too aggressive.** In the chunked dense mode, one ambiguous frame (described by the model as "a piece of wood or plant material") was enough to pull the whole clip to `High`. Adding a minimum-support rule — High/Critical requires ≥ 2 chunks to agree — removed the false positive without hiding real hazards.

**Stage 1 has a real blind spot.** For a 32-second clip sampled every 7.5 seconds, only 5 frames are drawn. If the cat eats briefly between two sampled frames, Stage 1 returns `active_windows: []` and the clip is marked as no eating. The dense modes (which sample the full duration) catch this; the sparse pipeline does not.

---

## Results

Tested on 6 real first-person cat clips (2–36 seconds).

### Three-Way Mode Comparison (v3, fixed prompt)

| Clip | Content | Sparse | Dense-5 | Chunked |
|------|---------|--------|---------|---------|
| test_clip_1 (32.8s) | Cooked chicken | ⚪ None / No ❌ | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ |
| test_clip_2 (2.2s) | Dry cat food | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ |
| test_clip_3 (35.6s) | Dry cat food | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ |
| test_clip_4 (3.8s) | Ambiguous | 🟠 High / Uncertain ⚠️ | 🟢 Low / Yes | 🟢 Low / Yes |
| test_clip_5 (34.0s) | Raw fish | 🟡 Medium / Yes ✅ | 🟡 Medium / Yes ✅ | 🟡 Medium / Yes ✅ |
| test_clip_6 (10.7s) | Dry cat food | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ | 🟢 Low / Yes ✅ |

| Metric | Sparse | Dense-5 | Chunked |
|--------|--------|---------|---------|
| Avg time | 10.5s | **7.7s** | 7.9s |
| Avg cost | $0.015 | **$0.003** | $0.010 |
| API calls | 1 + N | **1** | N chunks |

### Key Findings

**Sparse mode misses short eating events.** `test_clip_1` (cat eating chicken) was marked as *No eating* because the 7.5s sampling interval happened to miss the eating window. Both dense modes caught it correctly.

**Dense-5 is cheapest and often correct.** At 80% cheaper than sparse, Dense-5 identifies safe food (cat food, cooked chicken) reliably. Its weakness is fine-grained risk distinction — it called raw fish `"Meat / High"` in v2 before the prompt fix, while sparse correctly said `"Raw Meat / High"`.

**Chunked dense gives best temporal coverage.** By splitting the clip into 7-second windows and calling the model in parallel on each, it achieves near-complete frame coverage without hitting the 5-image-per-call API limit. The minimum-support aggregation rule prevents a single noisy chunk from inflating the risk level.

**Prompt specificity directly affects accuracy.** Between v2 and v3, the only substantive change was making the Low/High boundary explicit for cooked meat. This alone fixed 4 of 6 false `High` results across all modes.

### Remaining Issues

| Issue | Clip | Description |
|-------|------|-------------|
| Stage 1 blind spot | test_clip_1 | Sparse sampling misses eating that occurs between sampled frames |
| Very short clips | test_clip_4 | 3.8s clip produces unreliable results; too little visual information |
| Sparse single-window instability | test_clip_4 | A Low-confidence single window should not trigger High in aggregation |
