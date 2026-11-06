"""Editable exterior studies, not exact vendor replicas or manufacturing drawings.

Local frame: X forward, Y along outward shaft, Z up. The motor origin is
the output-shaft axis at the gearbox face. Undocumented details are omitted.
"""
import cadquery as cq


def cylinder_y(radius, length, y0=0, x=0, z=0):
    return cq.Workplane("XZ", origin=(x, y0, z)).circle(radius).extrude(-length)


def motor(spec):
    body = cylinder_y(spec["diameter_mm"] / 2, spec["body_length_mm"],
                      -spec["body_length_mm"], z=spec["shaft_offset_mm"])
    shaft = cylinder_y(spec["shaft_diameter_mm"] / 2, spec["shaft_length_mm"])
    # D-flat represented by an explicit measured-CAD across-flat dimension.
    flat_z = spec["shaft_flat_height_mm"] - spec["shaft_diameter_mm"] / 2
    cutter = cq.Workplane("XY").box(20, spec["shaft_length_mm"] + 2, 10).translate(
        (0, spec["shaft_length_mm"] / 2, flat_z + 5))
    return {"housing": body, "shaft": shaft.cut(cutter)}


def wheel(spec):
    radius, width = spec["diameter_mm"] / 2, spec["width_mm"]
    tire = cylinder_y(radius, width, -width / 2).cut(cylinder_y(radius - 3, width, -width / 2))
    rim = cylinder_y(radius - 3, width * 0.7, -width * 0.35)
    rim = rim.cut(cylinder_y(spec["bore_diameter_mm"] / 2, width * 2, -width))
    # Open spokes are explicitly a visual approximation, not a copied vendor mesh.
    for x, z in [(20, 0), (-20, 0), (0, 20), (0, -20)]:
        rim = rim.cut(cylinder_y(10, width * 2, -width, x, z))
    return {"tire": tire, "rim": rim}


def hub(spec):
    flange = cylinder_y(spec["diameter_mm"] / 2, 3, 0)
    collar = cylinder_y(6, spec["length_mm"], -spec["length_mm"] + 3)
    body = flange.union(collar).cut(cylinder_y(spec["bore_mm"] / 2, spec["length_mm"] + 6, -spec["length_mm"]))
    return {"body": body}


def bracket(spec):
    width, height, depth = spec["width_mm"], spec["height_mm"], spec["depth_mm"]
    base = cq.Workplane("XY").box(width, depth, 3).translate((0, depth / 2, -spec["axis_above_base_mm"] + 1.5))
    plate = cq.Workplane("XY").box(width, depth, height).translate((0, depth / 2, height / 2 - spec["axis_above_base_mm"]))
    opening = cylinder_y(spec["opening_mm"] / 2, depth + 2, -1, z=spec["shaft_offset_mm"])
    return {"body": plate.cut(opening).union(base)}


def caster(spec):
    # Local origin is the lowest point of the ball; body simplified to envelope.
    r = spec["ball_diameter_mm"] / 2
    ball = cq.Workplane("XY").sphere(r).translate((0, 0, r))
    body = cq.Workplane("XY").box(spec["length_mm"], spec["width_mm"], 4).translate((0, 0, spec["height_mm"] - 2))
    return {"ball": ball, "body": body}