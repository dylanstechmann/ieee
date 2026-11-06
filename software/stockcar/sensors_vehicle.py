"""A forward range ring that sees walls *and* vehicles together, and classifies the difference.

Unlike the older ToF model (which ray-casts walls and vehicles without saying which it hit), a real
time-of-flight sensor returns the nearest thing in each ray. This module ray-casts walls and vehicles
together and, for every return, compares it with the map's wall-only distance: a return materially
closer than the mapped wall is a vehicle; a return matching the wall (or nothing expected) is not a
fabricated hit. Returns are clustered by ``VehicleMap`` into ``SensedVehicle`` objects once a minimum
number of confirming hits is reached.

The ray layout, noise, dropout and gates are placeholders to be replaced after Order B hardware is
chosen and bench-measured. Agent-written; synthetic only.
"""
import math

from stockcar.geometry import wrap
from stockcar.obstacles import GUIDE_PLUSH
from stockcar.sensors import ray_cast, to_world

# Five forward-facing rays (forward, lateral offsets in the robot frame; angles from heading).
# Placeholder geometry for the mule's prospective ToF ring, not a bench measurement.
VEHICLE_RAYS = [
    (5.0, 0.0, 0.0),
    (5.0, 2.0, math.radians(20)),
    (5.0, -2.0, math.radians(-20)),
    (3.0, 2.5, math.radians(32)),
    (3.0, -2.5, math.radians(-32)),
]
MAX_RANGE_IN = 40.0
CENTRE_Y = 24.0      # divider centre: below is the low side, above the high side


def classify(reading, expected, gate_in=2.0):
    """True when a return is a vehicle: closer than the mapped wall by more than `gate_in`, or a hit
    where the map has no wall. A reading at (or behind) the mapped wall is not a vehicle."""
    if reading is None:
        return False
    if expected is None:
        return True
    return reading < expected - gate_in


def scan(pose, barriers, vehicles, rng, rays=VEHICLE_RAYS, noise=0.3, dropout=0.05,
         max_range=MAX_RANGE_IN, gate_in=2.0):
    """One frame of ``RangeHit`` (or ``None`` for each dropped-out ray). Dropout reports no range —
    it never fabricates one. `expected_in` is the map's wall-only ray cast at the same angle."""
    out = []
    for i, (fx, fy, a) in enumerate(rays):
        origin = to_world(pose, (fx, fy))
        angle = pose[2] + a
        if rng.random() < dropout:
            out.append(None)
            continue
        d = ray_cast(origin, angle, barriers + vehicles, max_range=max_range)
        if d is None:
            out.append(None)
            continue
        expected = ray_cast(origin, angle, barriers, max_range=max_range)
        measured = d + rng.gauss(0.0, noise)
        world = (origin[0] + measured * math.cos(angle), origin[1] + measured * math.sin(angle))
        out.append({
            "ray": i,
            "range_in": round(measured, 3),
            "expected_in": None if expected is None else round(expected, 3),
            "world_xy": world,
            "is_vehicle": classify(measured, expected, gate_in),
        })
    return out


class VehicleMap:
    """Clusters confirmed vehicle hits into candidate vehicles. Only the face the sensor sees is
    measured; the far side uses the guide size as a labeled prior (QA03 open). A vehicle does not
    exist until `min_hits` confirming hits reach one cluster."""

    def __init__(self, min_hits=3, cluster_in=6.0, guide_shape=GUIDE_PLUSH):
        self.min_hits = min_hits
        self.cluster_in = cluster_in
        self.guide_shape = guide_shape
        self.clusters = []
        self.last_pose = None

    def add(self, hits, pose):
        self.last_pose = pose
        for h in hits:
            if h is None or not h["is_vehicle"]:
                continue
            x, y = h["world_xy"]
            target = None
            for c in self.clusters:
                d = math.hypot(x - c["cx"], y - c["cy"])
                if target is None or d < target[0]:
                    target = (d, c)
            if target is not None and target[0] <= self.cluster_in:
                c = target[1]
                c["count"] += 1
                c["sx"] += x
                c["sy"] += y
                c["cx"], c["cy"] = c["sx"] / c["count"], c["sy"] / c["count"]
                c["points"].append((x, y))
            else:
                self.clusters.append({"cx": x, "cy": y, "sx": x, "sy": y, "count": 1, "points": [(x, y)]})

    def _extent_in(self, points):
        if len(points) < 2:
            return 0.0
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        return max(max(xs) - min(xs), max(ys) - min(ys))

    def vehicles(self):
        out = []
        for c in self.clusters:
            if c["count"] < self.min_hits:
                continue
            # Only the seen face is measured; yaw and the unseen depth are labeled priors (QA03/QA08).
            out.append({
                "cx": round(c["cx"], 2),
                "cy": round(c["cy"], 2),
                "yaw": 0.0,
                "side": "low" if c["cy"] < CENTRE_Y else "high",
                "hits": c["count"],
                "seen_extent_in": round(self._extent_in(c["points"]), 2),
                "assumed_depth_in": self.guide_shape["length_in"],
            })
        return out