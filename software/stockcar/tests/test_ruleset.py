import json
import pathlib
import unittest

from stockcar import ruleset
from stockcar.obstacles import GUIDE_PLUSH

ROOT = pathlib.Path(__file__).resolve().parents[2]           # software/

EXPECTED = [
    "world-ccw-line-sq-adv-align",
    "world-ccw-gate-sq-adv-align",
    "world-ccw-line-rd-adv-align",
    "world-ccw-gate-rd-adv-align",
    "world-ccw-line-sq-adv-yaw",
    "world-ccw-line-sq-enf-align",
    "world-cw-line-sq-adv-align",
    "world-ccw-line-sq-adv-small",
]
REQUIRED_KEYS = {"lap", "lap_mode", "direction", "body", "lane_rule", "obstacle",
                 "footprint_kind", "footprint_in", "shape", "yaw_mode", "reading",
                 "tag_pose", "flag_pose", "flag_mode", "pit_fraction", "preset",
                 "envelope", "divider", "wall_thickness"}


class RulesetTests(unittest.TestCase):
    def test_all_worlds_present_and_valid(self):
        self.assertEqual(ruleset.world_names(), sorted(EXPECTED))
        for name in EXPECTED:
            s = ruleset.get(name)
            self.assertEqual(REQUIRED_KEYS, set(s), msg=name)

    def test_unknown_world_raises(self):
        with self.assertRaises(KeyError):
            ruleset.get("world-nope")
        with self.assertRaises(KeyError):
            ruleset.deps("world-nope")

    def test_default_matches_file(self):
        self.assertEqual(ruleset.default_name(), "world-ccw-line-sq-adv-align")
        self.assertEqual(ruleset.get_default(), ruleset.get("world-ccw-line-sq-adv-align"))

    def test_pinned_identical_across_worlds(self):
        first = ruleset.get(EXPECTED[0])
        for name in EXPECTED[1:]:
            s = ruleset.get(name)
            for key, value in ruleset.PINNED.items():
                self.assertEqual(s[key], value, msg=f"{name}.{key}")

    def test_footprint_mapping(self):
        self.assertEqual((ruleset.get("world-ccw-gate-sq-adv-align")["footprint_kind"],
                          ruleset.get("world-ccw-gate-sq-adv-align")["footprint_in"]), ("square", 10.0))
        self.assertEqual((ruleset.get("world-ccw-line-rd-adv-align")["footprint_kind"],
                          ruleset.get("world-ccw-line-rd-adv-align")["footprint_in"]), ("round", 10.0))

    def test_obstacle_mapping(self):
        align = ruleset.get("world-ccw-line-sq-adv-align")
        yaw = ruleset.get("world-ccw-line-sq-adv-yaw")
        small = ruleset.get("world-ccw-line-sq-adv-small")
        self.assertIs(align["shape"], GUIDE_PLUSH)
        self.assertEqual(align["yaw_mode"], "aligned")
        self.assertIs(yaw["shape"], GUIDE_PLUSH)
        self.assertEqual(yaw["yaw_mode"], "random")
        self.assertEqual(small["shape"]["id"], "small_toy")
        self.assertEqual(small["yaw_mode"], "aligned")

    def test_deps_cover_every_world(self):
        for name in EXPECTED:
            self.assertEqual(ruleset.deps(name), ["QA01", "QA03", "QA04", "QA06"], msg=name)

    def test_worlds_json_agrees_with_ruleset(self):
        data = json.loads((ROOT / "stockcar" / "worlds.json").read_text(encoding="utf-8"))
        self.assertEqual(data["primary"], "world-ccw-line-sq-adv-align")
        jw = data["worlds"]
        self.assertEqual(sorted(jw), sorted(EXPECTED))
        for name in EXPECTED:
            spec = ruleset.get(name)
            dims = ("lap", "lap_mode", "direction", "body", "lane_rule", "obstacle")
            for key in dims:
                self.assertEqual(jw[name][key], spec[key], msg=f"{name}.{key}")
            self.assertEqual(jw[name]["deps"], ruleset.deps(name), msg=name)


if __name__ == "__main__":
    unittest.main()