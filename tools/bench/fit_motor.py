"""Fit a simple DC-motor model to E02 bench logs (telemetry v1 JSON Lines from firmware bench_e02).

Steady state: rpm = k * (duty - deadband) for duty above the deadband (least squares over the
duty steps). Dynamics: first-order time constant from the first step (time to 63% of its change).
Writes a calibration JSON for the simulator and the firmware feed-forward. A fit to bench data is not
a validated motor model; record the bus voltage, wheel load and temperature with every log.

Usage: python -I tools/bench/fit_motor.py --side left|right --output calibration/motor-<date>.json LOG.jsonl [...]
"""
import argparse
import hashlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import telemetry_schema  # noqa: E402


def load(paths):
    records = []
    for path in paths:
        text = pathlib.Path(path).read_text(encoding="utf-8")
        problems = telemetry_schema.validate_lines(text.splitlines())
        if problems:
            raise SystemExit(f"{path}: {problems[0]}")
        records.extend(json.loads(line) for line in text.splitlines() if line.strip())
    return records


def segments(records, side):
    """Consecutive runs of records with the same non-zero commanded duty on one side."""
    k = 0 if side == "left" else 1
    out = []
    current = None
    for r in records:
        duty = r["cmd"][k]
        if current is None or duty != current["duty"]:
            current = {"duty": duty, "records": []}
            out.append(current)
        current["records"].append(r)
    return [s for s in out if s["duty"] not in (0, 0.0) and len(s["records"]) >= 4]


def steady_rpm(segment, side):
    k = 0 if side == "left" else 1
    rows = segment["records"]
    tail = rows[len(rows) // 2:]
    return sum(r["rpm"][k] for r in tail) / len(tail)


def time_constant(segment, side, steady):
    k = 0 if side == "left" else 1
    rows = segment["records"]
    t0 = rows[0]["t_ms"]
    target = 0.632 * steady
    for r in rows:
        if abs(r["rpm"][k]) >= abs(target):
            return (r["t_ms"] - t0) / 1000.0
    return None


def fit(records, side):
    segs = segments(records, side)
    points = [(s["duty"], steady_rpm(s, side)) for s in segs]
    moving = [(d, w) for d, w in points if abs(w) > 1e-6]
    if len(moving) < 2:
        raise ValueError("need at least two duty steps with motion")
    n = len(moving)
    mean_d = sum(d for d, _ in moving) / n
    mean_w = sum(w for _, w in moving) / n
    sxx = sum((d - mean_d) ** 2 for d, _ in moving)
    sxy = sum((d - mean_d) * (w - mean_w) for d, w in moving)
    k = sxy / sxx
    intercept = mean_w - k * mean_d
    deadband = -intercept / k
    residual = (sum((w - (k * d + intercept)) ** 2 for d, w in moving) / n) ** 0.5
    tau = time_constant(segs[0], side, points[0][1]) if segs else None
    return {"k_rpm_per_duty": round(k, 3), "deadband_duty": round(deadband, 4), "tau_s": tau,
            "rms_residual_rpm": round(residual, 3), "points": [[d, round(w, 3)] for d, w in points]}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--side", choices=["left", "right"], required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("logs", nargs="+")
    args = parser.parse_args(argv)
    out = pathlib.Path(args.output)
    if out.exists():
        raise SystemExit(f"{out} exists; calibration files are never overwritten")
    result = fit(load(args.logs), args.side)
    result.update({
        "schema": "motor-calibration/v1", "side": args.side,
        "status": "least-squares fit to bench logs; not a validated motor model",
        "source_logs": {p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in args.logs},
    })
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: result[k] for k in ("k_rpm_per_duty", "deadband_duty", "tau_s", "rms_residual_rpm")}))
    return result


if __name__ == "__main__":
    main()
