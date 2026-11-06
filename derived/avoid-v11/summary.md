# Avoidance v11: contact-free bound vs assumed footprint

2026-11-06. Agent-run synthetic study (seeds 100-119). Each run drives the sensed+avoidance path (`sense_obstacles` -> `avoidance.plan_straight`) with a square robot of the swept side length. Two independent assumptions, not the planner, set the contact-free rate.

| Footprint (in) | Condition | Completed | Contact-free runs | Laps w/ vehicle contact | Mean planned-blocked straights |
|---:|---|---:|---:|---:|---:|
| 10.0 | aligned_vehicles | 20/20 | 0 | 60 | 2.1 |
| 10.0 | random_yaw_vehicles | 20/20 | 0 | 60 | 2.8 |
| 9.0 | aligned_vehicles | 20/20 | 0 | 60 | 1.65 |
| 9.0 | random_yaw_vehicles | 20/20 | 0 | 60 | 2.45 |
| 8.5 | aligned_vehicles | 20/20 | 0 | 60 | 1.25 |
| 8.5 | random_yaw_vehicles | 20/20 | 0 | 60 | 2.2 |
| 8.0 | aligned_vehicles | 20/20 | 0 | 60 | 0.8 |
| 8.0 | random_yaw_vehicles | 20/20 | 0 | 60 | 1.95 |
| 7.0 | aligned_vehicles | 20/20 | 0 | 60 | 0.2 |
| 7.0 | random_yaw_vehicles | 20/20 | 0 | 60 | 1.0 |
| 6.0 | aligned_vehicles | 20/20 | 0 | 60 | 0.0 |
| 6.0 | random_yaw_vehicles | 20/20 | 0 | 60 | 0.45 |

## Reading this

- **Planner blocked count falls with the footprint** (mean planned-blocked straights drop to ~0 below 8 in): the avoidance planner correctly stops flagging inner-lane vehicles as unpassable once the assumed robot shrinks. The envelope lever works at the *planning* level.
- **Contact-free runs stay 0 even then**, because the lap route's fixed 12-inch entry/exit blends from the lane centre sweep through vehicles placed near the straightaway ends (x around 51-63 in, west quadrants). Coming off the 7.5-inch arc there is no lateral room to route around a vehicle sitting at the arc exit.
- So the contact-free limit has two independent causes — the 10-inch envelope (large robot) and the fixed entry/exit blends (small robot) — and the fix is to measure the real robot and revise route construction, not to make the planner more clever.
