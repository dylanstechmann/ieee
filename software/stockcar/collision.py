"""Vehicle and wall collision detection for the sensed mission simulator.

Pure polygon geometry, unit-tested in isolation and reusable by the `mission_sensed.py` subclass — so the
pinned v10 source files stay byte-identical. `MissionSim._contacts` already records contacts and keeps
driving ("continue gently"); this module adds the pieces a subclass needs to *stop* instead.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
from stockcar.geometry import separation


def overlapping(poly, polygons):
    """Indices of `polygons` whose signed separation from `poly` is negative (they interpenetrate)."""
    return [i for i, p in enumerate(polygons) if separation(poly, p) < 0]


def check(poly, barriers, vehicles):
    """(hit_wall, hit_vehicle) booleans for one robot footprint against walls and vehicles."""
    return bool(overlapping(poly, barriers)), bool(overlapping(poly, vehicles))


class ContactRecorder:
    """Per-lap wall/vehicle contact counts and a cooldown, mirroring `MissionSim._contacts` without its
    penalty side effects, so a subclass can layer a stop response on top of the existing recording."""

    def __init__(self, block_penalty_s=0.5):
        self.block_penalty_s = block_penalty_s
        self.cooldown = 0.0
        self.wall_contacts = [0, 0, 0]
        self.vehicle_contacts = [0, 0, 0]

    def tick(self, lap, hit_wall, hit_vehicle, dt):
        """Record one simulation frame; returns the number of *newly entered* contacts this frame."""
        self.cooldown = max(0.0, self.cooldown - dt)
        new = 0
        if hit_wall:
            if self.wall_contacts[lap] == 0:
                new += 1
            self.wall_contacts[lap] += 1
        if hit_vehicle:
            if self.vehicle_contacts[lap] == 0:
                new += 1
            self.vehicle_contacts[lap] += 1
            self.cooldown = self.block_penalty_s
        return new