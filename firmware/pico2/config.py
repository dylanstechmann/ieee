# Pico 2 (RP2350) configuration for the drivetrain mule.
#
# PROVISIONAL PIN MAP: the motor driver is not chosen (derived/electrical-selection-v6 lists the
# #1213 MC33926 and the #2991 G2 18v17 as candidates). The bench/electrical lead must review this
# map against the chosen driver's datasheet and the wiring before anything is energized.
# Encoder outputs from the 37D motors are 5 V logic; level-shift them to 3.3 V before these pins.

PINS = {
    "enc_left_a": 6, "enc_left_b": 7,      # PIO counts A rising edges, B gives direction
    "enc_right_a": 8, "enc_right_b": 9,
    "pwm_left": 10, "dir_left": 11,
    "pwm_right": 12, "dir_right": 13,
    "driver_enable": 14,                   # driver enable / sleep; low = outputs off
    "driver_fault": 15,                    # active-low fault / status flag
    "estop_sense": 16,                     # reads the e-stop state; the e-stop itself cuts motor power
    "start_switch": 17,                    # single marked start switch (GM1 R03), active low
    "i2c_sda": 4, "i2c_scl": 5,            # IMU, later
    "current_left_adc": 26, "current_right_adc": 27, "battery_adc": 28,
}

PWM_FREQ_HZ = 20000
CONTROL_HZ = 200
ENCODER_POLL_HZ = 1000
LOG_EVERY_N_TICKS = 4            # 50 Hz telemetry
COUNTS_PER_OUTPUT_REV = 1120     # x1 decoding: 64 CPR / 4 x 70:1
MAX_OUTPUT_RPM = 150.0           # #4754 no-load at 12 V (datasheet)
AUTO_STOP_MS = 178000            # project choice, 2 s before the 3:00 match end
COMMAND_TIMEOUT_MS = 250
START_STATIC_MS = 5000           # GM1 R03: stay static 5 s after a switch start

# Sign conventions: +1 drives the robot forward on that side. Check on the bench and flip if needed.
LEFT_MOTOR_SIGN = 1
RIGHT_MOTOR_SIGN = -1
LEFT_ENCODER_SIGN = 1
RIGHT_ENCODER_SIGN = -1

# Analog scaling placeholders (driver and divider not chosen): volts per amp, divider ratio.
CURRENT_SENSE_V_PER_A = None
BATTERY_DIVIDER_RATIO = None
