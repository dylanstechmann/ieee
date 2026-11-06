"""Proposed v13 tray/fork/gate solids in mm; not selected hardware.

Local component frames are centered. Input sizes are render-frame X/Y/Z;
CadQuery's local Z becomes render Y after the instance's -90 degree X rotation.
"""
import cadquery as cq


def positive(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"{name} must be a positive finite millimetre value")
    value = float(value)
    if value != value or value in (float("inf"), float("-inf")):
        raise ValueError(f"{name} must be finite")
    return value


def build_mechanism(spec):
    """Return one centered valid box solid for a named proposed component."""
    if not isinstance(spec, dict) or not isinstance(spec.get("id"), str) or not spec["id"]:
        raise ValueError("Named mechanism component required")
    size = spec.get("sizeMm")
    if not isinstance(size, list) or len(size) != 3:
        raise ValueError("sizeMm must contain render-frame X/Y/Z dimensions")
    sx, sy, sz = [positive(v, f"sizeMm[{i}]") for i, v in enumerate(size)]
    return cq.Workplane("XY").box(sx, sz, sy)
