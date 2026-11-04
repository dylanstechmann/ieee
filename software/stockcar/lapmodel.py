"""Lap and mission time and score estimates for the v10 lap study.

Deliberately simple and explicit: straights at cruise speed, U-turn arcs limited by lateral
acceleration, lane changes at a reduced speed, fixed allowances for entry, the pit visit and parking.
Every number is a stated assumption to be replaced by bench and field measurements. This is not a
dynamics model, and its scores are planning arithmetic, not referee results.
"""
import math

# Speed envelopes in in/s. "v9" repeats the v9 simulator's cruise (0.2032 m/s); the motors' no-load
# speed with 80 mm wheels is about 24.7 in/s, so "fast" still leaves headroom.
ENVELOPES = {
    "v9": {"cruise": 8.0, "lane_change": 4.0, "lat_accel": 38.6, "spin_rad_s": 1.8},
    "nominal": {"cruise": 12.0, "lane_change": 6.0, "lat_accel": 38.6, "spin_rad_s": 2.5},
    "fast": {"cruise": 16.0, "lane_change": 8.0, "lat_accel": 38.6, "spin_rad_s": 3.0},
}

UTURN_RADIUS_IN = 7.5        # inside the 6.0-9.3 in window from the CAD hand check
UTURN_TRANSITION_IN = 6.0    # entering and leaving each arc
STRAIGHT_IN = 48.0           # planning window x = 38 -> 86 along each straightaway
CONTACT_PENALTY_S = 1.5      # slowing for and pushing past a vehicle
ENTRY_IN, PIT_DETOUR_IN, PARK_IN = 40.0, 90.0, 50.0
FIXED_STOPS_S = 10.0         # spins, settling and alignment over the whole mission
EXCHANGE_S = 8.0             # v9 assumption for one exchange attempt
AUTO_STOP_S, BONUS_S = 178.0, 165.0


def uturn_time(env):
    v = min(env["cruise"], math.sqrt(env["lat_accel"] * UTURN_RADIUS_IN))
    return (math.pi * UTURN_RADIUS_IN + UTURN_TRANSITION_IN) / v


def straight_time(env, mode, path_cost_in=None, contacts=0):
    """mode: 'straight' (clean line), 'lane_change' (planned path), or 'contact' (pushes past vehicles)."""
    if mode == "lane_change":
        extra = max(0.0, path_cost_in - STRAIGHT_IN)
        return STRAIGHT_IN / env["cruise"] + extra / env["lane_change"]
    t = STRAIGHT_IN / env["cruise"]
    if mode == "contact":
        t += CONTACT_PENALTY_S * contacts
    return t


def lap_time(env, straights):
    """straights: two dicts with 'mode', optional 'path_cost_in' and 'contacts'."""
    return 2 * uturn_time(env) + sum(straight_time(env, s["mode"], s.get("path_cost_in"), s.get("contacts", 0)) for s in straights)


def mission_time(env, lap_s, exchange=True):
    travel = (ENTRY_IN + PIT_DETOUR_IN + PARK_IN) / env["cruise"]
    return travel + 3 * lap_s + FIXED_STOPS_S + (EXCHANGE_S if exchange else 0.0)


def expected_score(mission_s, contact_free, p_exchange=0.7, exchange=True):
    """Expected nominal points for one match under the V3 table, with explicit assumptions.

    Assumed achieved: enter 25, green start 10, clean walls 3 x 15, flag 25, parking 15 (if
    finished). Obstacle bonus 3 x 25 only when every lap is contact-free. Exchange 65 x p_exchange.
    """
    finished = mission_s <= AUTO_STOP_S
    score = 25 + 10 + 45 + 25
    if finished:
        score += 100 + 15 + (30 if mission_s < BONUS_S else 0)
    if contact_free:
        score += 75
    if exchange:
        score += 65 * p_exchange
    return round(score, 2)
