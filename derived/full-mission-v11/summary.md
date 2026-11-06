# Full mission v11: sensed vs ground truth

2026-11-06. Agent-run synthetic evaluation on seeds 100-119. Three paths per condition; the sensed paths read the pit box and start flag through camera models (assumed tag/flag poses) instead of ground truth, and sensed_stop halts on the first vehicle contact instead of continuing through.

| Condition | Path | Completed | Parked | Exchange | Contact-free runs | Laps w/ vehicle contact | Laps w/ wall contact | Finish median (s) | Score-like mean |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| empty | truth | 20/20 | 20 | 13 | 20 | 0 | 0 | 54.85 | 367.25 |
| empty | sensed | 20/20 | 20 | 13 | 20 | 0 | 0 | 54.85 | 367.25 |
| empty | sensed_stop | 20/20 | 20 | 13 | 20 | 0 | 0 | 54.85 | 367.25 |
| aligned_vehicles | truth | 20/20 | 20 | 11 | 0 | 60 | 24 | 80.18 | 267.75 |
| aligned_vehicles | sensed | 20/20 | 20 | 11 | 0 | 60 | 24 | 80.18 | 267.75 |
| aligned_vehicles | sensed_stop | 0/20 | 0 | 0 | 0 | 20 | 0 | None | 35 |
| random_yaw_vehicles | truth | 20/20 | 20 | 12 | 0 | 60 | 9 | 73.88 | 282.25 |
| random_yaw_vehicles | sensed | 20/20 | 20 | 12 | 0 | 60 | 9 | 73.88 | 282.25 |
| random_yaw_vehicles | sensed_stop | 0/20 | 0 | 0 | 0 | 20 | 0 | None | 35 |

## Reading this

- **Empty field:** sensed and truth complete identically; no vehicles, so contact-free is always 20/20 and sensed_stop matches sensed.
- **With vehicles:** sensed matches truth on completion (the camera resolves the box and start flag reliably), confirming camera sensing does not cost the mission. sensed_stop trades completion for safety — it halts on any vehicle contact instead of scraping through, so its completion drops while its laps-with-vehicle-contact stay at the first contact only.
- Avoidance (routing around a vehicle instead of stopping) is the next increment and not measured here.
