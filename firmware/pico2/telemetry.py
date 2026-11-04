# Telemetry records (schemas/telemetry-v1.json) kept in fixed-size arrays: about 55 bytes per record,
# so 3000 records use roughly 165 KB of the Pico 2's 520 KB RAM. Nothing is written to flash during
# a run (flash writes stall the CPU); dump() turns the buffer into JSON lines afterwards.
from array import array

SCHEMA_VERSION = 1
MODES = ("IDLE", "BENCH", "DRIVE")
STOPS = (None, "not_armed", "estop", "auto_stop", "command_watchdog", "loop_overrun", "driver_fault")
NAN = float("nan")


class Telemetry:
    def __init__(self, capacity=3000):
        self.capacity = capacity
        self.t_ms = array("l", [0] * capacity)
        self.mode = array("b", [0] * capacity)
        self.enc = array("l", [0] * (2 * capacity))
        self.floats = array("f", [0.0] * (9 * capacity))  # cmd l/r, pwm l/r, rpm l/r, i l/r, vbat
        self.flags = array("b", [0] * (2 * capacity))  # estop, stop reason code
        self.loop_us = array("l", [0] * capacity)
        self.next = 0
        self.size = 0
        self.dropped = 0
        self.seq0 = 0

    def record(self, t_ms, mode, enc, cmd, pwm, rpm, i_a, vbat, estop, stop_reason, loop_us):
        k = self.next
        self.t_ms[k] = t_ms
        self.mode[k] = MODES.index(mode)
        self.enc[2 * k] = enc[0]
        self.enc[2 * k + 1] = enc[1]
        f = 9 * k
        values = (cmd[0], cmd[1], pwm[0], pwm[1], rpm[0], rpm[1],
                  NAN if i_a is None else i_a[0], NAN if i_a is None else i_a[1], NAN if vbat is None else vbat)
        for j in range(9):
            self.floats[f + j] = values[j]
        self.flags[2 * k] = 1 if estop else 0
        self.flags[2 * k + 1] = STOPS.index(stop_reason)
        self.loop_us[k] = loop_us
        self.next = (k + 1) % self.capacity
        if self.size == self.capacity:
            self.dropped += 1
            self.seq0 += 1
        else:
            self.size += 1

    def item(self, n):
        k = (self.next - self.size + n) % self.capacity
        f = 9 * k

        def num(v):
            return None if v != v else round(v, 4)

        return {"v": SCHEMA_VERSION, "seq": self.seq0 + n, "t_ms": self.t_ms[k], "mode": MODES[self.mode[k]],
                "enc": [self.enc[2 * k], self.enc[2 * k + 1]],
                "cmd": [num(self.floats[f]), num(self.floats[f + 1])],
                "pwm": [num(self.floats[f + 2]), num(self.floats[f + 3])],
                "rpm": [num(self.floats[f + 4]), num(self.floats[f + 5])],
                "i_a": None if self.floats[f + 6] != self.floats[f + 6] else [num(self.floats[f + 6]), num(self.floats[f + 7])],
                "vbat": num(self.floats[f + 8]),
                "estop": bool(self.flags[2 * k]), "stop_reason": STOPS[self.flags[2 * k + 1]],
                "loop_us": self.loop_us[k]}

    def dump(self, write_line, dumps):
        for n in range(self.size):
            write_line(dumps(self.item(n)))
        return self.size
