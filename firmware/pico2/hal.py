# Hardware layer for the Pico 2. Only this file touches machine/rp2; host tests use a fake with the
# same methods (firmware/host_tests/fakes.py).
import time

from machine import ADC, PWM, Pin

import config
from encoder import PioEncoder


class PicoHal:
    def __init__(self):
        p = config.PINS
        self.enc_left = PioEncoder(0, p["enc_left_a"], p["enc_left_b"], config.LEFT_ENCODER_SIGN)
        self.enc_right = PioEncoder(1, p["enc_right_a"], p["enc_right_b"], config.RIGHT_ENCODER_SIGN)
        self.pwm_left = PWM(Pin(p["pwm_left"]), freq=config.PWM_FREQ_HZ, duty_u16=0)
        self.pwm_right = PWM(Pin(p["pwm_right"]), freq=config.PWM_FREQ_HZ, duty_u16=0)
        self.dir_left = Pin(p["dir_left"], Pin.OUT, value=0)
        self.dir_right = Pin(p["dir_right"], Pin.OUT, value=0)
        self.enable_pin = Pin(p["driver_enable"], Pin.OUT, value=0)
        self.fault_pin = Pin(p["driver_fault"], Pin.IN, Pin.PULL_UP)
        self.estop_pin = Pin(p["estop_sense"], Pin.IN, Pin.PULL_UP)
        self.start_pin = Pin(p["start_switch"], Pin.IN, Pin.PULL_UP)
        self.battery = ADC(Pin(p["battery_adc"]))

    def ticks_ms(self):
        return time.ticks_ms()

    def ticks_us(self):
        return time.ticks_us()

    def ticks_diff(self, a, b):
        return time.ticks_diff(a, b)

    def poll_encoders(self):
        return self.enc_left.poll(), self.enc_right.poll()

    def set_enabled(self, on):
        self.enable_pin.value(1 if on else 0)

    def set_duty(self, left, right):
        for duty, sign, pwm, direction in ((left, config.LEFT_MOTOR_SIGN, self.pwm_left, self.dir_left),
                                          (right, config.RIGHT_MOTOR_SIGN, self.pwm_right, self.dir_right)):
            value = duty * sign
            direction.value(1 if value < 0 else 0)
            pwm.duty_u16(int(min(1.0, abs(value)) * 65535))

    def estop_active(self):
        # Wiring assumption: the sense pin reads high (pull-up) when the e-stop is pressed or open-circuit.
        return self.estop_pin.value() == 1

    def driver_fault(self):
        return self.fault_pin.value() == 0

    def start_pressed(self):
        return self.start_pin.value() == 0

    def currents(self):
        return None  # needs the chosen driver's current-sense scaling

    def battery_v(self):
        if config.BATTERY_DIVIDER_RATIO is None:
            return None
        return self.battery.read_u16() / 65535 * 3.3 * config.BATTERY_DIVIDER_RATIO

    # Sensor reads wait for Order B hardware and bench-lead review; nothing in main.py calls them yet.
    def read_gyro(self):
        raise NotImplementedError("gyro/IMU driver not chosen")

    def read_reflectance(self):
        raise NotImplementedError("reflectance array driver not chosen")

    def read_ranges(self):
        raise NotImplementedError("vehicle-detection ring driver not chosen")

    def read_camera(self):
        raise NotImplementedError("camera/apriltag interface not chosen")
