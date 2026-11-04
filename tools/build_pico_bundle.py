"""Builds the folder to copy onto the Pico 2: firmware, the shared logic files and packed route tables.

The firmware imports by bare name, so supervisor.py and tracker.py go beside it. Routes come from
derived/maneuver-v10/route-library.json, one small binary file per route (firmware/pico2/route_store.py
reads them), because the whole JSON library would not fit in RAM. Nothing here has run on a board.

Usage: python -I tools/build_pico_bundle.py OUT_DIR
"""
import json
import pathlib
import shutil
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIBRARY = ROOT / "derived" / "maneuver-v10" / "route-library.json"
SHARED = ("supervisor.py", "tracker.py")
MAGIC = b"RT10"
COLUMNS = ("x", "y", "heading", "curvature", "speed")


def pack(table):
    count = len(table["x"])
    out = MAGIC + struct.pack("<I", count) + struct.pack("<f", table["step_in"])
    for column in COLUMNS:
        out += struct.pack(f"<{count}f", *table[column])
    return out


def route_tables(library):
    """Every route under the name the mission driver asks for."""
    tables = {"enter": library["enter"], **library["laps"]}
    for box, legs in library["pit"].items():
        tables[f"to_pit_{box}"] = legs["TO_PIT"]
        tables[f"exit_pit_{box}"] = legs["EXIT_PIT"]
    return tables


def write_routes(out):
    library = json.loads(LIBRARY.read_text(encoding="utf-8"))
    folder = pathlib.Path(out)
    folder.mkdir(parents=True, exist_ok=True)
    tables = route_tables(library)
    for name, table in tables.items():
        (folder / f"{name}.rt").write_bytes(pack(table))
    return sorted(tables)


def build(out):
    out = pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    for source in (ROOT / "firmware" / "pico2").glob("*.py"):
        shutil.copy(source, out / source.name)
    for name in SHARED:
        shutil.copy(ROOT / "software" / "stockcar" / name, out / name)
    return write_routes(out / "routes")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    names = build(sys.argv[1])
    print(f"wrote {sys.argv[1]}: firmware, {', '.join(SHARED)} and {len(names)} routes")
