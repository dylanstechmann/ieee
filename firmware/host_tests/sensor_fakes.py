# A fake HAL that adds sensor reads on top of fakes.FakeHal. fakes.py is a pinned input of the sealed
# v10 full-mission package, so the sensor surface lives here as a subclass instead of editing it.
# Placeholders return values until the on-board sensor path is wired after Order B hardware is chosen.
from host_tests.fakes import FakeHal


class SensorFakeHal(FakeHal):
    def read_gyro(self):
        return 0.0

    def read_reflectance(self):
        return [False] * 8

    def read_ranges(self):
        return [None] * 5

    def read_camera(self):
        return None