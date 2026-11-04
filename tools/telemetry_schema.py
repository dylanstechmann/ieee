"""Standard-library validator for telemetry records (schemas/telemetry-v1.json).

validate(record) returns a list of problems; an empty list means the record is valid.
Usage as a script: python -I tools/telemetry_schema.py LOG.jsonl
"""
import json
import sys

REQUIRED = ("v", "seq", "t_ms", "mode", "enc", "cmd", "pwm", "rpm", "i_a", "vbat", "estop", "stop_reason", "loop_us")
MODES = ("IDLE", "BENCH", "DRIVE")
STOPS = (None, "not_armed", "estop", "auto_stop", "command_watchdog", "loop_overrun", "driver_fault")


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value):
    return (isinstance(value, (int, float)) and not isinstance(value, bool))


def _pair(value, allow_null_items=True):
    return (isinstance(value, list) and len(value) == 2
            and all(_is_number(x) or (allow_null_items and x is None) for x in value))


def validate(record):
    problems = []
    if not isinstance(record, dict):
        return ["record is not an object"]
    for key in REQUIRED:
        if key not in record:
            problems.append(f"missing {key}")
    extra = set(record) - set(REQUIRED)
    if extra:
        problems.append(f"unexpected keys {sorted(extra)}")
    if problems:
        return problems
    if record["v"] != 1:
        problems.append("v must be 1")
    if not (_is_int(record["seq"]) and record["seq"] >= 0):
        problems.append("seq must be a non-negative integer")
    if not _is_int(record["t_ms"]):
        problems.append("t_ms must be an integer")
    if record["mode"] not in MODES:
        problems.append("mode must be IDLE, BENCH or DRIVE")
    if not (isinstance(record["enc"], list) and len(record["enc"]) == 2 and all(_is_int(x) for x in record["enc"])):
        problems.append("enc must be two integers")
    for key in ("cmd", "pwm", "rpm"):
        if not _pair(record[key]):
            problems.append(f"{key} must be two numbers")
    if record["i_a"] is not None and not _pair(record["i_a"]):
        problems.append("i_a must be null or two numbers")
    if record["vbat"] is not None and not _is_number(record["vbat"]):
        problems.append("vbat must be null or a number")
    if not isinstance(record["estop"], bool):
        problems.append("estop must be a boolean")
    if record["stop_reason"] not in STOPS:
        problems.append("stop_reason is not a known value")
    if not (_is_int(record["loop_us"]) and record["loop_us"] >= 0):
        problems.append("loop_us must be a non-negative integer")
    return problems


def validate_lines(lines):
    problems = []
    for n, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except ValueError as error:
            problems.append(f"line {n}: not JSON ({error})")
            continue
        problems.extend(f"line {n}: {p}" for p in validate(record))
    return problems


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as handle:
        found = validate_lines(handle)
    print("\n".join(found) if found else "valid")
    sys.exit(1 if found else 0)
