import math
import random
import unittest

from stockcar import mission
from stockcar.field import Field
from stockcar.mission_sensed import run_sensed, SensedMissionSim
from stockcar.sensors_camera import CameraModel, FLAG_POSE, LapLineDetector, StartFlagModel, TAG_POSE


class CameraModelTests(unittest.TestCase):
    def test_reads_tag_when_ahead(self):
        cam = CameraModel(2)
        tag_id, r, bearing = cam.read((19.479, 39.0, 0.0))
        self.assertEqual(tag_id, 2)
        # camera at (23.979, 39), tag at (28.0, 39): right at the default tag pose
        self.assertAlmostEqual(r, 28.0 - (19.479 + 4.5), places=2)
        self.assertAlmostEqual(bearing, 0.0, places=6)

    def test_no_read_beyond_max_range(self):
        cam = CameraModel(2)
        far = (TAG_POSE[0] - 42.0, TAG_POSE[1], 0.0)   # camera 37.5 in away > 36 in max range
        self.assertEqual(cam.read(far), (None, None, None))

    def test_no_read_outside_field_of_view(self):
        cam = CameraModel(2)
        # looking west (away from the tag to the east) from just west of the tag
        behind = (TAG_POSE[0] - 5.0, TAG_POSE[1], math.pi)
        self.assertEqual(cam.read(behind), (None, None, None))

    def test_no_read_at_a_side_angle_outside_the_cone(self):
        cam = CameraModel(2, fov=math.radians(30.0))
        # the tag is well off the robot's forward axis (bearing > the narrow cone)
        side = (TAG_POSE[0] - 8.0, TAG_POSE[1] + 8.0, 0.0)   # bearing ~45 deg against a 30 deg cone
        self.assertEqual(cam.read(side), (None, None, None))


class StartFlagModelTests(unittest.TestCase):
    def test_visible_flag_reports_real_state(self):
        flag = StartFlagModel()
        self.assertEqual(flag.read((13.479, 39.0, 0.0), up=True), (True, True))
        self.assertEqual(flag.read((13.479, 39.0, 0.0), up=False), (True, False))

    def test_occluded_flag_is_unknown(self):
        flag = StartFlagModel()
        far = (FLAG_POSE[0] + 60.0, FLAG_POSE[1], math.pi)
        self.assertEqual(flag.read(far, up=True), (False, None))


class LapLineDetectorTests(unittest.TestCase):
    def _field(self):
        return Field()

    def test_fires_on_entry_into_the_high_opening(self):
        det = LapLineDetector(self._field())
        self.assertFalse(det.detect((24.0, 40.0), (23.5, 40.0)))   # still west of the band
        self.assertTrue(det.detect((25.5, 40.0), (24.0, 40.0)))    # crosses x=25 into the band (high opening)
        self.assertFalse(det.detect((26.5, 40.0), (25.5, 40.0)))   # already inside: no repeat edge

    def test_fires_on_entry_into_the_low_opening(self):
        det = LapLineDetector(self._field())
        self.assertTrue(det.detect((26.0, 8.0), (24.5, 8.0)))

    def test_no_fire_over_the_pit_divider_or_outside(self):
        det = LapLineDetector(self._field())
        self.assertFalse(det.detect((27.0, 24.0), (26.5, 24.0)))   # x in band but y over the pit divider
        self.assertFalse(det.detect((40.0, 24.0), (39.0, 24.0)))   # well east of the pit mouth

    def test_entering_again_after_leaving_fires_again(self):
        det = LapLineDetector(self._field())
        det.detect((25.5, 40.0), (24.0, 40.0))                     # enter
        det.detect((30.0, 40.0), (26.0, 40.0))                     # leave east of x=29
        self.assertTrue(det.detect((26.0, 40.0), (30.0, 40.0)))    # re-enter westbound


class SensedMissionTests(unittest.TestCase):
    def test_sensed_mission_completes_a_full_three_lap_mission(self):
        info = run_sensed(100, obstacles=False)
        self.assertEqual(info["state"], "DONE")
        self.assertGreaterEqual(info["laps"], 3)

    def test_supervisor_resolves_the_box_from_tag_votes(self):
        sim = SensedMissionSim()
        layout = mission.random_layout(random.Random(5), sim.field, obstacles=False)
        sim.reset(layout)
        for _ in range(600):
            _, _, done, _ = sim.step()
            if done:
                break
        self.assertEqual(sim.sup.assigned_box, layout.assigned_box)
        self.assertEqual(sim.sup.box_source, "tag")

    def test_mirrors_the_v10_mission_observations(self):
        # The sensed variant should only differ in HOW the box/flag are sensed, not the mission result.
        info = run_sensed(100, obstacles=False)
        self.assertEqual(info["state"], "DONE")
        self.assertIn("score_like", info)


if __name__ == "__main__":
    unittest.main()