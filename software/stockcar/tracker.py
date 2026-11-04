# Path tracking for a differential-drive robot (MicroPython and CPython). Follows a table from
# stockcar.profile with Kanayama's law: the route's own speed and curvature as feed-forward, plus
# feedback on along-track, cross-track and heading error. Units are inches and seconds.
import math

SEARCH_POINTS = 30
LEAST_SPEED_IN_S = 1.5
ARRIVED_IN = 0.25


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


class Tracker:
    def __init__(self, table, length_in=4.0, damping=0.8, along_gain=1.0, preview_s=0.1):
        # length_in sets how sharply cross-track error is corrected; preview_s leads the feed-forward
        # by the delay of the shaper and the wheel loops.
        self.table = table
        self.k_y = 1.0 / (length_in * length_in)
        self.k_heading = 2.0 * damping / length_in
        self.along_gain = along_gain
        self.preview_s = preview_s
        self.index = 0
        self.errors = (0.0, 0.0, 0.0)

    def _advance(self, x, y):
        t = self.table
        best, best_d = self.index, None
        for i in range(self.index, min(len(t["x"]), self.index + SEARCH_POINTS)):
            d = (t["x"][i] - x) ** 2 + (t["y"][i] - y) ** 2
            if best_d is None or d < best_d:
                best, best_d = i, d
        self.index = best

    def command(self, x, y, heading):
        """Speed and yaw rate for this pose, and whether the route is finished."""
        t = self.table
        self._advance(x, y)
        i = self.index
        last = len(t["x"]) - 1
        dx, dy = t["x"][i] - x, t["y"][i] - y
        cos_h, sin_h = math.cos(heading), math.sin(heading)
        along, across = dx * cos_h + dy * sin_h, -dx * sin_h + dy * cos_h
        turn = wrap(t["heading"][i] - heading)
        self.errors = (along, across, turn)
        remaining = (last - i) * t["step_in"] + along
        if i == last and abs(along) < ARRIVED_IN:
            return 0.0, 0.0, True
        speed = max(t["speed"][i], LEAST_SPEED_IN_S)
        ahead = min(last, i + int(speed * self.preview_s / t["step_in"] + 0.5))
        rate = speed * t["curvature"][ahead] + speed * (self.k_y * across + self.k_heading * math.sin(turn))
        commanded = speed * math.cos(turn) + self.along_gain * along
        return min(commanded, max(LEAST_SPEED_IN_S, remaining * 4.0)), rate, False
