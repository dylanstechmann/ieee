import csv
import io
import pathlib
import random
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))
import analyze_e04_v10 as e04  # noqa: E402

SHEET = ROOT / "derived" / "tire-fixture-v10" / "doe-round1.csv"


def filled(success_prob, seed=0):
    """SYNTHETIC: the round-1 sheet with random outcomes, for testing the analysis only."""
    rng = random.Random(seed)
    rows = list(csv.DictReader(io.StringIO(SHEET.read_text(encoding="utf-8"))))
    for r in rows:
        ok = rng.random() < success_prob
        r["acquired"] = "true" if ok else "false"
        r["retained_after_shake"] = "true" if ok else ""
        r["released_in_box"] = "true" if ok else ""
    return rows


class E04AnalysisTests(unittest.TestCase):
    def test_sheet_has_fifty_runs_per_concept(self):
        rows = list(csv.DictReader(io.StringIO(SHEET.read_text(encoding="utf-8"))))
        for concept in ("passive_fork", "guided_bore", "od_gripper"):
            self.assertEqual(sum(r["concept"] == concept for r in rows), 50)

    def test_wilson_interval(self):
        lo, hi = e04.wilson(16, 20)
        self.assertAlmostEqual(lo, 0.584, places=2)
        self.assertIsNone(e04.wilson(0, 0))

    def test_perfect_results_pass_and_poor_results_fail(self):
        self.assertTrue(e04.analyze(filled(1.0))["passive_fork"]["e04_pass"])
        poor = e04.analyze(filled(0.7, seed=3))["passive_fork"]
        self.assertFalse(poor["e04_pass"])
        self.assertEqual(poor["runs"], 50)

    def test_unrun_rows_are_excluded(self):
        rows = filled(1.0)
        for r in rows[:10]:
            r["acquired"] = ""
        result = e04.analyze(rows)
        self.assertEqual(result["passive_fork"]["runs"], 40)
        self.assertFalse(result["passive_fork"]["e04_acceptance"]["pickups_at_least_48_of_50"])


if __name__ == "__main__":
    unittest.main()
