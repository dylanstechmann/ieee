"""Field geometry from the organizer CAD extraction (derived/organizer-cad-v10/field-v10.json)."""
import json
import pathlib

from stockcar.geometry import axis_rect

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIELD_FILE = ROOT / "derived" / "organizer-cad-v10" / "field-v10.json"


class Field:
    """Barriers and quadrants in inches. Variants:

    divider: 'cad_1x1' (1 in wide, the June CAD), 'v3_1x2_on_edge_actual' (0.75 in), 'v3_1x2_flat_actual' (1.5 in);
    wall_thickness: 1.0 (CAD nominal) or 0.75 (actual 1 x 4 lumber, walls flush with the board edge).
    """

    def __init__(self, data=None, divider="cad_1x1", wall_thickness=None):
        self.data = data or json.loads(FIELD_FILE.read_text(encoding="utf-8"))
        f = self.data["features"]
        variants = {v["id"]: v for v in f["center_divider"]["variants"]}
        if divider not in variants:
            raise ValueError(f"unknown divider variant {divider}")
        self.divider_variant = divider
        cd = f["center_divider"]["rect"]
        center_y = (cd[1] + cd[3]) / 2
        half = variants[divider]["width_in"] / 2
        self.center_divider = (cd[0], center_y - half, cd[2], center_y + half)
        self.pit_divider = tuple(f["pit_divider"]["rect"])
        faces = f["walls"]["inner_faces"]
        if wall_thickness is None:
            self.walls = (faces["x_min"], faces["y_min"], faces["x_max"], faces["y_max"])
        else:
            board = f["board"]["rect"]
            t = wall_thickness
            self.walls = (board[0] + t, board[1] + t, board[2] - t, board[3] - t)
        self.pit_boxes = {b["box"]: tuple(b["rect"]) for b in f["pit_boxes"]}
        self.start_box = tuple(f["start_box"]["rect"])
        self.quadrant_data = f["obstacle_quadrants"]

    def corridor(self, side):
        """(y_low, y_high) free band of a straightaway between the wall face and the divider face."""
        if side == "low":
            return self.walls[1], self.center_divider[1]
        if side == "high":
            return self.center_divider[3], self.walls[3]
        raise ValueError(side)

    def quadrants(self, interpretation="offsets"):
        """Four quadrant rectangles keyed low_west, low_east, high_west, high_east (x0, y0, x1, y1).

        The quadrant x ranges come from Appendix E: 16 in from each end of the center divider. The y
        ranges depend on how the 2 in offsets and 16 in width are read (QA03), and follow this
        field's wall and divider faces.
        """
        readings = {r["id"]: r for r in self.quadrant_data["interpretations"]}
        if interpretation not in readings:
            raise ValueError(f"unknown quadrant interpretation {interpretation}")
        west, east = self.quadrant_data["x_ranges"]
        lo0, lo1 = self.corridor("low")
        hi0, hi1 = self.corridor("high")
        if interpretation == "offsets":
            low, high = (lo0 + 2, lo1 - 2), (hi0 + 2, hi1 - 2)
        elif interpretation == "sixteen_from_wall":
            low, high = (lo0 + 2, lo0 + 18), (hi1 - 18, hi1 - 2)
        else:
            low, high = (lo1 - 18, lo1 - 2), (hi0 + 2, hi0 + 18)
        return {
            "low_west": (west[0], low[0], west[1], low[1]),
            "low_east": (east[0], low[0], east[1], low[1]),
            "high_west": (west[0], high[0], west[1], high[1]),
            "high_east": (east[0], high[0], east[1], high[1]),
        }

    def barriers(self):
        """Physical barrier rectangles as polygons (walls as thick bands outside the inner faces)."""
        x0, y0, x1, y1 = self.walls
        t = 1.0
        return [
            axis_rect(x0 - t, y0 - t, x1 + t, y0),
            axis_rect(x0 - t, y1, x1 + t, y1 + t),
            axis_rect(x0 - t, y0, x0, y1),
            axis_rect(x1, y0, x1 + t, y1),
            axis_rect(*self.center_divider),
            axis_rect(*self.pit_divider),
        ]
