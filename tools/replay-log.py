"""Reruns a mission log (schemas/mission-log-v1.json) through the estimator and supervisor.

Reports how the rerun compares with what the log recorded. --sensing tries another sensing mode on the
same log, which is the point: a recorded run can answer "what would ranges alone have done here?".

Usage: python -I tools/replay-log.py LOG.jsonl [--sensing MODE] [--poses-csv OUT.csv]
"""
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import replay  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("log", type=pathlib.Path)
    parser.add_argument("--sensing", choices=replay.SENSING)
    parser.add_argument("--poses-csv", type=pathlib.Path)
    args = parser.parse_args()
    header, records = replay.loads(args.log.read_text(encoding="utf-8"))
    problems = replay.validate(header, records)
    if problems:
        print("\n".join(problems[:20]))
        return 1
    result = replay.replay(header, records, sensing=args.sensing)
    report = replay.compare(records, result)
    est = result["estimator"]
    x, y, heading = result["poses"][-1]
    print(f"{len(records)} ticks, {records[-1]['t_s']:.2f} s, sensing {args.sensing or header['sensing']}")
    print(f"final estimate: x {x:.2f} in, y {y:.2f} in, heading {heading:.3f} rad; final state {result['states'][-1]}")
    print(f"updates: {est.line_updates} line, {est.line_skipped} shallow crossings skipped, {est.range_updates} range, {est.range_rejected} range rejected, {est.bias_updates} gyro bias")
    gap = report["largest_pose_difference"]
    print(f"against the log: largest pose difference {'n/a' if gap is None else format(gap, '.6g')}, supervisor state mismatches {report['state_mismatches']}")
    if args.poses_csv:
        lines = ["t_s,x_in,y_in,heading_rad,state"] + [f"{r['t_s']:.3f},{p[0]:.4f},{p[1]:.4f},{p[2]:.5f},{s}" for r, p, s in zip(records, result["poses"], result["states"])]
        args.poses_csv.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
