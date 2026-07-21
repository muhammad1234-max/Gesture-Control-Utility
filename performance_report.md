# Phase 16: End-to-End Performance Audit

## Latency Breakdown

| Stage | Average (ms) | Median (ms) | 95th Percentile | Max (ms) | StdDev |
|---|---|---|---|---|---|
| 1. Camera - Read | 1000.29 | 1000.30 | 1001.09 | 1001.40 | 0.45 |
| 2. Camera - RGB Convert | 0.79 | 0.51 | 0.96 | 9.25 | 1.37 |
| 3. Camera - Serialize | 0.30 | 0.22 | 0.41 | 2.81 | 0.41 |
| 4. Socket - Transport (Python -> Node) | N/A | N/A | N/A | N/A | N/A |
| 5. Queue - Node -> Tracking Worker | N/A | N/A | N/A | N/A | N/A |
| 6. Tracker - Image Convert | 1.35 | 0.79 | 4.18 | 5.03 | 1.16 |
| 7. Tracker - Inference | 48.82 | 44.11 | 94.15 | 123.31 | 18.00 |
| 8. Tracker - Serialize | 0.06 | 0.05 | 0.14 | 0.20 | 0.03 |
| 9. Queue - Tracker -> Gesture | N/A | N/A | N/A | N/A | N/A |
| 10. Gesture - Processing | N/A | N/A | N/A | N/A | N/A |
| 11. Win32 - Injection Latency | N/A | N/A | N/A | N/A | N/A |
| 12. Total Pipeline E2E (Capture Start -> Win32 End) | N/A | N/A | N/A | N/A | N/A |

## Throughput (FPS)
- **Camera Output:** 1.02 FPS (41 total items)
- **Tracker Output:** 0.67 FPS (51 total items)
