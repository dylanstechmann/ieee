# Passability atlas v10: summary

2026-11-03. Agent-run geometry with perfect knowledge. Field: organizer CAD (June 2026) as extracted. Vehicle: the guide's plush car, about 8.55 x 8.2 in. A pass needs a gap of at least 10.5 in: the 10 in robot plus 0.25 in on each side. No sensing, control error or rules ruling is included.

## Part A: one vehicle, straight pass beside it (every placement on a 0.25 in grid)

Share of placements that leave a gap of at least 10.5 in, by divider variant, quadrant reading, lane and vehicle yaw:

| Divider | Quadrants | Lane | Yaw | Placements | Gap min / median / max (in) | Passable |
|---|---|---|---:|---:|---|---:|
| cad_1x1 | offsets | outer | 0 | 682 | 7.15 / 9.675 / 12.3 | 36% |
| cad_1x1 | offsets | outer | 45 | 270 | 5.328 / 6.906 / 8.656 | 0% |
| cad_1x1 | offsets | outer | 90 | 693 | 6.975 / 9.45 / 11.95 | 29% |
| cad_1x1 | offsets | inner | 0 | 682 | 7.15 / 9.775 / 12.3 | 36% |
| cad_1x1 | offsets | inner | 45 | 270 | 5.328 / 7.078 / 8.656 | 0% |
| cad_1x1 | offsets | inner | 90 | 693 | 6.975 / 9.475 / 11.95 | 29% |
| cad_1x1 | sixteen_from_wall | outer | 0 | 527 | 8.4 / 10.3 / 12.3 | 47% |
| cad_1x1 | sixteen_from_wall | outer | 45 | 180 | 6.578 / 7.531 / 8.656 | 0% |
| cad_1x1 | sixteen_from_wall | outer | 90 | 528 | 8.225 / 10.075 / 11.95 | 38% |
| cad_1x1 | sixteen_from_wall | inner | 0 | 527 | 7.15 / 8.15 / 9.8 | 0% |
| cad_1x1 | sixteen_from_wall | inner | 45 | 180 | 5.328 / 5.953 / 6.578 | 0% |
| cad_1x1 | sixteen_from_wall | inner | 90 | 528 | 6.975 / 7.975 / 9.45 | 0% |
| cad_1x1 | sixteen_from_divider | outer | 0 | 527 | 7.25 / 8.25 / 9.8 | 0% |
| cad_1x1 | sixteen_from_divider | outer | 45 | 180 | 5.406 / 5.953 / 6.578 | 0% |
| cad_1x1 | sixteen_from_divider | outer | 90 | 528 | 7.0 / 7.975 / 9.45 | 0% |
| cad_1x1 | sixteen_from_divider | inner | 0 | 527 | 8.4 / 10.4 / 12.3 | 47% |
| cad_1x1 | sixteen_from_divider | inner | 45 | 180 | 6.578 / 7.703 / 8.656 | 0% |
| cad_1x1 | sixteen_from_divider | inner | 90 | 528 | 8.225 / 10.1 / 11.95 | 38% |
| v3_1x2_on_edge_actual | offsets | outer | 0 | 682 | 7.213 / 9.8 / 12.425 | 36% |
| v3_1x2_on_edge_actual | offsets | outer | 45 | 270 | 5.39 / 7.031 / 8.781 | 0% |
| v3_1x2_on_edge_actual | offsets | outer | 90 | 726 | 7.038 / 9.45 / 12.075 | 32% |
| v3_1x2_on_edge_actual | offsets | inner | 0 | 682 | 7.213 / 9.838 / 12.425 | 36% |
| v3_1x2_on_edge_actual | offsets | inner | 45 | 270 | 5.39 / 7.14 / 8.781 | 0% |
| v3_1x2_on_edge_actual | offsets | inner | 90 | 726 | 7.038 / 9.662 / 12.075 | 36% |
| v3_1x2_on_edge_actual | sixteen_from_wall | outer | 0 | 527 | 8.525 / 10.425 / 12.425 | 47% |
| v3_1x2_on_edge_actual | sixteen_from_wall | outer | 45 | 180 | 6.703 / 7.656 / 8.781 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_wall | outer | 90 | 528 | 8.35 / 10.2 / 12.075 | 44% |
| v3_1x2_on_edge_actual | sixteen_from_wall | inner | 0 | 527 | 7.275 / 8.275 / 9.8 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_wall | inner | 45 | 180 | 5.453 / 6.015 / 6.703 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_wall | inner | 90 | 528 | 7.1 / 8.037 / 9.45 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_divider | outer | 0 | 527 | 7.3 / 8.3 / 9.8 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_divider | outer | 45 | 180 | 5.406 / 6.015 / 6.703 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_divider | outer | 90 | 528 | 7.125 / 8.037 / 9.45 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_divider | inner | 0 | 527 | 8.525 / 10.525 / 12.425 | 53% |
| v3_1x2_on_edge_actual | sixteen_from_divider | inner | 45 | 180 | 6.703 / 7.828 / 8.781 | 0% |
| v3_1x2_on_edge_actual | sixteen_from_divider | inner | 90 | 528 | 8.35 / 10.225 / 12.075 | 44% |
| v3_1x2_flat_actual | offsets | outer | 0 | 682 | 7.025 / 9.425 / 12.05 | 32% |
| v3_1x2_flat_actual | offsets | outer | 45 | 252 | 5.203 / 6.781 / 8.406 | 0% |
| v3_1x2_flat_actual | offsets | outer | 90 | 693 | 6.85 / 9.2 / 11.7 | 24% |
| v3_1x2_flat_actual | offsets | inner | 0 | 682 | 7.025 / 9.65 / 12.05 | 36% |
| v3_1x2_flat_actual | offsets | inner | 45 | 252 | 5.203 / 6.828 / 8.406 | 0% |
| v3_1x2_flat_actual | offsets | inner | 90 | 693 | 6.85 / 9.35 / 11.7 | 29% |
| v3_1x2_flat_actual | sixteen_from_wall | outer | 0 | 527 | 8.15 / 10.05 / 12.05 | 41% |
| v3_1x2_flat_actual | sixteen_from_wall | outer | 45 | 180 | 6.328 / 7.281 / 8.406 | 0% |
| v3_1x2_flat_actual | sixteen_from_wall | outer | 90 | 528 | 7.975 / 9.825 / 11.7 | 31% |
| v3_1x2_flat_actual | sixteen_from_wall | inner | 0 | 527 | 7.15 / 8.15 / 9.8 | 0% |
| v3_1x2_flat_actual | sixteen_from_wall | inner | 45 | 180 | 5.328 / 5.828 / 6.328 | 0% |
| v3_1x2_flat_actual | sixteen_from_wall | inner | 90 | 528 | 6.975 / 7.85 / 9.45 | 0% |
| v3_1x2_flat_actual | sixteen_from_divider | outer | 0 | 527 | 7.05 / 8.05 / 9.8 | 0% |
| v3_1x2_flat_actual | sixteen_from_divider | outer | 45 | 180 | 5.25 / 5.828 / 6.328 | 0% |
| v3_1x2_flat_actual | sixteen_from_divider | outer | 90 | 528 | 6.95 / 7.85 / 9.45 | 0% |
| v3_1x2_flat_actual | sixteen_from_divider | inner | 0 | 527 | 8.15 / 10.15 / 12.05 | 41% |
| v3_1x2_flat_actual | sixteen_from_divider | inner | 45 | 180 | 6.328 / 7.453 / 8.406 | 0% |
| v3_1x2_flat_actual | sixteen_from_divider | inner | 90 | 528 | 7.975 / 9.85 / 11.7 | 31% |

## Part B: both quadrants of one straightaway occupied (sampled placements)

Each vehicle sits either pushed toward the 4 in gap between the quadrants or centered in its quadrant along x. Laterally it is at the quadrant edge away from the corridor center, the lane center, or the worst case toward the corridor center. Yaw is 0 or 90 degrees for both. "Planned" cases need a lane change; the others are decided exactly.

| Quadrants | Cases (how decided) | Square passable | Round passable | Round only |
|---|---:|---:|---:|---:|
| offsets | 144 (gap-blocked 128, straight 8, planned 8) | 12 | 12 | 0 |
| sixteen_from_wall | 144 (gap-blocked 140, straight 4, planned 0) | 4 | 4 | 0 |
| sixteen_from_divider | 144 (gap-blocked 140, straight 4, planned 0) | 4 | 4 | 0 |

## Part C: free length a lane change needs (bisection to 0.5 in)

Two vehicles on opposite sides: the west one in the outer lane against the wall-side edge, the east one in the inner lane against the divider-side edge, offsets reading. The robot must move from one gap to the other within the free length between the vehicles.

| Vehicle yaw | Footprint | Free length range (in) | Shortest passable | Longest blocked |
|---:|---|---|---:|---:|
| 0 | square | 4.0–18.9 | 10.984 | 10.519 |
| 0 | round | 4.0–18.9 | 10.519 | 10.053 |
| 90 | square | 4.0–19.6 | 11.8 | 11.312 |
| 90 | round | 4.0–19.6 | 10.825 | 10.337 |

## Reading this

- **Part A is a necessary condition only.** A gap of 10.5 in beside one vehicle is required to pass it without contact. When both quadrants of a straight are occupied, the robot must also get from one gap to the other within the space between the vehicles. Part B tests that.
- **Part B is a planning probe, not a guarantee.** It assumes exact geometry, a 0.5 in / 15 degree search lattice and no control error. A real robot needs more margin. Some "not passable" results may reflect the lattice resolution rather than true infeasibility; `atlas.json` records whether each search was exhausted.
- **Uses:** the results feed Q&A items QA01 (round base) and QA03 (vehicle placement), and the December concept review. Contact with an obstacle loses that lap's 25-point bonus. A supervisor that chooses between a gentle contact and a stop needs this map.
