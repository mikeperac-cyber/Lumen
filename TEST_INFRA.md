# E2E Test Infra: Lumen Offline-First Productivity Suite

## Test Philosophy
- Opaque-box, requirement-driven testing directly derived from `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Real-World Workload Testing.
- Multi-browser coverage across Chromium and WebKit desktop viewports.

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 (Isolated) | Tier 2 (Boundary) | Tier 3 (Interactions) | Tier 4 (Workloads) |
|---|---------|-------------------|:-----------------:|:-----------------:|:---------------------:|:------------------:|
| 1 | R1 Boot & Architecture | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | R2 Load, Parse & Virtual Scroll | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 3 | R3 Sync Merge & Habit Loops | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 4 | R4 Hardening & Accessible Modals | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 5 | R5 CI Gates & Multi-Browser | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **E2E Test Runner**: Playwright (`npx playwright test`)
- **Unit Test Runner**: Vitest (`npm run test:unit`)
- **Coverage Gate**: Vitest with `@vitest/coverage-v8` (`npm run test:coverage` >= 80% on `src/lib/**`)
- **Chunk Budget Gate**: `node scripts/check-chunk-budget.cjs` (<= 250KB per JS chunk)
- **Directory Layout**:
  - `tests/smoke.spec.js`: Smoke tests verifying all 19 view routes boot with zero console errors.
  - `tests/a11y-modal.spec.js`: Modal accessibility, focus trapping, `#view-root` inert toggling.
  - `tests/perf.spec.js`: Render performance & flicker validation under heavy load.
  - `tests/sync.spec.js`: Peer-to-peer sync and LWW merge correctness.
  - `tests/unit/`: Comprehensive unit tests for state stores, helpers, and algorithms.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity | Target Latency / Criteria |
|---|----------|--------------------|------------|---------------------------|
| 1 | Full Cold Boot & Navigation Walk | R1, R2, R4 | High | All 19 views load with 0 console errors |
| 2 | Heavy 2000-Task Virtual Scroll | R1, R2 | High | Smooth scroll, 0 DOM crashes, 0 flicker |
| 3 | Bi-directional Multi-Device Sync | R3, R1 | High | Merge 500+ conflicting records without freeze |
| 4 | Modal Trapping & Keyboard A11y | R4 | Medium | Full keyboard loop with #view-root inert |
| 5 | PWA Offline Manifest & Service Worker | R4, R2 | High | Manifest unhashed, offline asset cache valid |

## Coverage Thresholds
- Tier 1: >=5 per feature area
- Tier 2: >=5 per feature area (edge inputs, corrupted timestamps, massive lists)
- Tier 3: Pairwise coverage of route transitions, modal triggers, sync cycles
- Tier 4: >=5 realistic high-volume workflows
- Unit Code Coverage: >= 80% lines/branches/statements on `src/lib/**`
- Vite JS Chunk Budget: <= 250KB (256,000 bytes) per output chunk
