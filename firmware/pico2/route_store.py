# Route tables on the board (MicroPython and CPython). A route file holds float32 arrays, so a table
# costs 20 bytes per point and only the routes in use sit in RAM. tools/build_pico_bundle.py writes them.
import struct
from array import array

MAGIC = b"RT10"
COLUMNS = ("x", "y", "heading", "curvature", "speed")


def load(path):
    with open(path, "rb") as f:
        head = f.read(12)
        if head[:4] != MAGIC:
            raise ValueError("not a route file: " + path)
        count = struct.unpack("<I", head[4:8])[0]
        table = {"step_in": struct.unpack("<f", head[8:12])[0]}
        for column in COLUMNS:
            data = f.read(4 * count)
            if len(data) != 4 * count:
                raise ValueError("truncated route file: " + path)
            table[column] = array("f", data)
    return table
