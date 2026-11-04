# Fixed-rate control loop shared by the bench script and, later, the mission. Hardware-independent:
# it talks to any object with the PicoHal methods, so host tests run it against a simulated motor.
import config
from drive import DriveShaper
from motor import WheelSpeedController, rpm_from_counts
from safety import SafetyMonitor
from telemetry import Telemetry


class Runner:
    def __init__(self, hal, mode="BENCH", telemetry_capacity=3000):
        self.hal = hal
        self.mode = mode
        self.safety = SafetyMonitor(config.AUTO_STOP_MS, config.COMMAND_TIMEOUT_MS)
        self.left = WheelSpeedController(max_rpm=config.MAX_OUTPUT_RPM)
        self.right = WheelSpeedController(max_rpm=config.MAX_OUTPUT_RPM)
        self.shaper = DriveShaper(config.MAX_WHEEL_RPM, config.MAX_ACCEL_M_S2, config.MAX_BRAKE_M_S2, config.MAX_YAW_ACCEL_RAD_S2,
                                  config.WHEEL_RADIUS_M, config.HALF_TRACK_M)
        self.log = Telemetry(telemetry_capacity)
        self.period_us = 1000000 // config.CONTROL_HZ
        self.tick = 0
        self.last_counts = (0, 0)
        self.rpm = (0.0, 0.0)
        self.applied = (0.0, 0.0)

    def arm(self):
        self.last_counts = self.hal.poll_encoders()
        ok = self.safety.arm(self.hal.ticks_ms(), self.hal.estop_active(), True)
        self.hal.set_enabled(ok)
        return ok

    def stop(self):
        self.safety.latch("command_watchdog" if not self.safety.stopped else self.safety.stop_reason)
        self.hal.set_duty(0.0, 0.0)
        self.hal.set_enabled(False)

    def drive(self, speed_m_s, yaw_rate_rad_s):
        # One tick of body-motion control; the bench script calls step() directly for raw wheel commands.
        return self.step(self.shaper.step(speed_m_s, yaw_rate_rad_s, self.period_us / 1000000), True)

    def step(self, command, closed_loop):
        # command: (left, right) as duty (-1..1) when closed_loop is False, else target output rpm.
        start = self.hal.ticks_us()
        now = self.hal.ticks_ms()
        counts = self.hal.poll_encoders()
        dt_s = self.period_us / 1000000
        self.rpm = (rpm_from_counts(counts[0] - self.last_counts[0], dt_s, config.COUNTS_PER_OUTPUT_REV),
                    rpm_from_counts(counts[1] - self.last_counts[1], dt_s, config.COUNTS_PER_OUTPUT_REV))
        self.last_counts = counts
        self.safety.note_command(now)
        self.safety.update(now, self.hal.estop_active(), self.hal.driver_fault())
        if closed_loop:
            duty = (self.left.step(command[0], self.rpm[0], dt_s), self.right.step(command[1], self.rpm[1], dt_s))
        else:
            duty = command
        self.applied = self.safety.filter(duty[0], duty[1])
        self.hal.set_duty(self.applied[0], self.applied[1])
        if self.safety.stopped:
            self.hal.set_enabled(False)
            self.left.reset()
            self.right.reset()
            self.shaper.reset()
        loop_us = self.hal.ticks_diff(self.hal.ticks_us(), start)
        if loop_us > self.period_us:
            self.safety.note_overrun()
        if self.tick % config.LOG_EVERY_N_TICKS == 0:
            self.log.record(now, self.mode, counts, command, self.applied, self.rpm, self.hal.currents(),
                            self.hal.battery_v(), self.hal.estop_active(), self.safety.stop_reason, loop_us)
        self.tick += 1
        return loop_us

    def wait_next(self, deadline_us):
        # Busy-wait to the next tick; returns the following deadline. Uses wrapping tick arithmetic.
        while self.hal.ticks_diff(deadline_us, self.hal.ticks_us()) > 0:
            pass
        return deadline_us + self.period_us
