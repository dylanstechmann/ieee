# Host (CPython) tests for the MicroPython firmware in ../pico2. The firmware modules import each
# other by bare name, as they do on the board, so their folder goes on sys.path here.
import os
import sys

PICO2 = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "pico2"))
if PICO2 not in sys.path:
    sys.path.insert(0, PICO2)
