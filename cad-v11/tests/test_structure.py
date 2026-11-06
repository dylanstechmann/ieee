"""Synthetic CAD tests: these are not received-part measurements."""
import importlib.util
import pathlib
import unittest

PATH = pathlib.Path(__file__).resolve().parents[1] / "parts" / "structure.py"
SPEC = importlib.util.spec_from_file_location("structure_v11", PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class StructureTests(unittest.TestCase):
    def test_deck_solid_and_parameter_change(self):
        spec = dict(length_mm=190, width_mm=172, thickness_mm=5, corner_radius_mm=3,
                    holes=[dict(x_mm=0, y_mm=40, diameter_mm=3.4)])
        original = M.build_deck(spec).val()
        changed = M.build_deck({**spec, "length_mm": 200}).val()
        self.assertTrue(original.isValid())
        self.assertTrue(changed.isValid())
        self.assertAlmostEqual(original.BoundingBox().xlen, 190)
        self.assertAlmostEqual(changed.BoundingBox().xlen, 200)
        self.assertEqual(spec["length_mm"], 190)
        self.assertGreater(changed.Volume(), original.Volume())

    def test_riser_height_is_editable(self):
        spec = dict(length_mm=24, width_mm=24, height_mm=6.91,
                    hole_pitch_mm=14.7, hole_diameter_mm=2.5)
        solid = M.build_riser(spec).val()
        self.assertTrue(solid.isValid())
        self.assertAlmostEqual(solid.BoundingBox().zlen, 6.91)
        changed = M.build_riser({**spec, "height_mm": 8}).val()
        self.assertAlmostEqual(changed.BoundingBox().zlen, 8)

    def test_invalid_geometry_is_rejected(self):
        for height in (0, -1, float("nan"), True, "8"):
            with self.assertRaises(ValueError):
                M.build_riser(dict(length_mm=24, width_mm=24, height_mm=height,
                                   hole_pitch_mm=14.7, hole_diameter_mm=2.5))
        with self.assertRaises(ValueError):
            M.build_deck(dict(length_mm=10, width_mm=10, thickness_mm=5, corner_radius_mm=6))


if __name__ == "__main__":
    unittest.main()