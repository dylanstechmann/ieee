# Turns the supervisor's phases into motion (MicroPython and CPython). Each phase is a route, started
# with a spin in place if the robot faces the wrong way, and finishing a route is what tells the
# supervisor it arrived. Pose, odometry and sensor observations come from the caller, so this needs no
# hardware. main.py does not start it: there is no real pose source until the sensors are chosen.
# Speeds are in/s, yaw rates rad/s.
import math

WRONG_WAY_RAD = 0.35
FACING_RAD = 0.04
SPIN_GAIN_PER_S = 3.0
SPIN_RATE_RAD_S = 2.0
LEAST_SPIN_RATE_RAD_S = 0.3
RECOVER_SPEED_IN_S = -3.0
ARRIVAL = {"ENTER": "checker_crossing", "LAP": "checker_crossing", "EXIT_PIT": "checker_crossing",
           "TO_PIT": "at_pit_box", "PARK": "in_assigned_box"}


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


class MissionDriver:
    def __init__(self, supervisor, load_route, make_tracker, lap_route, in_box=None):
        # load_route: route name -> table. make_tracker: table -> tracker. lap_route: name of this
        # match's lap. in_box: (pose, box) -> whether the robot is parked, judged from its own estimate.
        self.supervisor = supervisor
        self.load_route = load_route
        self.make_tracker = make_tracker
        self.lap_route = lap_route
        self.in_box = in_box
        self.out = None
        self.leg = None
        self.tracker = None
        self.start_heading = 0.0
        self.spin = None
        self.arrived = False

    def _leg_for(self, out):
        state = out["state"]
        if state == "ENTER":
            return "enter"
        if state == "LAP":
            return self.lap_route
        if state == "TO_PIT" or state == "PARK":
            return "to_pit_%d" % out["assigned_box"]
        if state == "EXIT_PIT":
            return "exit_pit_%d" % out["assigned_box"]
        return None

    def _start_leg(self, name):
        self.leg = name
        self.arrived = False
        self.spin = None
        self.tracker = None
        if name is not None:
            table = self.load_route(name)
            self.tracker = self.make_tracker(table)
            self.start_heading = table["heading"][0]

    def _arrival(self, obs, pose):
        key = ARRIVAL.get(self.out["state"])
        if key == "in_assigned_box":
            obs[key] = self.in_box is None or self.in_box(pose, self.out["assigned_box"])
        elif key is not None:
            obs[key] = True

    def _spin_rate(self, heading):
        # Decided once per leg, then held until the robot faces along the route.
        error = wrap(self.start_heading - heading)
        if self.spin is None:
            self.spin = abs(error) > WRONG_WAY_RAD
        if self.spin and abs(error) < FACING_RAD:
            self.spin = False
        if not self.spin:
            return None
        rate = max(-SPIN_RATE_RAD_S, min(SPIN_RATE_RAD_S, SPIN_GAIN_PER_S * error))
        return rate if abs(rate) >= LEAST_SPIN_RATE_RAD_S else math.copysign(LEAST_SPIN_RATE_RAD_S, error)

    def step(self, now_s, pose, odometry_m, observations):
        """One decision: returns (speed, yaw rate). pose is (x, y, heading) from the estimator."""
        obs = dict(observations)
        obs["odometry_m"] = odometry_m
        if self.arrived:
            self._arrival(obs, pose)
        before = self.out
        self.out = out = self.supervisor.update(now_s, obs)
        if before is None or out["state"] != before["state"] or out["laps"] != before["laps"]:
            self._start_leg(self._leg_for(out))
        if self.tracker is None or self.arrived:
            return 0.0, 0.0
        if out["motion"] == "recover":
            return RECOVER_SPEED_IN_S, 0.0
        rate = self._spin_rate(pose[2])
        if rate is not None:
            return 0.0, rate
        speed, rate, done = self.tracker.command(pose[0], pose[1], pose[2])
        if done:
            self.arrived = True
            return 0.0, 0.0
        return speed * out["speed_scale"], rate * out["speed_scale"]
