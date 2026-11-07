"""Shape-parameterized obstacle layouts for the ruleset worlds.

``mission.random_layout`` is a pinned input and always draws guide-plush footprints. This module keeps
its exact RNG-call order while substituting the requested obstacle shape, so ``GUIDE_PLUSH`` remains
bit-for-bit equivalent to the pinned baseline and the QA03 hypothetical toy can be generated without
editing ``mission.py``.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math

from stockcar import mission
from stockcar.obstacles import GUIDE_PLUSH, center_range, footprint


class WorldLayout(mission.Layout):
    def __init__(self, vehicles, assigned_box, exchange_success, shape):
        super().__init__(vehicles, assigned_box, exchange_success)
        self.shape = shape
        self.polys = [footprint(shape, v["cx"], v["cy"], v["yaw"]) for v in vehicles]


def world_random_layout(rng, field, shape=None, reading="offsets", yaw_mode="aligned",
                        p_exchange=0.7, obstacles=True):
    """Same layout distribution and RNG consumption as ``mission.random_layout``, for any shape."""
    shape = GUIDE_PLUSH if shape is None else shape
    vehicles = []
    if obstacles:
        quads = field.quadrants(reading)
        names = list(quads)
        empty = rng.choice(names)
        for name in names:
            if name == empty:
                continue
            side = "low" if name.startswith("low") else "high"
            lane = rng.choice(("outer", "inner"))
            for _ in range(20):
                yaw = rng.choice((0.0, math.pi / 2)) if yaw_mode == "aligned" else rng.uniform(0, math.pi)
                allowed = center_range(quads[name], side, lane, shape, yaw)
                if allowed:
                    break
            vehicles.append({"quadrant": name, "side": side, "cx": rng.uniform(*allowed[0]),
                             "cy": rng.uniform(*allowed[1]), "yaw": yaw})
    return WorldLayout(vehicles, rng.choice((1, 2, 3)), rng.random() < p_exchange, shape)