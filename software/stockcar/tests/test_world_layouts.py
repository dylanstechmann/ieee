import random
import unittest

from stockcar import mission, world_layouts
from stockcar.field import Field
from stockcar.obstacles import GUIDE_PLUSH
from stockcar.ruleset import SMALL_TOY


class WorldLayoutTests(unittest.TestCase):
    def setUp(self):
        self.field = Field()

    def test_guide_plush_matches_the_pinned_baseline(self):
        for seed in (0, 1, 7, 42):
            base_rng, world_rng = random.Random(seed), random.Random(seed)
            base = mission.random_layout(base_rng, self.field)
            world = world_layouts.world_random_layout(world_rng, self.field, GUIDE_PLUSH)
            self.assertEqual(world.vehicles, base.vehicles, msg=seed)
            self.assertEqual(world.assigned_box, base.assigned_box, msg=seed)
            self.assertEqual(world.exchange_success, base.exchange_success, msg=seed)
            self.assertEqual(world.polys, base.polys, msg=seed)
            self.assertEqual(world_rng.getstate(), base_rng.getstate(), msg=seed)

    def test_small_toy_shapes_and_determinism(self):
        first = world_layouts.world_random_layout(random.Random(3), self.field, SMALL_TOY)
        second = world_layouts.world_random_layout(random.Random(3), self.field, SMALL_TOY)
        self.assertEqual(first.vehicles, second.vehicles)
        self.assertIs(first.shape, SMALL_TOY)
        self.assertEqual(len(first.vehicles), 3)
        for poly in first.polys:
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            dims = sorted((max(xs) - min(xs), max(ys) - min(ys)))
            self.assertAlmostEqual(dims[0], SMALL_TOY["width_in"], places=6)
            self.assertAlmostEqual(dims[1], SMALL_TOY["length_in"], places=6)
            self.assertLess(dims[0], GUIDE_PLUSH["width_in"])
            self.assertLess(dims[1], GUIDE_PLUSH["length_in"])

    def test_empty_obstacle_layout_still_draws_metadata(self):
        layout = world_layouts.world_random_layout(random.Random(5), self.field, SMALL_TOY, obstacles=False)
        self.assertEqual(layout.vehicles, [])
        self.assertEqual(layout.polys, [])
        self.assertIn(layout.assigned_box, (1, 2, 3))
        self.assertIs(layout.shape, SMALL_TOY)


if __name__ == "__main__":
    unittest.main()