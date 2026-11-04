# A simulated Pico HAL for host tests: two first-order DC motors with x1 encoders and a clock that
# advances a little on every ticks_us() call, so busy-wait loops make progress. Not a motor model
# fitted to real data; parameters are round placeholders until E02 measurements exist.
import config


class SimMotor:
    def __init__(self, rpm_per_duty=150.0, tau_s=0.08, deadband=0.05):
        self.rpm_per_duty = rpm_per_duty
        self.tau_s = tau_s
        self.deadband = deadband
        self.rpm = 0.0
        self.position_rev = 0.0

    def advance(self, duty, dt_s):
        drive = 0.0 if abs(duty) <= self.deadband else (abs(duty) - self.deadband) / (1 - self.deadband) * (1 if duty > 0 else -1)
        target = drive * self.rpm_per_duty
        self.rpm += (target - self.rpm) * min(1.0, dt_s / self.tau_s)
        self.position_rev += self.rpm / 60.0 * dt_s


class FakeHal:
    def __init__(self, step_us=50):
        self.t_us = 0
        self.step_us = step_us
        self.last_us = 0
        self.left = SimMotor()
        self.right = SimMotor()
        self.duty = (0.0, 0.0)
        self.enabled = False
        self.estop = False
        self.fault = False
        self.start = False
        self.enable_history = []

    def _advance(self):
        dt = (self.t_us - self.last_us) / 1e6
        if dt > 0:
            on = self.enabled and not self.estop
            self.left.advance(self.duty[0] if on else 0.0, dt)
            self.right.advance(self.duty[1] if on else 0.0, dt)
            self.last_us = self.t_us

    def ticks_us(self):
        self.t_us += self.step_us
        return self.t_us

    def ticks_ms(self):
        return self.t_us // 1000

    def ticks_diff(self, a, b):
        return a - b

    def poll_encoders(self):
        self._advance()
        cpr = config.COUNTS_PER_OUTPUT_REV
        return int(self.left.position_rev * cpr), int(self.right.position_rev * cpr)

    def set_enabled(self, on):
        self._advance()
        self.enabled = bool(on)
        self.enable_history.append(self.enabled)

    def set_duty(self, left, right):
        self._advance()
        self.duty = (left, right)

    def estop_active(self):
        return self.estop

    def driver_fault(self):
        return self.fault

    def start_pressed(self):
        return self.start

    def currents(self):
        return None

    def battery_v(self):
        return None
