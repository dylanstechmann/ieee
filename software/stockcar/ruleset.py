"""Versioned "worlds" for the open organizer questions (QA01-QA10) — the single source of truth.

Each world is one coherent cast of the ten "working assumption" answers from
``derived/qa-pack-v10/QUESTIONS.md``. The five dimensions that actually change the driving strategy
differ between worlds; the rest (AprilTag pose QA02, pit openings QA05, 75% parking QA07, start-flag
QA08, tolerances QA09, publicity QA10) are pinned to the current best guess everywhere because they
only move reliability/timing/margins, not route shape.

Agent-written for the owner's hobby/learning project; every value is a documented assumption, not an
organizer ruling. ``software/stockcar/DEFAULT_WORLD`` names the world a given branch ships by default.
"""
import pathlib

from stockcar.obstacles import GUIDE_PLUSH
from stockcar.sensors_camera import FLAG_POSE, TAG_POSE

ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_FILE = ROOT / "DEFAULT_WORLD"

# A smaller official toy is a QA03 possibility, not a measured fact. These are placeholder dimensions
# until a ruling names the real toy; never treat them as a competition value.
SMALL_TOY = {"id": "small_toy", "length_in": 8.0, "width_in": 4.0,
             "source": "placeholder for a QA03 smaller-official-toy ruling; not a measured vehicle"}

# Pinned across all worlds (reliability/timing/margins only, not strategy).
PINNED = {
    "reading": "offsets",                      # QA03 Appendix E quadrant reading
    "tag_pose": TAG_POSE,                      # QA02 (assumed)
    "flag_pose": FLAG_POSE,                    # QA08 (assumed)
    "flag_mode": "raise",                      # QA08 (assumed)
    "pit_fraction": 0.75,                      # QA07 (assumed)
    "preset": "aggressive",
    "envelope": "nominal",
    "divider": "cad_1x1",                      # QA09 (assumed)
    "wall_thickness": None,                    # QA09 (assumed)
}
PINNED_QA = ["QA02", "QA05", "QA07", "QA08", "QA09", "QA10"]

# The five dimensions that differ between worlds.
_WORLD_SPECS = {
    "world-ccw-line-sq-adv-align": {"lap": "line", "lap_mode": "drive", "direction": "ccw",
                                    "body": "square10", "lane_rule": "advisory", "obstacle": "align"},
    "world-ccw-gate-sq-adv-align": {"lap": "gate", "lap_mode": "drive", "direction": "ccw",
                                    "body": "square10", "lane_rule": "advisory", "obstacle": "align"},
    "world-ccw-line-rd-adv-align": {"lap": "line", "lap_mode": "drive", "direction": "ccw",
                                    "body": "round10", "lane_rule": "advisory", "obstacle": "align"},
    "world-ccw-gate-rd-adv-align": {"lap": "gate", "lap_mode": "drive", "direction": "ccw",
                                    "body": "round10", "lane_rule": "advisory", "obstacle": "align"},
    "world-ccw-line-sq-adv-yaw":   {"lap": "line", "lap_mode": "drive", "direction": "ccw",
                                    "body": "square10", "lane_rule": "advisory", "obstacle": "yaw"},
    "world-ccw-line-sq-enf-align": {"lap": "line", "lap_mode": "drive", "direction": "ccw",
                                    "body": "square10", "lane_rule": "enforced", "obstacle": "align"},
    "world-cw-line-sq-adv-align":  {"lap": "line", "lap_mode": "drive", "direction": "cw",
                                    "body": "square10", "lane_rule": "advisory", "obstacle": "align"},
    "world-ccw-line-sq-adv-small": {"lap": "line", "lap_mode": "drive", "direction": "ccw",
                                    "body": "square10", "lane_rule": "advisory", "obstacle": "small"},
}

_BODY = {"square10": ("square", 10.0), "round10": ("round", 10.0)}
_OBSTACLE = {"align": (GUIDE_PLUSH, "aligned"), "yaw": (GUIDE_PLUSH, "random"), "small": (SMALL_TOY, "aligned")}

# Which QA item each varying dimension depends on (only "lap_mode" is not a tracked dimension).
_DIM_QA = {"lap": "QA06", "direction": "QA06", "body": "QA01", "lane_rule": "QA04", "obstacle": "QA03"}


def world_names():
    return sorted(_WORLD_SPECS)


def get(name):
    """Expand a world spec into its full, validated settings dict."""
    if name not in _WORLD_SPECS:
        raise KeyError(f"unknown world {name!r}; available: {world_names()}")
    spec = _WORLD_SPECS[name]
    if spec["body"] not in _BODY or spec["obstacle"] not in _OBSTACLE:
        raise ValueError(f"bad body/obstacle in world {name!r}")
    footprint_kind, footprint_in = _BODY[spec["body"]]
    shape, yaw_mode = _OBSTACLE[spec["obstacle"]]
    return dict(PINNED, footprint_kind=footprint_kind, footprint_in=footprint_in,
                shape=shape, yaw_mode=yaw_mode, **spec)


def default_name():
    return DEFAULT_FILE.read_text(encoding="utf-8").strip()


def get_default():
    return get(default_name())


def deps(name):
    """The QA items the world's differing dimensions depend on."""
    if name not in _WORLD_SPECS:
        raise KeyError(f"unknown world {name!r}")
    return sorted({_DIM_QA[k] for k in _WORLD_SPECS[name] if k in _DIM_QA})