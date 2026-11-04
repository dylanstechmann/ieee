# E02 motor characterization (open-loop duty steps), run only inside an approved, supervised,
# current-limited bench setup (derived/drivetrain-mule-v4/bench-readiness.md, gates R2-R4).
# Wheels off the ground. Logs to RAM, then writes /e02-<run>.jsonl after the motors stop.

DEFAULT_STEPS = (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0)


def schedule(steps=DEFAULT_STEPS, hold_ms=2000, settle_ms=500):
    """(start_ms, end_ms, duty) segments: each step held, with zero-duty gaps between them."""
    plan = []
    t = 0
    for duty in steps:
        plan.append((t, t + hold_ms, duty))
        t += hold_ms + settle_ms
    return plan, t


def duty_at(plan, elapsed_ms):
    for start, end, duty in plan:
        if start <= elapsed_ms < end:
            return duty
    return 0.0


def run(runner, motor="both", steps=DEFAULT_STEPS, hold_ms=2000, settle_ms=500):
    plan, total_ms = schedule(steps, hold_ms, settle_ms)
    if not runner.arm():
        return "not armed: release the e-stop and zero the commands"
    start_ms = runner.hal.ticks_ms()
    deadline = runner.hal.ticks_us() + runner.period_us
    while True:
        elapsed = runner.hal.ticks_diff(runner.hal.ticks_ms(), start_ms)
        if elapsed >= total_ms or runner.safety.stopped:
            break
        duty = duty_at(plan, elapsed)
        command = (duty if motor in ("left", "both") else 0.0, duty if motor in ("right", "both") else 0.0)
        runner.step(command, closed_loop=False)
        deadline = runner.wait_next(deadline)
    runner.hal.set_duty(0.0, 0.0)
    runner.hal.set_enabled(False)
    return runner.safety.stop_reason or "completed"


def save(runner, path, dumps):
    with open(path, "w") as f:
        return runner.log.dump(lambda line: f.write(line + "\n"), dumps)
