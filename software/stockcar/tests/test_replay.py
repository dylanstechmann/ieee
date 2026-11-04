import pathlib
import subprocess
import sys
import tempfile
import unittest

from stockcar import replay

ROOT = pathlib.Path(__file__).resolve().parents[3]


class ReplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.header, cls.records = replay.loads(replay.dumps(*replay.record_mission(100, sensing="full", obstacles=True)))

    def test_recorded_log_is_valid(self):
        self.assertEqual(replay.validate(self.header, self.records), [])
        self.assertGreater(len(self.records), 500)

    def test_replay_reproduces_the_live_run_exactly(self):
        report = replay.compare(self.records, replay.replay(self.header, self.records))
        self.assertEqual(report, {"largest_pose_difference": 0.0, "state_mismatches": 0})

    def test_replay_is_deterministic(self):
        first = replay.replay(self.header, self.records)
        second = replay.replay(self.header, self.records)
        self.assertEqual(first["poses"], second["poses"])

    def test_another_sensing_mode_really_recomputes(self):
        other = replay.compare(self.records, replay.replay(self.header, self.records, sensing="odometry_only"))
        self.assertGreater(other["largest_pose_difference"], 0.05)
        self.assertEqual(other["state_mismatches"], 0, "the supervisor sees the same observations")

    def test_estimator_options_can_be_changed_for_a_replay(self):
        def nearest(est):
            est.matching = "nearest"
        result = replay.replay(self.header, self.records, sensing="lines_only", configure=nearest)
        self.assertEqual(result["estimator"].line_skipped, 0)

    def test_validator_rejects_damaged_logs(self):
        bad = [dict(r) for r in self.records[:3]]
        bad[1]["enc"] = [1.5, 2]
        bad[2]["seq"] = 9
        del bad[0]["gyro"]
        problems = replay.validate(self.header, bad)
        self.assertEqual(len(problems), 3)
        self.assertTrue(replay.validate({**self.header, "extra": 1}, []))
        self.assertTrue(replay.validate({**self.header, "sensing": "psychic"}, []))

    def test_command_line_tool(self):
        with tempfile.TemporaryDirectory() as folder:
            log = pathlib.Path(folder) / "run.jsonl"
            csv = pathlib.Path(folder) / "poses.csv"
            log.write_text(replay.dumps(self.header, self.records), encoding="utf-8")
            out = subprocess.run([sys.executable, "-B", "-I", str(ROOT / "tools" / "replay-log.py"), str(log), "--poses-csv", str(csv)],
                                 capture_output=True, text=True, check=True).stdout
            self.assertIn("largest pose difference 0, supervisor state mismatches 0", out)
            self.assertEqual(len(csv.read_text(encoding="utf-8").splitlines()), len(self.records) + 1)


if __name__ == "__main__":
    unittest.main()
