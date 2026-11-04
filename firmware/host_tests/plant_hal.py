# A simulated Pico HAL backed by the corrected drivetrain model (software/stockcar/dynamics.py), so
# the real control loop runs against wheel slip, supply sag and motor friction. Its friction, mass and
# inertia are placeholders until the E02 and E03 trials, so this tests behavior; it does not predict it.
import json
import math
import os
import sys

import config
from host_tests.fakes import FakeHal

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "software"))
from stockcar import dynamics, envelope  # noqa: E402

FIXTURE = os.path.join(ROOT, "software", "stockcar", "tests", "fixtures", "dynamics-golden-v10.json")
CHUNK_US = 1000


class PlantHal(FakeHal):
    def __init__(self, source_v=11.1, friction=0.25, mass=4.0, inertia_scale=1.0):
        super().__init__()
        with open(FIXTURE, encoding="utf-8") as f:
            golden = json.load(f)
        golden["model"]["vehicle"]["wheel_inertia_kg_m2"] *= inertia_scale
        self.inp = envelope.vehicle_input(golden, mass, source_v, friction, {"id": "firmware", "duration_s": 0})
        self.state = dynamics.initial_state()
        self.variant = {**dynamics.V10, "substeps": 2}
        self.plant_us = 0

    def _advance(self):
        while self.t_us - self.plant_us >= CHUNK_US:
            on = self.enabled and not self.estop
            self.state["duty"] = list(self.duty) if on else [0.0, 0.0]
            dynamics.plant_step(self.state, self.inp, CHUNK_US / 1e6, self.variant)
            self.plant_us += CHUNK_US

    def poll_encoders(self):
        self._advance()
        cpr = config.COUNTS_PER_OUTPUT_REV
        return tuple(int(a / (2 * math.pi) * cpr) for a in self.state["wheel_angle"])
