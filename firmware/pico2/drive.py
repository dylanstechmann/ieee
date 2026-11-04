# Body-motion shaping (MicroPython and CPython): turns a speed and yaw-rate request into wheel targets
# within the acceleration limits, and slows down rather than change the turn radius when the faster
# wheel runs out of speed. Limits come from config.py.

from safety import clamp

RAD_S_TO_RPM = 60.0 / 6.283185307179586


class DriveShaper:
    def __init__(self, max_wheel_rpm, max_accel_m_s2, max_brake_m_s2, max_yaw_accel_rad_s2, wheel_radius_m, half_track_m):
        self.max_wheel_speed_m_s = max_wheel_rpm / RAD_S_TO_RPM * wheel_radius_m
        self.max_accel = max_accel_m_s2
        self.max_brake = max_brake_m_s2
        self.max_yaw_accel = max_yaw_accel_rad_s2
        self.wheel_radius = wheel_radius_m
        self.half_track = half_track_m
        self.speed = 0.0
        self.yaw_rate = 0.0

    def reset(self):
        self.speed = 0.0
        self.yaw_rate = 0.0

    def _fit(self, speed, yaw_rate):
        # Scaling both together keeps speed / yaw_rate, which is the turn radius.
        fastest = abs(speed) + self.half_track * abs(yaw_rate)
        if fastest <= self.max_wheel_speed_m_s:
            return speed, yaw_rate
        scale = self.max_wheel_speed_m_s / fastest
        return speed * scale, yaw_rate * scale

    def step(self, speed_m_s, yaw_rate_rad_s, dt_s):
        target_speed, target_yaw_rate = self._fit(speed_m_s, yaw_rate_rad_s)
        slowing = target_speed * self.speed < 0 or abs(target_speed) < abs(self.speed)
        speed_step = (self.max_brake if slowing else self.max_accel) * dt_s
        yaw_step = self.max_yaw_accel * dt_s
        speed_change = clamp(target_speed - self.speed, -speed_step, speed_step)
        yaw_change = clamp(target_yaw_rate - self.yaw_rate, -yaw_step, yaw_step)
        # Both changes draw on the same wheels' grip, so they share one budget.
        load = abs(speed_change) / speed_step + abs(yaw_change) / yaw_step
        if load > 1.0:
            speed_change /= load
            yaw_change /= load
        self.speed, self.yaw_rate = self._fit(self.speed + speed_change, self.yaw_rate + yaw_change)
        left = (self.speed - self.half_track * self.yaw_rate) / self.wheel_radius
        right = (self.speed + self.half_track * self.yaw_rate) / self.wheel_radius
        return left * RAD_S_TO_RPM, right * RAD_S_TO_RPM
