import unittest

from stockcar.geometry import axis_rect
from stockcar.passage import common_line, free_center_intervals

BAND = (1.0, 23.5)  # CAD low-side corridor


class PassageTests(unittest.TestCase):
    def test_vehicle_at_the_wall_leaves_room_above(self):
        car = axis_rect(50, 3.0, 58.55, 11.2)  # 8.2 in wide against the quadrant's wall-side edge
        self.assertEqual(free_center_intervals(BAND, car), [(16.45, 18.25)])

    def test_centered_vehicle_blocks_the_corridor(self):
        car = axis_rect(50, 8.15, 58.55, 16.35)
        self.assertEqual(free_center_intervals(BAND, car), [])

    def test_common_line(self):
        self.assertTrue(common_line([[(16.0, 18.0)], [(17.0, 19.0)]]))
        self.assertFalse(common_line([[(6.25, 7.0)], [(16.0, 18.0)]]))
        self.assertFalse(common_line([]))


if __name__ == "__main__":
    unittest.main()
