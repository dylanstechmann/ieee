"""Passability atlas v10: can a 10 in robot pass the Appendix E obstacles without contact?

Agent-run geometric study for the owner's hobby/learning project. Perfect knowledge of a nominal CAD
field (derived/organizer-cad-v10) and the organizer guide's approximate plush vehicle; no sensing,
control error or legality judgment. Writes derived/passability-atlas-v10.

Part A (exhaustive, analytic): every placement on a 0.25 in grid, for each quadrant reading, divider
variant, lane and yaw. Records the widest straight-line gap beside the vehicle, against the 10 in robot
plus 0.25 in margins on each side.
Part B (sampled, planned): both quadrants of one straightaway occupied, in every lane combination,
with each vehicle pushed toward the 4 in gap and either centered in its lane or placed worst-case
toward the corridor center. Hybrid-A* (software/stockcar/planner.py) checks a square 10 x 10 in and a
round 10 in footprint.

Usage: python -I tools/atlas-v10.py
"""
import hashlib
import json
import math
import pathlib
import statistics
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar.field import FIELD_FILE, Field  # noqa: E402
from stockcar.obstacles import GUIDE_PLUSH, center_range, footprint, placements, straight_pass_gap  # noqa: E402
from stockcar.planner import Footprint, plan  # noqa: E402

OUT = ROOT / "derived" / "passability-atlas-v10"
DATE = "2026-11-03"
ROBOT_WIDTH = 10.0
MARGIN = 0.25
NEED = ROBOT_WIDTH + 2 * MARGIN
INTERPRETATIONS = ("offsets", "sixteen_from_wall", "sixteen_from_divider")
DIVIDERS = ("cad_1x1", "v3_1x2_on_edge_actual", "v3_1x2_flat_actual")
YAWS = {"0": 0.0, "45": math.pi / 4, "90": math.pi / 2}
LANES = ("outer", "inner")
MAX_EXPANSIONS = 40000
LATERAL = ("edge", "lane_center", "worst")
INPUTS = ["tools/atlas-v10.py", "software/stockcar/geometry.py", "software/stockcar/field.py",
          "software/stockcar/obstacles.py", "software/stockcar/planner.py", "derived/organizer-cad-v10/field-v10.json"]


def r3(v):
    return None if v is None else round(v, 3)


def part_a():
    rows = []
    for divider in DIVIDERS:
        field = Field(divider=divider)
        corridor = field.corridor("low")
        for interp in INTERPRETATIONS:
            quad = field.quadrants(interp)["low_west"]
            for lane in LANES:
                for yaw_name, yaw in YAWS.items():
                    cells = placements(quad, "low", lane, GUIDE_PLUSH, yaws=(yaw,), step=0.25)
                    if not cells:
                        rows.append({"divider": divider, "quadrants": interp, "lane": lane, "yaw_deg": yaw_name, "placements": 0})
                        continue
                    gaps = [straight_pass_gap(corridor, GUIDE_PLUSH, cx, cy, yaw) for cx, cy, yaw in cells]
                    rows.append({
                        "divider": divider, "quadrants": interp, "lane": lane, "yaw_deg": yaw_name,
                        "corridor_in": [r3(corridor[0]), r3(corridor[1])], "placements": len(gaps),
                        "gap_min_in": r3(min(gaps)), "gap_median_in": r3(statistics.median(gaps)), "gap_max_in": r3(max(gaps)),
                        "share_passable": r3(sum(g >= NEED for g in gaps) / len(gaps)),
                    })
    return rows


def free_center_intervals(band, obstacle):
    """y intervals where a straight-driving 10 in robot center clears one vehicle (with margins)."""
    oy0 = min(p[1] for p in obstacle)
    oy1 = max(p[1] for p in obstacle)
    half = ROBOT_WIDTH / 2 + MARGIN
    lo, hi = band[0] + half, band[1] - half
    out = []
    if oy0 - half >= lo:
        out.append((lo, min(hi, oy0 - half)))
    if oy1 + half <= hi:
        out.append((max(lo, oy1 + half), hi))
    return [iv for iv in out if iv[0] <= iv[1]]


def extreme_center(quad, side, lane, yaw, toward_gap_x, lateral, longitudinal="toward_gap"):
    rng = center_range(quad, side, lane, GUIDE_PLUSH, yaw)
    if rng is None:
        return None
    (x0, x1), (y0, y1) = rng
    if longitudinal == "toward_gap":
        cx = x1 if toward_gap_x == "east" else x0
    else:
        cx = (x0 + x1) / 2
    corridor_center_high = lane == "outer"  # low side: the outer lane is at low y, so its worst case is high y
    if lateral == "lane_center":
        cy = (y0 + y1) / 2
    elif lateral == "worst":
        cy = y1 if corridor_center_high else y0
    else:  # "edge": hugging the quadrant boundary away from the corridor center
        cy = y0 if corridor_center_high else y1
    return cx, cy, yaw


def part_b():
    field = Field(divider="cad_1x1")
    band = field.corridor("low")
    cases = []
    for interp in INTERPRETATIONS:
        quads = field.quadrants(interp)
        for lane_w in LANES:
            for lane_e in LANES:
                for yaw_name in ("0", "90"):
                    yaw = YAWS[yaw_name]
                    for lat_w in LATERAL:
                        for lat_e in LATERAL:
                          for longitudinal in ("toward_gap", "quadrant_center"):
                            west = extreme_center(quads["low_west"], "low", lane_w, yaw, "east", lat_w, longitudinal)
                            east = extreme_center(quads["low_east"], "low", lane_e, yaw, "west", lat_e, longitudinal)
                            case = {"quadrants": interp, "lanes": [lane_w, lane_e], "yaw_deg": yaw_name, "lateral": [lat_w, lat_e], "longitudinal": longitudinal}
                            if west is None or east is None:
                                case["result"] = "no-legal-placement"
                                cases.append(case)
                                continue
                            obstacles = [footprint(GUIDE_PLUSH, *west), footprint(GUIDE_PLUSH, *east)]
                            case["centers_in"] = [[r3(v) for v in west[:2]], [r3(v) for v in east[:2]]]
                            case["straight_gaps_in"] = [r3(straight_pass_gap(band, GUIDE_PLUSH, *west)), r3(straight_pass_gap(band, GUIDE_PLUSH, *east))]
                            lanes_w = free_center_intervals(band, obstacles[0])
                            lanes_e = free_center_intervals(band, obstacles[1])
                            if not lanes_w or not lanes_e:
                                case["method"] = "gap-blocked"  # exact: some vehicle leaves no 10.5 in gap
                                for kind in ("square", "round"):
                                    case[kind] = {"passable": False}
                            elif any(a[0] <= b[1] and b[0] <= a[1] for a in lanes_w for b in lanes_e):
                                case["method"] = "straight"  # exact: one straight line clears both vehicles
                                for kind in ("square", "round"):
                                    case[kind] = {"passable": True}
                            else:
                                case["method"] = "planned"  # a lane change between the vehicles is required
                                for kind in ("square", "round"):
                                    result = plan(Footprint(kind), band, obstacles, 38.0, 86.0, margin=MARGIN, max_expansions=MAX_EXPANSIONS)
                                    undetermined = not result["found"] and not result.get("exhausted")
                                    case[kind] = {"passable": None if undetermined else result["found"],
                                                  "min_clearance_in": result["min_clearance_in"], "path_cost_in": result["cost"],
                                                  "expansions": result["expansions"]}
                            cases.append(case)
    return cases


def part_c():
    """Shortest free length between two vehicles on opposite sides that still allows a lane change."""
    field = Field(divider="cad_1x1")
    band = field.corridor("low")
    quads = field.quadrants("offsets")
    rows = []
    for yaw_name in ("0", "90"):
        yaw = YAWS[yaw_name]
        (wx0, wx1), (wy0, wy1) = center_range(quads["low_west"], "low", "outer", GUIDE_PLUSH, yaw)
        (ex0, ex1), (ey0, ey1) = center_range(quads["low_east"], "low", "inner", GUIDE_PLUSH, yaw)
        hx = max(abs(p[0]) for p in footprint(GUIDE_PLUSH, 0.0, 0.0, yaw))
        mid = (quads["low_west"][2] + quads["low_east"][0]) / 2
        g_min = (ex0 - hx) - (wx1 + hx)
        g_max = (ex1 - hx) - (wx0 + hx)

        def layout(gap):
            west = (mid - gap / 2 - hx, wy0, yaw)  # outer lane, hugging the wall side
            east = (mid + gap / 2 + hx, ey1, yaw)  # inner lane, hugging the divider side
            return [footprint(GUIDE_PLUSH, *west), footprint(GUIDE_PLUSH, *east)]

        for kind in ("square", "round"):
            fp = Footprint(kind)
            ok_hi = plan(fp, band, layout(g_max), 38.0, 86.0, margin=MARGIN, max_expansions=MAX_EXPANSIONS)["found"]
            ok_lo = plan(fp, band, layout(g_min), 38.0, 86.0, margin=MARGIN, max_expansions=MAX_EXPANSIONS)["found"]
            row = {"yaw_deg": yaw_name, "footprint": kind, "gap_range_in": [r3(g_min), r3(g_max)],
                   "passable_at_min_gap": ok_lo, "passable_at_max_gap": ok_hi}
            if ok_hi and not ok_lo:
                lo, hi = g_min, g_max
                while hi - lo > 0.5:
                    m = (lo + hi) / 2
                    if plan(fp, band, layout(m), 38.0, 86.0, margin=MARGIN, max_expansions=MAX_EXPANSIONS)["found"]:
                        hi = m
                    else:
                        lo = m
                row["shortest_passable_gap_in"] = r3(hi)
                row["longest_blocked_gap_in"] = r3(lo)
            rows.append(row)
    return rows


def summarize(a_rows, b_cases, c_rows):
    lines = [
        "# Passability atlas v10: summary",
        "",
        f"{DATE}. Agent-run geometry with perfect knowledge. Field: organizer CAD (June 2026) as extracted. Vehicle: the guide's plush car, about 8.55 x 8.2 in. A pass needs a gap of at least {NEED} in: the 10 in robot plus {MARGIN} in on each side. No sensing, control error or rules ruling is included.",
        "",
        "## Part A: one vehicle, straight pass beside it (every placement on a 0.25 in grid)",
        "",
        "Share of placements that leave a gap of at least 10.5 in, by divider variant, quadrant reading, lane and vehicle yaw:",
        "",
        "| Divider | Quadrants | Lane | Yaw | Placements | Gap min / median / max (in) | Passable |",
        "|---|---|---|---:|---:|---|---:|",
    ]
    for r in a_rows:
        if not r["placements"]:
            lines.append(f"| {r['divider']} | {r['quadrants']} | {r['lane']} | {r['yaw_deg']} | 0 | no legal placement | — |")
            continue
        lines.append(f"| {r['divider']} | {r['quadrants']} | {r['lane']} | {r['yaw_deg']} | {r['placements']} | {r['gap_min_in']} / {r['gap_median_in']} / {r['gap_max_in']} | {round(100 * r['share_passable'])}% |")
    planned = [c for c in b_cases if "square" in c]
    lines += [
        "",
        "## Part B: both quadrants of one straightaway occupied (sampled placements)",
        "",
        "Each vehicle sits either pushed toward the 4 in gap between the quadrants or centered in its quadrant along x. Laterally it is at the quadrant edge away from the corridor center, the lane center, or the worst case toward the corridor center. Yaw is 0 or 90 degrees for both. \"Planned\" cases need a lane change; the others are decided exactly.",
        "",
        "| Quadrants | Cases (how decided) | Square passable | Round passable | Round only |",
        "|---|---:|---:|---:|---:|",
    ]
    for interp in INTERPRETATIONS:
        cs = [c for c in planned if c["quadrants"] == interp]
        sq = sum(c["square"]["passable"] is True for c in cs)
        ro = sum(c["round"]["passable"] is True for c in cs)
        only = sum(c["round"]["passable"] is True and c["square"]["passable"] is False for c in cs)
        und = sum(c[k]["passable"] is None for c in cs for k in ("square", "round"))
        methods = ", ".join(f"{m} {sum(c['method'] == m for c in cs)}" for m in ("gap-blocked", "straight", "planned"))
        lines.append(f"| {interp} | {len(cs)} ({methods}) | {sq} | {ro} | {only}{f'; {und} undetermined' if und else ''} |")
    missing = len(b_cases) - len(planned)
    if missing:
        lines.append(f"\n{missing} sampled cases had no legal placement under their reading and were skipped.")
    lines += [
        "",
        "## Part C: free length a lane change needs (bisection to 0.5 in)",
        "",
        "Two vehicles on opposite sides: the west one in the outer lane against the wall-side edge, the east one in the inner lane against the divider-side edge, offsets reading. The robot must move from one gap to the other within the free length between the vehicles.",
        "",
        "| Vehicle yaw | Footprint | Free length range (in) | Shortest passable | Longest blocked |",
        "|---:|---|---|---:|---:|",
    ]
    for r in c_rows:
        lines.append(f"| {r['yaw_deg']} | {r['footprint']} | {r['gap_range_in'][0]}–{r['gap_range_in'][1]} | "
                     f"{r.get('shortest_passable_gap_in', 'passable everywhere' if r['passable_at_min_gap'] else 'never')} | "
                     f"{r.get('longest_blocked_gap_in', '—')} |")
    lines += [
        "",
        "## Reading this",
        "",
        "- **Part A is a necessary condition only.** A gap of 10.5 in beside one vehicle is required to pass it without contact. When both quadrants of a straight are occupied, the robot must also get from one gap to the other within the space between the vehicles. Part B tests that.",
        "- **Part B is a planning probe, not a guarantee.** It assumes exact geometry, a 0.5 in / 15 degree search lattice and no control error. A real robot needs more margin. Some \"not passable\" results may reflect the lattice resolution rather than true infeasibility; `atlas.json` records whether each search was exhausted.",
        "- **Uses:** the results feed Q&A items QA01 (round base) and QA03 (vehicle placement), and the December concept review. Contact with an obstacle loses that lap's 25-point bonus. A supervisor that chooses between a gentle contact and a stop needs this map.",
        "",
    ]
    return "\n".join(lines)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    started = time.perf_counter()
    a_rows = part_a()
    b_cases = part_b()
    c_rows = part_c()
    OUT.mkdir(parents=True, exist_ok=True)
    atlas = {
        "version": "0.10.0", "date": DATE,
        "status": "agent-run perfect-knowledge geometry; not a measured field, not legality, not hardware",
        "field": str(FIELD_FILE.relative_to(ROOT)), "vehicle": GUIDE_PLUSH, "robot_width_in": ROBOT_WIDTH, "margin_in": MARGIN,
        "part_a_straight_pass": a_rows, "part_b_two_vehicle_straights": b_cases, "part_c_lane_change_length": c_rows,
    }
    files = {"atlas.json": json.dumps(atlas, indent=2) + "\n", "summary.md": summarize(a_rows, b_cases, c_rows)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {
        "date": DATE, "status": atlas["status"],
        "input_hashes": {f: sha256(ROOT / f) for f in INPUTS},
        "output_hashes": {name: hashlib.sha256(text.encode("utf-8")).hexdigest() for name, text in files.items()},
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} in {time.perf_counter() - started:.0f} s: {len(a_rows)} part-A rows, {len(b_cases)} part-B cases, {len(c_rows)} part-C rows")


if __name__ == "__main__":
    main()
