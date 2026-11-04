# Boot entry for the mule. Default is IDLE: motors disabled, nothing moves.
# Run the E02 bench script only from the REPL, inside an approved bench setup:
#   >>> import main; main.bench("both")
import json

import bench_e02
from hal import PicoHal
from runner import Runner


def idle():
    hal = PicoHal()
    hal.set_duty(0.0, 0.0)
    hal.set_enabled(False)
    return hal


def bench(motor="both", run_id=1):
    runner = Runner(PicoHal(), mode="BENCH")
    outcome = bench_e02.run(runner, motor)
    lines = bench_e02.save(runner, "/e02-%d.jsonl" % run_id, json.dumps)
    print("E02 run", run_id, outcome, lines, "records; dropped", runner.log.dropped)
    return outcome


if __name__ == "__main__":
    idle()
