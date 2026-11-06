# Whole-mission parity: run the same simulated mission twice, once with the host EKF and once with the
# on-board port (patched into full_mission.run), and check the outcomes match within tolerance. This is
# the host's own loop, so only the filter differs — the plant, routes and supervisor are identical.
import json
import os
import sys
import tempfile
import unittest

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
for extra in ("software", "firmware", os.path.join("firmware", "pico2")):
    p = os.path.join(ROOT, extra)
    if p not in sys.path:
        sys.path.insert(0, p)

import build_pico_bundle  # noqa: E402
import estimator as board_est  # noqa: E402
from host_tests import full_mission  # noqa: E402
from stockcar import estimator as host_est_module  # noqa: E402


class EstimatorInMissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(ROOT, "derived", "envelope-v10", "report.json"), encoding="utf-8") as f:
            report = json.load(f)
        cls.envelope = report["planning_envelopes"]["conservative"]
        cls.tmp = tempfile.TemporaryDirectory()
        build_pico_bundle.write_routes(cls.tmp.name)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def _run(self, estimator_cls):
        saved = full_mission.Estimator
        full_mission.Estimator = estimator_cls
        try:
            return full_mission.run(self.tmp.name, "lanes", 1, (11.1, 0.25, 4.0), self.envelope, 100)
        finally:
            full_mission.Estimator = saved

    def test_board_port_matches_host_in_mission(self):
        host = self._run(host_est_module.Estimator)
        board = self._run(board_est.EstimatorBoard)
        self.assertEqual(board["state"], host["state"])
        self.assertEqual(board["laps"], host["laps"])
        self.assertEqual(board["exchange"], host["exchange"])
        self.assertAlmostEqual(board["score_like"], host["score_like"], delta=0.5)
        self.assertAlmostEqual(board["max_position_error_in"], host["max_position_error_in"], delta=0.02)


if __name__ == "__main__":
    unittest.main()