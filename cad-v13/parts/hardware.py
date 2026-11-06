"""Nominal #4-40 x 1/2 inch wheel-screw exterior, in mm.

Diameter and under-head length come from the selected SKU title. Head diameter,
head height and the Phillips recess are explicit study assumptions, not measured
manufacturer geometry. Threads are represented by a smooth nominal cylinder.
"""
import math
import cadquery as cq


def _positive(spec, key):
    value = spec.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(f"{key} must be a finite positive millimetre value")
    return float(value)


def build_standard_fastener(spec):
    major = _positive(spec, "majorDiameterMm")
    length = _positive(spec, "lengthMm")
    head_diameter = float(spec.get("headDiameterMm", 5.5))
    head_height = float(spec.get("headHeightMm", 2.2))
    if not math.isfinite(head_diameter) or not math.isfinite(head_height) or head_diameter <= major or head_height <= 0:
        raise ValueError("Nominal screw head must be positive and wider than the shaft")
    shaft = cq.Workplane("XY", origin=(0, 0, -length)).circle(major / 2).extrude(length)
    head = cq.Workplane("XY").circle(head_diameter / 2).extrude(head_height)
    # A shallow cross recess communicates the Phillips style without claiming a
    # measured drive profile. It does not alter the documented shaft length.
    recess_a = cq.Workplane("XY", origin=(0, 0, head_height - 0.5)).box(head_diameter * 0.58, 0.65, 1.0)
    recess_b = cq.Workplane("XY", origin=(0, 0, head_height - 0.5)).box(0.65, head_diameter * 0.58, 1.0)
    return shaft.union(head).cut(recess_a).cut(recess_b)
