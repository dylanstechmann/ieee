# Software safety supervisor for the mule and competition robot (MicroPython and CPython).
# Every motor command passes through SafetyMonitor.filter(). This is a second layer only:
# the hardware e-stop must cut motor power by itself (GM1 R04).
#
# Times are integer milliseconds from time.ticks_ms() differences, never accumulated floats.

STOP_ESTOP = "estop"
STOP_AUTO = "auto_stop"
STOP_WATCHDOG = "command_watchdog"
STOP_OVERRUN = "loop_overrun"
STOP_FAULT = "driver_fault"


class SafetyMonitor:
    def __init__(self, auto_stop_ms=178000, command_timeout_ms=250, max_overruns=20):
        self.auto_stop_ms = auto_stop_ms
        self.command_timeout_ms = command_timeout_ms
        self.max_overruns = max_overruns
        self.reset()

    def reset(self):
        self.stopped = True
        self.stop_reason = "not_armed"
        self.armed_at_ms = None
        self.last_command_ms = None
        self.overruns = 0

    def arm(self, now_ms, estop_active, commands_are_zero):
        # Arming needs a released e-stop and zero commands, so a latched stop never resumes motion by itself.
        if estop_active or not commands_are_zero:
            return False
        self.stopped = False
        self.stop_reason = None
        self.armed_at_ms = now_ms
        self.last_command_ms = now_ms
        self.overruns = 0
        return True

    def latch(self, reason):
        if not self.stopped:
            self.stopped = True
            self.stop_reason = reason

    def note_command(self, now_ms):
        self.last_command_ms = now_ms

    def note_overrun(self):
        self.overruns += 1
        if self.overruns > self.max_overruns:
            self.latch(STOP_OVERRUN)

    def elapsed_ms(self, now_ms):
        return None if self.armed_at_ms is None else now_ms - self.armed_at_ms

    def update(self, now_ms, estop_active, driver_fault=False):
        if estop_active:
            self.latch(STOP_ESTOP)
        if driver_fault:
            self.latch(STOP_FAULT)
        if self.stopped:
            return
        if now_ms - self.armed_at_ms >= self.auto_stop_ms:
            self.latch(STOP_AUTO)
        elif now_ms - self.last_command_ms > self.command_timeout_ms:
            self.latch(STOP_WATCHDOG)

    def filter(self, left, right):
        if self.stopped:
            return 0.0, 0.0
        return clamp(left, -1.0, 1.0), clamp(right, -1.0, 1.0)


def clamp(value, low, high):
    if value < low:
        return low
    if value > high:
        return high
    return value
