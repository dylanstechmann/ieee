"""Lap study v10: contact-free laps, lap and mission times, and expected score over random layouts.

Agent-run synthetic study for the owner's hobby/learning project. For seeded random Appendix E
layouts (three of four quadrants occupied, random lanes, positions and yaw) on the organizer CAD
field, each straightaway is decided exactly when possible:
- blocked: a vehicle leaves no 10.5 in gap, so contact is unavoidable;
- straight: one straight line clears every vehicle.
Otherwise hybrid-A* checks a lane change. Times and scores come from software/stockcar/lapmodel.py,
whose assumptions are explicit. Perfect knowledge, guide-size vehicles, no control error.

Usage: python -I tools/lap-study-v10.py
"""
import hashlib
import json
import math
import pathlib
import random
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import lapmodel as L  # noqa: E402
from stockcar.field import Field  # noqa: E402
from stockcar.obstacles import GUIDE_PLUSH, center_range, footprint  # noqa: E402
from stockcar.passage import common_line, free_center_intervals  # noqa: E402
from stockcar.planner import Footprint, plan  # noqa: E402

OUT = ROOT / "derived" / "lap-study-v10"
DATE = "2026-11-03"
N_PER_CELL = 200
SEED = 20261103
READINGS = ("offsets", "sixteen_from_wall", "sixteen_from_divider")
YAW_MODES = ("aligned", "random")
QUADS = ("low_west", "low_east", "high_west", "high_east")
MAX_EXPANSIONS = 25000
P_EXCHANGE = 0.7
INPUTS = ["tools/lap-study-v10.py", "software/stockcar/lapmodel.py", "software/stockcar/passage.py",
          "software/stockcar/field.py", "software/stockcar/obstacles.py", "software/stockcar/planner.py",
          "software/stockcar/geometry.py", "derived/organizer-cad-v10/field-v10.json"]


def r3(v):
    return None if v is None else round(v, 3)


def sample_layout(rng, field, reading, yaw_mode):
    quads = field.quadrants(reading)
    empty = rng.choice(QUADS)
    vehicles = []
    for name in QUADS:
        if name == empty:
            continue
        side = "low" if name.startswith("low") else "high"
        lane = rng.choice(("outer", "inner"))
        for _ in range(20):
            yaw = rng.choice((0.0, math.pi / 2)) if yaw_mode == "aligned" else rng.uniform(0.0, math.pi)
            allowed = center_range(quads[name], side, lane, GUIDE_PLUSH, yaw)
            if allowed:
                break
        else:
            raise RuntimeError(f"no legal placement in {name} {lane}")
        cx = rng.uniform(*allowed[0])
        cy = rng.uniform(*allowed[1])
        vehicles.append({"quadrant": name, "side": side, "lane": lane, "center_in": [cx, cy], "yaw_rad": yaw})
    return empty, vehicles


def to_low_corridor(v):
    """Mirror a high-side vehicle into the low corridor (the field is symmetric about y = 24)."""
    cx, cy = v["center_in"]
    if v["side"] == "low":
        return cx, cy, v["yaw_rad"]
    return cx, 48.0 - cy, -v["yaw_rad"]


def straight_outcome(band, vehicles):
    if not vehicles:
        return {"mode": "straight", "vehicles": 0}
    polys = [footprint(GUIDE_PLUSH, *to_low_corridor(v)) for v in vehicles]
    intervals = [free_center_intervals(band, p) for p in polys]
    blocked = sum(1 for iv in intervals if not iv)
    if blocked:
        return {"mode": "contact", "contacts": blocked, "vehicles": len(vehicles), "how": "gap-blocked"}
    if common_line(intervals):
        return {"mode": "straight", "vehicles": len(vehicles)}
    result = plan(Footprint("square"), band, polys, 38.0, 86.0, margin=0.25, max_expansions=MAX_EXPANSIONS)
    if result["found"]:
        return {"mode": "lane_change", "path_cost_in": result["cost"], "vehicles": len(vehicles), "how": "planned"}
    how = "planned-no-path" if result.get("exhausted") else "planned-undetermined"
    return {"mode": "contact", "contacts": 1, "vehicles": len(vehicles), "how": how}


def evaluate(reading, yaw_mode, rng, field):
    band = field.corridor("low")
    rows = []
    for _ in range(N_PER_CELL):
        empty, vehicles = sample_layout(rng, field, reading, yaw_mode)
        straights = [straight_outcome(band, [v for v in vehicles if v["side"] == side]) for side in ("low", "high")]
        contact_free = all(s["mode"] != "contact" for s in straights)
        row = {"empty_quadrant": empty, "straights": straights, "contact_free": contact_free, "by_envelope": {}}
        for name, env in L.ENVELOPES.items():
            lap = L.lap_time(env, straights)
            mission = L.mission_time(env, lap)
            row["by_envelope"][name] = {"lap_s": r3(lap), "mission_s": r3(mission),
                                        "score_with_exchange": L.expected_score(mission, contact_free, P_EXCHANGE, True),
                                        "score_drive_only": L.expected_score(L.mission_time(env, lap, exchange=False), contact_free, exchange=False)}
        rows.append(row)
    return rows


def aggregate(rows):
    out = {"layouts": len(rows), "contact_free_share": r3(sum(r["contact_free"] for r in rows) / len(rows)),
           "straight_modes": {}, "by_envelope": {}}
    for s in ("straight", "lane_change", "contact"):
        out["straight_modes"][s] = sum(st["mode"] == s for r in rows for st in r["straights"])
    out["undetermined_searches"] = sum(st.get("how") == "planned-undetermined" for r in rows for st in r["straights"])
    for name in L.ENVELOPES:
        missions = [r["by_envelope"][name]["mission_s"] for r in rows]
        out["by_envelope"][name] = {
            "mission_s_median": r3(statistics.median(missions)), "mission_s_max": r3(max(missions)),
            "share_under_165_s": r3(sum(m < L.BONUS_S for m in missions) / len(missions)),
            "score_with_exchange_mean": r3(statistics.mean(r["by_envelope"][name]["score_with_exchange"] for r in rows)),
            "score_drive_only_mean": r3(statistics.mean(r["by_envelope"][name]["score_drive_only"] for r in rows)),
        }
    return out


def summary_md(cells):
    lines = [
        "# Lap study v10: summary",
        "",
        f"{DATE}. Agent-run synthetic study: {N_PER_CELL} seeded random Appendix E layouts per row, on the organizer CAD field, with guide-size plush vehicles (about 8.55 x 8.2 in) and a 10 x 10 in robot keeping 0.25 in clear. Perfect knowledge and no control error. Time and score assumptions are in `software/stockcar/lapmodel.py`; the exchange succeeds with probability {P_EXCHANGE} when attempted.",
        "",
        "## Contact-free laps",
        "",
        "| Quadrant reading | Vehicle yaw | Layouts with contact-free laps | Straights: clean line / lane change / contact |",
        "|---|---|---:|---|",
    ]
    for c in cells:
        a = c["aggregate"]
        m = a["straight_modes"]
        lines.append(f"| {c['reading']} | {c['yaw_mode']} | {100 * a['contact_free_share']:.1f}% ({sum(r['contact_free'] for r in c['layouts'])} of {a['layouts']}) | {m['straight']} / {m['lane_change']} / {m['contact']} |")
    lines += [
        "",
        "## Mission time and expected score by speed setting",
        "",
        "| Quadrant reading | Yaw | Speed | Mission median (s) | Mission max (s) | Under 165 s | Mean score, exchange attempted | Mean score, drive only |",
        "|---|---|---|---:|---:|---:|---:|---:|",
    ]
    for c in cells:
        for name, e in c["aggregate"]["by_envelope"].items():
            lines.append(f"| {c['reading']} | {c['yaw_mode']} | {name} ({L.ENVELOPES[name]['cruise']:g} in/s) | {e['mission_s_median']} | {e['mission_s_max']} | {100 * e['share_under_165_s']:.1f}% | {e['score_with_exchange_mean']} | {e['score_drive_only_mean']} |")
    lines += [
        "",
        "## Reading this",
        "",
        "- **Contact-free laps depend on vehicle size.** With guide-size vehicles they are the exception: most layouts force at least one contact per lap, and the same layout repeats on all three laps. Measure the official vehicles before investing in obstacle avoidance.",
        "- **Time is not the binding constraint once laps use arcs instead of stop-and-spin.** Even at the v9 cruise speed the modeled missions finish well under 165 s. The v9 timeouts came from its stop-spin-settle route, not from the motors.",
        "- **Score-like numbers are planning arithmetic,** not predictions. They assume clean walls, a working start, parking and a raised flag.",
        "",
    ]
    return "\n".join(lines)


def main():
    rng = random.Random(SEED)
    field = Field(divider="cad_1x1")
    cells = []
    for reading in READINGS:
        for yaw_mode in YAW_MODES:
            rows = evaluate(reading, yaw_mode, rng, field)
            cells.append({"reading": reading, "yaw_mode": yaw_mode, "aggregate": aggregate(rows), "layouts": rows})
            print(reading, yaw_mode, cells[-1]["aggregate"]["contact_free_share"], flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    study = {"version": "0.10.0", "date": DATE, "seed": SEED, "status": "agent-run synthetic study; not hardware, not legality",
             "vehicle": GUIDE_PLUSH, "p_exchange": P_EXCHANGE, "envelopes": L.ENVELOPES, "cells": cells}
    files = {"study.json": json.dumps(study, indent=1) + "\n", "summary.md": summary_md(cells)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": study["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
