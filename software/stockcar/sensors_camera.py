"""Camera-based game-element sensors for the simulator: the pit-box AprilTag, the start flag and the
checkered lap line. The checkered openings come from the organizer CAD (`field-v10.json`); the tag and
flag poses are documented assumptions until QA02 (AprilTag position) and QA08 (start flag) are answered
and a built field is measured. Replace TAG_POSE and FLAG_POSE with measured positions.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math

from stockcar.geometry import wrap

# Documented assumptions (open questions QA02 and QA08). The organizer CAD leaves the tag and the
# start-flag tower unplaced ("unplaced_post"), so these are placeholders, not measured facts.
TAG_POSE = (28.0, 39.0)          # AprilTag ahead of the start box, high side (assumed)
FLAG_POSE = (30.0, 39.0)         # start-flag tower ahead of the start box, in the camera cone (assumed)

CAMERA_FORWARD_IN = 4.5          # camera mounted forward of the robot origin, along +heading
CAMERA_FOV_RAD = math.radians(45.0)
CAMERA_MAX_RANGE_IN = 36.0


def _visible(pose, target, forward=CAMERA_FORWARD_IN, fov=CAMERA_FOV_RAD, max_range=CAMERA_MAX_RANGE_IN):
    """(range_in, bearing_rad) from the camera to a world-space target, or (None, None) outside the
    camera's envelope. The envelope is a range cap plus a forward half-cone of half-angle `fov`."""
    x, y, th = pose
    ox, oy = x + forward * math.cos(th), y + forward * math.sin(th)
    dx, dy = target[0] - ox, target[1] - oy
    r = math.hypot(dx, dy)
    if r > max_range or r < 1e-9:
        return None, None
    bearing = wrap(math.atan2(dy, dx) - th)
    if abs(bearing) > fov:
        return None, None
    return r, bearing


class CameraModel:
    """Reads the single pit-box AprilTag (tagStandard41h12, IDs 1-3). Decoding needs the tag inside the
    camera envelope (range + forward half-cone); otherwise the read is (None, None, None) and the
    supervisor's majority vote (supervisor.py `_vote` / `_resolve_box`) falls back after failing to reach
    `tag_votes_needed`."""

    def __init__(self, tag_id, tag_pose=TAG_POSE, forward=CAMERA_FORWARD_IN, fov=CAMERA_FOV_RAD,
                 max_range=CAMERA_MAX_RANGE_IN):
        self.tag_id = tag_id
        self.tag_pose = tag_pose
        self.forward = forward
        self.fov = fov
        self.max_range = max_range

    def read(self, pose):
        r, bearing = _visible(pose, self.tag_pose, self.forward, self.fov, self.max_range)
        if r is None:
            return None, None, None
        return self.tag_id, r, bearing


class StartFlagModel:
    """Detects the start flag. Visibility is geometric (the camera must see the flag tower); the
    raised/lowered state is the real flag input, surfaced only when the flag is visible. A missed frame
    returns (False, None) and, like the robot, does not advance the supervisor's down/up frame counts."""

    def __init__(self, flag_pose=FLAG_POSE, forward=CAMERA_FORWARD_IN, fov=CAMERA_FOV_RAD,
                 max_range=CAMERA_MAX_RANGE_IN):
        self.flag_pose = flag_pose
        self.forward = forward
        self.fov = fov
        self.max_range = max_range

    def read(self, pose, up):
        r, _ = _visible(pose, self.flag_pose, self.forward, self.fov, self.max_range)
        return (False, None) if r is None else (True, up)


class LapLineDetector:
    """Downward checkered-line crossing at the pit mouth. Fires a rising edge when the robot's centre
    moves from outside to inside one of the two checkered openings; the supervisor (`supervisor.py`)
    rejects spurious refreshes with its lap-length guard, so a plain edge here is enough."""

    def __init__(self, field):
        c = field.data["features"]["checker_band"]
        self.x0, self.x1 = c["x"]
        self.low = (c["low_y"][0], c["low_y"][1])
        self.high = (c["high_y"][0], c["high_y"][1])
        self.last = None

    def _over(self, x, y):
        if not (self.x0 <= x <= self.x1):
            return False
        return self.low[0] <= y <= self.low[1] or self.high[0] <= y <= self.high[1]

    def detect(self, pose, prev_pose):
        now = self._over(pose[0], pose[1])
        was = self.last
        self.last = now
        if now and (was is None or not was):
            return math.hypot(pose[0] - prev_pose[0], pose[1] - prev_pose[1]) > 1e-9
        return False