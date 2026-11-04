# Wheel-speed control (MicroPython and CPython): PI with feed-forward, anti-windup, slew limit.
# Gains and feed-forward start as placeholders; fit them from E02 bench data (tools/bench/fit_motor.py).

from safety import clamp


class WheelSpeedController:
    def __init__(self, kp=0.004, ki=0.03, kff=None, static_duty=0.0, max_slew_per_s=4.0, max_rpm=150.0):
        # kff: duty per output rpm; the default assumes duty scales linearly to no-load speed.
        self.kp = kp
        self.ki = ki
        self.kff = (1.0 / max_rpm) if kff is None else kff
        self.static_duty = static_duty
        self.max_slew_per_s = max_slew_per_s
        self.integral = 0.0
        self.output = 0.0

    def reset(self):
        self.integral = 0.0
        self.output = 0.0

    def step(self, target_rpm, measured_rpm, dt_s):
        if target_rpm == 0.0:
            # Commanded stop: release integral action so the wheel does not creep.
            self.integral = 0.0
            desired = 0.0
        else:
            error = target_rpm - measured_rpm
            feed_forward = self.kff * target_rpm + (self.static_duty if target_rpm > 0 else -self.static_duty)
            proportional = self.kp * error
            candidate = self.integral + self.ki * error * dt_s
            unsaturated = feed_forward + proportional + candidate
            # Conditional integration: stop integrating when saturated in the same direction (anti-windup).
            if (unsaturated > 1.0 and error > 0) or (unsaturated < -1.0 and error < 0):
                candidate = self.integral
            self.integral = candidate
            desired = clamp(feed_forward + proportional + self.integral, -1.0, 1.0)
        max_step = self.max_slew_per_s * dt_s
        self.output = clamp(desired, self.output - max_step, self.output + max_step)
        return self.output


def rpm_from_counts(delta_counts, dt_s, counts_per_rev):
    if dt_s <= 0:
        return 0.0
    return delta_counts / counts_per_rev / dt_s * 60.0
