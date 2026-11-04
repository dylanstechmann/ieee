"""Analyze a filled E04 tire-handling DOE sheet (derived/tire-fixture-v10/doe-round1.csv format).

Reports per concept: acquisition, retention and release rates with Wilson 95% intervals, per-cell
acquisition, main effects of each factor level, and the E04 acceptance check (at least 48/50 pickups,
at least 4/5 per cell, 20/20 retention, 20/20 release). Rows with an empty `acquired` cell count as
not yet run and are excluded. Results describe the fixture and replicas tested, not the field.

Usage: python -I tools/analyze_e04_v10.py FILLED.csv
"""
import csv
import json
import math
import sys

FACTORS = ("lateral_offset_mm", "longitudinal_offset_mm", "approach_yaw_deg")
TRUE = {"true", "yes", "1", "y", "t"}
FALSE = {"false", "no", "0", "n", "f"}


def wilson(successes, n, z=1.96):
    if n == 0:
        return None
    p = successes / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return [round(center - half, 4), round(center + half, 4)]


def flag(value):
    v = (value or "").strip().lower()
    if v in TRUE:
        return True
    if v in FALSE:
        return False
    return None


def rate(rows, key):
    vals = [flag(r[key]) for r in rows if flag(r[key]) is not None]
    s = sum(vals)
    return {"successes": s, "n": len(vals), "rate": round(s / len(vals), 4) if vals else None, "wilson95": wilson(s, len(vals))}


def analyze(rows):
    done = [r for r in rows if flag(r.get("acquired")) is not None]
    out = {}
    for concept in sorted({r["concept"] for r in done}):
        rs = [r for r in done if r["concept"] == concept]
        cells = {}
        for r in rs:
            cells.setdefault(r["cell"], []).append(r)
        per_cell = {c: rate(v, "acquired") for c, v in sorted(cells.items())}
        effects = {}
        for f in FACTORS:
            levels = {}
            for r in rs:
                levels.setdefault(r[f], []).append(r)
            effects[f] = {lvl: rate(v, "acquired")["rate"] for lvl, v in sorted(levels.items(), key=lambda kv: float(kv[0]))}
        acquired = rate(rs, "acquired")
        retained = rate([r for r in rs if flag(r["acquired"])], "retained_after_shake")
        released = rate([r for r in rs if flag(r["acquired"])], "released_in_box")
        acceptance = {
            "pickups_at_least_48_of_50": acquired["n"] >= 50 and acquired["successes"] >= 48 * acquired["n"] / 50,
            "every_cell_at_least_4_of_5": all(c["n"] >= 5 and c["successes"] >= 0.8 * c["n"] for c in per_cell.values()),
            "retention_20_of_20": retained["n"] >= 20 and retained["successes"] == retained["n"],
            "release_20_of_20": released["n"] >= 20 and released["successes"] == released["n"],
        }
        out[concept] = {"runs": len(rs), "acquired": acquired, "retained": retained, "released": released,
                        "per_cell": per_cell, "main_effects": effects, "e04_acceptance": acceptance,
                        "e04_pass": all(acceptance.values())}
    return out


def main(path):
    with open(path, newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    result = analyze(rows)
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main(sys.argv[1])
