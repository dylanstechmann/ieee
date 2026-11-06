"""Editable proposed structure, in mm; not a fabrication or hardware release.

Derived from the project's v10 deck/riser construction conventions. Geometry
parameters remain explicit; no vendor mesh is imported or stretched.
"""
import math

import cadquery as cq


def positive(spec, key):
    value = spec.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key} must be a finite positive millimetre value")
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{key} must be a finite positive millimetre value")
    return value


def build_deck(spec):
    """Return a local XY deck solid; its bottom is Z=0, not the floor."""
    length, width, thick = [positive(spec, k) for k in ("length_mm", "width_mm", "thickness_mm")]
    radius = positive(spec, "corner_radius_mm")
    if radius >= min(length, width) / 2:
        raise ValueError("Corner radius must fit the deck")
    solid = cq.Workplane("XY").box(length, width, thick, centered=(True, True, False))
    solid = solid.edges("|Z").fillet(radius)
    for hole in spec.get("holes", []):
        diameter = positive(hole, "diameter_mm")
        x, y = hole.get("x_mm"), hole.get("y_mm")
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (x, y)):
            raise ValueError("Hole coordinates must be finite millimetre values")
        # Conservatively keep holes clear of the rounded corner region.
        if abs(x) + diameter / 2 >= length / 2 - radius or abs(y) + diameter / 2 >= width / 2 - radius:
            raise ValueError("Hole exceeds conservative deck edge clearance")
        cutter = cq.Workplane("XY").center(x, y).circle(diameter / 2).extrude(thick)
        solid = solid.cut(cutter)
    return solid


def build_riser(spec):
    """Return a rectangular two-hole riser with explicit spacing and height."""
    length, width, height, pitch, diameter = [positive(spec, k) for k in (
        "length_mm", "width_mm", "height_mm", "hole_pitch_mm", "hole_diameter_mm")]
    if pitch + diameter >= width or diameter >= length:
        raise ValueError("Riser holes must fit inside its footprint")
    solid = cq.Workplane("XY").box(length, width, height, centered=(True, True, False))
    for y in (-pitch / 2, pitch / 2):
        cutter = cq.Workplane("XY").center(0, y).circle(diameter / 2).extrude(height)
        solid = solid.cut(cutter)
    return solid