"""Turn one bench_e02 log (telemetry v1 JSON Lines) into one E02-characterization CSV row.

The row records what the log measured (steady output rpm at the full-duty step, any fault stop) and
links the raw log by SHA-256. Everything the log cannot know stays blank for the operator: bus
voltage, torque, current, temperature, instruments, operator and timestamps. Nothing is invented.
Append the printed row to your copy of the E02 template under measurements/, then check it with
node tools/mule-measurements-v10.js --kind E02 --input <copy> --output <new> --progress.

Usage: python -I tools/bench/log_to_e02.py --motor left|right --bus-case minimum|nominal|maximum --run 1|2|3 LOG.jsonl
"""
import argparse
import csv
import hashlib
import io
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import telemetry_schema  # noqa: E402
from fit_motor import segments, steady_rpm  # noqa: E402

COLUMNS = ["trial_id", "motor", "bus_case", "bus_v", "driver_id", "run", "rpm", "torque_nm", "current_a", "temperature_c",
           "thermal_or_protection_fault", "notes", "session_id", "configuration_id", "recorded_at", "operator_id",
           "instrument_ids", "calibration_check_id", "setup_record_id", "control_revision", "warmup_record_id",
           "uncertainty_record_id", "raw_observation_ref", "attempt_status", "exclusion_reason", "replaces_trial_id"]


def row_from_log(text, log_name, motor, bus_case, run):
    lines = text.splitlines()
    problems = telemetry_schema.validate_lines(lines)
    if problems:
        raise SystemExit(f"{log_name}: {problems[0]}")
    records = [json.loads(line) for line in lines if line.strip()]
    full = [s for s in segments(records, motor) if s["duty"] == 1.0]
    stops = sorted({r["stop_reason"] for r in records if r["stop_reason"] not in (None, "not_armed")})
    row = {c: "" for c in COLUMNS}
    row.update({
        "trial_id": f"E02-{motor}-{bus_case}-{run}",
        "motor": motor, "bus_case": bus_case, "run": str(run),
        "rpm": f"{steady_rpm(full[0], motor):.2f}" if full else "",
        "thermal_or_protection_fault": "true" if stops and stops != ["auto_stop"] else "",
        "notes": "rpm from the duty-1.0 step of the bench log (second half of the hold); " + (f"stop reasons: {', '.join(stops)}" if stops else "no stop reason logged"),
        "raw_observation_ref": f"{log_name} sha256:{hashlib.sha256(text.encode('utf-8')).hexdigest()}",
    })
    return row


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--motor", choices=["left", "right"], required=True)
    parser.add_argument("--bus-case", choices=["minimum", "nominal", "maximum"], required=True)
    parser.add_argument("--run", type=int, choices=[1, 2, 3], required=True)
    parser.add_argument("log")
    args = parser.parse_args(argv)
    text = pathlib.Path(args.log).read_text(encoding="utf-8")
    row = row_from_log(text, pathlib.Path(args.log).name, args.motor, args.bus_case, args.run)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=COLUMNS, lineterminator="\n")
    writer.writerow(row)
    sys.stdout.write(buffer.getvalue())
    return row


if __name__ == "__main__":
    main()
