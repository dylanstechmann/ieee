"""Deterministic synthetic mission path follower; not a legal route or hardware model.

The route reuses the preserved v3 forward/reverse/spin geometry. The controller
tracks one sampled primitive at a time and never advances by distance travelled.
Standard-library simulation works without Gymnasium or NumPy.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IN = 0.0254
PHASES = ('WAIT_START', 'ENTER', 'LAP', 'TO_PIT', 'EXCHANGE', 'EXIT_PIT', 'PARK', 'DONE', 'STOPPED')


def wrap(a):
    return math.atan2(math.sin(a), math.cos(a))


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def load_spec():
    config = json.loads((ROOT / 'mission-v9.json').read_text())
    layout = json.loads((ROOT / config['source_layout']).read_text())
    return config, layout


def rectangle(cx, cy, length, width, yaw=0.0):
    c, s = math.cos(yaw), math.sin(yaw)
    return [(cx + x * c - y * s, cy + x * s + y * c)
            for x, y in [(-length / 2, -width / 2), (length / 2, -width / 2),
                         (length / 2, width / 2), (-length / 2, width / 2)]]


def cross(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def intersects(a, b):
    for polygon in (a, b):
        for i, p in enumerate(polygon):
            q = polygon[(i + 1) % len(polygon)]
            axis = (p[1] - q[1], q[0] - p[0])
            pa = [v[0] * axis[0] + v[1] * axis[1] for v in a]
            pb = [v[0] * axis[0] + v[1] * axis[1] for v in b]
            if max(pa) < min(pb) - 1e-10 or max(pb) < min(pa) - 1e-10:
                return False
    return True


def area(polygon):
    return abs(sum(p[0] * polygon[(i + 1) % len(polygon)][1] -
                   polygon[(i + 1) % len(polygon)][0] * p[1]
                   for i, p in enumerate(polygon))) / 2


def overlap_fraction(subject, clip):
    out = subject
    for i, a in enumerate(clip):
        b = clip[(i + 1) % len(clip)]
        source, out = out, []
        for j, p in enumerate(source):
            q = source[(j + 1) % len(source)]
            cp, cq = cross(a, b, p), cross(a, b, q)
            if cp >= -1e-10:
                out.append(p)
            if (cp >= -1e-10) != (cq >= -1e-10):
                t = cp / (cp - cq)
                out.append((p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])))
        if not out:
            return 0.0
    return clamp(area(out) / area(subject), 0, 1)


def route_primitives(waypoints):
    result = []
    for a, b in zip(waypoints, waypoints[1:]):
        dx, dy = (b[i] - a[i] for i in range(2))
        length = math.hypot(dx, dy)
        angle = wrap(b[2] - a[2])
        if length > 1e-8 and abs(angle) < 1e-8:
            b = (b[0], b[1], a[2])
            angle = 0.0
        if length > 1e-8 and abs(angle) > 1e-8:
            raise ValueError('simultaneous translation and rotation unsupported')
        if length > 1e-8 and abs(-dx * math.sin(a[2]) + dy * math.cos(a[2])) > 1e-7:
            raise ValueError('lateral translation unsupported')
        result.append({'start': a, 'end': b, 'length': length if length > 1e-8 else abs(angle),
                       'kind': 'spin' if length <= 1e-8 else ('forward' if dx * math.cos(a[2]) + dy * math.sin(a[2]) >= 0 else 'reverse')})
    return result


def sample_route(waypoints, translation_step, rotation_step):
    samples = [tuple(waypoints[0])]
    for primitive in route_primitives(waypoints):
        a, b = primitive['start'], primitive['end']
        n = max(1, math.ceil(dist(a, b) / translation_step), math.ceil(abs(wrap(b[2] - a[2])) / rotation_step))
        samples.extend(tuple(a[k] + (b[k] - a[k]) * j / n for k in range(3)) for j in range(1, n + 1))
    return samples


class PathFollower:
    """Track the current segment; projected arrival is independent of path length."""
    def __init__(self, waypoints, config):
        self.primitives = route_primitives(waypoints)
        self.config = config
        self.index = 0
        self.settled = 0.0

    @property
    def target(self):
        return self.primitives[min(self.index, len(self.primitives) - 1)]['end']

    def action(self, pose, dt):
        c = self.config
        p = self.primitives[self.index]
        a, b = p['start'], p['end']
        if p['kind'] == 'spin':
            error = wrap(b[2] - pose[2])
            desired_w = clamp(c['heading_gain'] * error, -c['max_yaw_rate_rad_s'], c['max_yaw_rate_rad_s'])
            desired_w = math.copysign(min(abs(desired_w), math.sqrt(2 * c['max_yaw_acceleration_rad_s2'] * abs(error))), error)
            arrived = abs(error) <= c['heading_tolerance_rad'] and abs(pose[4]) <= 0.08
            command = (0.0, desired_w / c['max_yaw_rate_rad_s'])
        else:
            dx, dy = b[0] - a[0], b[1] - a[1]
            length2 = dx * dx + dy * dy
            projection = ((pose[0] - a[0]) * dx + (pose[1] - a[1]) * dy) / length2
            lateral = -(pose[0] - a[0]) * dy / math.sqrt(length2) + (pose[1] - a[1]) * dx / math.sqrt(length2)
            remaining = max(0.0, (1 - projection) * math.sqrt(length2))
            heading = a[2] - c['cross_track_gain'] * lateral
            error = wrap(heading - pose[2])
            at_endpoint = projection >= 1 - 1e-8 and abs(lateral) <= c['position_tolerance_m']
            desired_v = 0.0 if at_endpoint else min(c['cruise_speed_m_s'], math.sqrt(2 * c['max_acceleration_m_s2'] * remaining))
            desired_v *= clamp(1 - abs(error) / 0.8, 0, 1)
            if p['kind'] == 'reverse':
                desired_v = -desired_v
            desired_w = clamp(c['heading_gain'] * error, -c['max_yaw_rate_rad_s'], c['max_yaw_rate_rad_s'])
            arrived = at_endpoint and abs(pose[3]) <= 0.04
            if abs(error) > 0.8:
                desired_v = 0.0
                desired_w = math.copysign(min(abs(desired_w), math.sqrt(
                    2 * c['max_yaw_acceleration_rad_s2'] * abs(error))), error)
            command = (desired_v / c['max_speed_m_s'], desired_w / c['max_yaw_rate_rad_s'])
        if arrived:
            self.settled += dt
        else:
            self.settled = 0.0
        complete = self.settled + 1e-9 >= c['settle_time_s']
        return (0.0, 0.0) if complete else command

    def advance(self):
        self.index += 1
        self.settled = 0.0
        return self.index == len(self.primitives)


class MissionSim:
    def __init__(self, config=None, layout=None):
        self.config, self.layout = load_spec() if config is None else (config, layout)
        self.features = {f['id']: f for f in self.layout['features']}
        report = json.loads((ROOT / self.config['control']['route_source']).read_text())
        self.source_routes = {r['target_id']: r for r in report['routes']}
        self.boxes = {}
        for i in (1, 2, 3):
            vertices = self.features[f'pit_box_{i}']['vertices_in']
            self.boxes[i] = [(x * IN, y * IN) for x, y in vertices]
        start = self.features['start_box']['vertices_in']
        self.start = (sum(p[0] for p in start) / 4 * IN, sum(p[1] for p in start) / 4 * IN, 0.0)
        self.solids = []
        for name, width in [('center_divider_axis', self.config['field']['center_divider_width_m']),
                            ('pit_divider_axis', self.config['field']['pit_divider_width_m'])]:
            a, b = [(x * IN, y * IN) for x, y in self.features[name]['vertices_in']]
            if a[1] == b[1]:
                self.solids.append((name, rectangle((a[0] + b[0]) / 2, a[1], abs(b[0] - a[0]), width)))
            else:
                self.solids.append((name, rectangle(a[0], (a[1] + b[1]) / 2, width, abs(b[1] - a[1]))))

    def _route(self, begin, end, final_lap=False):
        points = self.source_routes[f'pit_box_{self.assigned_box}']['waypoints']
        points = [(x * IN, y * IN, math.radians(h)) for x, y, h in points]
        if begin == 'start' and end == 'join':
            points = points[:5]
        elif begin == 'pit' and end == 'join':
            points = points[17:]
        elif begin == 'join' and end == 'pit':
            join, dock = points[4], points[17]
            turn = (35 * IN, join[1], 0)
            staging = (9 * IN, points[1][1], math.pi)
            points = [join, turn, (turn[0], turn[1], math.pi / 2),
                      (turn[0], staging[1], math.pi / 2),
                      (turn[0], staging[1], math.pi), staging,
                      (staging[0], staging[1], math.pi / 2),
                      (staging[0], dock[1], math.pi / 2),
                      (staging[0], dock[1], math.pi), dock]
        elif begin == 'join' and end == 'join':
            points = points[4:10] + [(points[9][0], points[9][1], -math.pi / 2), points[3], points[4]]
        elif begin == 'join' and end == 'park':
            start, dock = points[9], points[17]
            if self.assigned_box == 2:
                gate = (points[9][0], points[11][1], math.pi / 2)
                staging = (9 * IN, points[11][1], math.pi / 2)
                points = [start, (start[0], start[1], math.pi / 2), gate,
                          (gate[0], gate[1], 0), (staging[0], staging[1], 0),
                          (staging[0], staging[1], -math.pi / 2),
                          (staging[0], dock[1], -math.pi / 2),
                          (staging[0], dock[1], math.pi), dock]
            else:
                points = [start, (start[0], start[1], math.pi / 2),
                          (start[0], dock[1], math.pi / 2),
                          (start[0], dock[1], math.pi), dock]
        else:
            raise ValueError(f'unknown route {begin} to {end}')
        if final_lap:
            points = points[:10]
        return points

    def _set_route(self, phase, begin, end, final_lap=False):
        self.state['phase'] = phase
        self.state['phase_t'] = 0.0
        points = self._route(begin, end, final_lap)
        self.state['route_name'] = f'{begin}-to-{end}'
        self.state['avoidance_status'] = 'not_needed'
        if self.obstacle_enabled and self.obstacle:
            scenario = self._obstacle_scenario()
            blocked = not all(self._edge_clear(a, b) for a, b in zip(points, points[1:]))
            detour = None
            if blocked and begin == end == 'join' and scenario:
                detour = self._lap_detour(scenario, points)
            if detour is not None:
                points = detour
                self.state['route_name'] = 'join-to-join-detour'
                self.state['avoidance_status'] = 'detoured'
                self._event('obstacle_detour_connected')
            elif blocked:
                self.state['avoidance_status'] = 'no_route'
                self.state['stop_reason'] = 'obstacle_no_safe_route'
                self.state['phase'] = 'STOPPED'
                self.follower = None
                self._event('obstacle_safe_stop')
                return
        self.follower = PathFollower(points, self.config['control'])

    def _lap_detour(self, scenario, nominal):
        waypoints = scenario.get('lap_waypoints')
        if not waypoints:
            return None
        points = [(x * IN, y * IN, math.radians(h)) for x, y, h in waypoints]
        if dist(points[0], nominal[0]) > 1e-8 or dist(points[-1], nominal[1]) > 1e-8:
            return None
        if abs(wrap(points[-1][2] - nominal[1][2])) > 1e-8:
            return None
        points.extend(nominal[2:])
        simplified = [points[0]]
        for point in points[1:]:
            previous = simplified[-1]
            if dist(previous, point) <= 1e-8:
                simplified.append(point)
                continue
            if len(simplified) >= 2 and dist(simplified[-2], simplified[-1]) > 1e-8:
                before = simplified[-2]
                old_dx, old_dy = previous[0] - before[0], previous[1] - before[1]
                new_dx, new_dy = point[0] - previous[0], point[1] - previous[1]
                if (abs(old_dx * new_dy - old_dy * new_dx) < 1e-8 and
                        old_dx * new_dx + old_dy * new_dy > 0 and
                        abs(wrap(point[2] - previous[2])) < 1e-8):
                    simplified[-1] = point
                    continue
            simplified.append(point)
        points = simplified
        if not all(self._edge_clear(a, b) for a, b in zip(points, points[1:])):
            return None
        return points

    def _obstacle_scenario(self):
        scenarios = json.loads((ROOT / self.config['avoidance']['scenario_source']).read_text())['scenarios']
        for scenario in scenarios:
            center = scenario['center_in']
            if dist(self.obstacle, (center[0] * IN, center[1] * IN)) <= 1e-8:
                return scenario
        return None

    def _edge_clear(self, a, b):
        sampling = self.config['control']['route_sampling']
        return not any(self.contact(p) for p in sample_route(
            [a, b], sampling['translation_step_m'], sampling['rotation_step_rad']))

    def reset(self, seed=0, options=None):
        options = options or {}
        self.assigned_box = options.get('assigned_box', 1 + seed % 3)
        if self.assigned_box not in self.boxes:
            raise ValueError('assigned_box must be 1, 2 or 3')
        self.exchange_success = options.get('exchange_success', True)
        start_pose = options.get('start_pose', self.start)
        if len(start_pose) != 3 or not all(math.isfinite(x) for x in start_pose):
            raise ValueError('start_pose must contain three finite values')
        self.traction = options.get('traction', 1.0)
        if not 0 < self.traction <= 1:
            raise ValueError('traction must be in (0, 1]')
        self.noise = options.get('noise', False)
        self.obstacle_enabled = options.get('obstacle_enabled', False)
        self.obstacle = options.get('obstacle')
        if self.contact(start_pose):
            raise ValueError('start_pose collides with the field')
        self.rng = seed & 0xffffffff
        self.state = {'t': 0.0, 'x': start_pose[0], 'y': start_pose[1], 'yaw': start_pose[2],
                      'v': 0.0, 'yaw_rate': 0.0, 'phase': 'WAIT_START', 'phase_t': 0.0,
                      'laps': 0, 'entered': False, 'green_start': False, 'distance': 0.0,
                      'wall_contacts': [0, 0, 0], 'obstacle_contacts': [0, 0, 0],
                      'exchange_attempt': 0, 'exchange_result': None, 'tire_drop': 'none',
                      'tire_pickup': 'none', 'blue_retained': False, 'flag_up': False,
                      'finish_seconds': None, 'parked': False, 'parking_overlap': 0.0,
                      'stop_reason': None, 'collisions': 0, 'collision_log': [],
                      'reward_events': [], 'route_name': None, 'avoidance_status': 'not_needed'}
        self.follower = None
        return self.observation()

    def _random(self):
        self.rng = (self.rng * 1664525 + 1013904223) & 0xffffffff
        return self.rng / 4294967296

    def _event(self, name, value=0):
        self.state['reward_events'].append({'t': round(self.state['t'], 3), 'event': name, 'value': value})

    def _target(self):
        return self.follower.target if self.follower else (self.state['x'], self.state['y'], self.state['yaw'])

    def classical_action(self):
        if self.state['phase'] in ('WAIT_START', 'EXCHANGE', 'DONE', 'STOPPED'):
            return (0.0, 0.0)
        s = self.state
        return self.follower.action((s['x'], s['y'], s['yaw'], s['v'], s['yaw_rate']), self.config['dt_s'])

    def observation(self):
        s, c = self.state, self.config['control']
        tx, ty, _ = self._target()
        dx, dy = tx - s['x'], ty - s['y']
        noise = self.config['mission']['observation_noise_m'] if self.noise else 0
        nx, ny = ((self._random() - 0.5) * 2 * noise for _ in range(2))
        angle = wrap(math.atan2(dy, dx) - s['yaw'])
        obstacle_distance = dist((s['x'], s['y']), self.obstacle) if self.obstacle_enabled and self.obstacle else 1.5
        return [s['x'] + nx, s['y'] + ny, math.sin(s['yaw']), math.cos(s['yaw']),
                s['v'] / c['max_speed_m_s'], s['yaw_rate'] / c['max_yaw_rate_rad_s'],
                math.cos(angle), math.sin(angle), clamp(math.hypot(dx, dy) / 2.5, 0, 1),
                s['laps'] / 3, PHASES.index(s['phase']) / (len(PHASES) - 1), self.assigned_box / 3,
                s['exchange_attempt'] / self.config['mission']['exchange_attempts'],
                float(s['blue_retained']), float(s['flag_up']), s['t'] / 180,
                clamp(obstacle_distance / 1.5, 0, 1), self.traction]

    def contact(self, pose):
        length, width = self.config['control']['footprint_m']
        footprint = rectangle(*pose[:2], length, width, pose[2])
        inset = self.config['field']['wall_inset_m']
        bounds = self.layout['dimensions']
        hits = []
        if any(x <= inset or x >= bounds['board_length'] * IN - inset or
               y <= inset or y >= bounds['board_width'] * IN - inset for x, y in footprint):
            hits.append('board_or_wall')
        hits.extend(name for name, polygon in self.solids if intersects(footprint, polygon))
        if self.obstacle_enabled and self.obstacle:
            radius = self.config['field']['obstacle_radius_m']
            obstacle = [(self.obstacle[0] + radius * math.cos(i * math.tau / 32),
                         self.obstacle[1] + radius * math.sin(i * math.tau / 32)) for i in range(32)]
            if intersects(footprint, obstacle):
                hits.append('obstacle')
        return hits

    def _contact(self):
        s = self.state
        hits = self.contact((s['x'], s['y'], s['yaw']))
        if not hits:
            return False
        lap = min(s['laps'], 2)
        for hit in hits:
            s['collision_log'].append({'t': round(s['t'], 3), 'hit': hit, 'pose': [s['x'], s['y'], s['yaw']]})
            s['obstacle_contacts' if hit == 'obstacle' else 'wall_contacts'][lap] += 1
        s['collisions'] += 1
        s['x'], s['y'], s['yaw'] = s['previous_pose']
        s['v'] = s['yaw_rate'] = 0.0
        s['stop_reason'] = 'collision'
        s['phase'] = 'STOPPED'
        return True

    def _finish_route(self):
        s = self.state
        if s['phase'] == 'ENTER':
            s['entered'] = True
            self._event('entered_course', 25)
            self._set_route('LAP', 'join', 'join')
        elif s['phase'] == 'LAP':
            s['laps'] += 1
            self._event('lap_complete')
            if s['laps'] == self.config['mission']['pit_after_lap']:
                self._set_route('TO_PIT', 'join', 'pit')
            elif s['laps'] == 3:
                s['finish_seconds'] = s['t']
                self._set_route('PARK', 'join', 'park')
            else:
                self._set_route('LAP', 'join', 'join')
        elif s['phase'] == 'TO_PIT':
            s['exchange_attempt'] = 1
            s['phase'], s['phase_t'] = 'EXCHANGE', 0.0
        elif s['phase'] == 'EXIT_PIT':
            s['flag_up'] = True
            self._event('school_flag', 25)
            self._set_route('LAP', 'join', 'join', final_lap=True)
        elif s['phase'] == 'PARK':
            s['parking_overlap'] = overlap_fraction(rectangle(s['x'], s['y'], *self.config['control']['footprint_m'], s['yaw']), self.boxes[self.assigned_box])
            s['parked'] = s['parking_overlap'] > 0.75
            s['phase'] = 'DONE'
            if s['parked']:
                self._event('parked_assigned', 15)
            else:
                s['stop_reason'] = 'parking_overlap_not_over_75_percent'

    def _mission(self):
        s = self.state
        if s['phase'] == 'WAIT_START' and s['phase_t'] + 1e-9 >= self.config['mission']['flag_confirm_frames'] * self.config['dt_s']:
            s['green_start'] = True
            self._event('green_start', 10)
            self._set_route('ENTER', 'start', 'join')
        elif s['phase'] == 'EXCHANGE' and s['phase_t'] + 1e-9 >= self.config['mission']['exchange_duration_s']:
            if self.exchange_success:
                s.update(exchange_result='done', tire_drop='assigned', tire_pickup='assigned', blue_retained=True)
                self._event('tire_exchange', 65)
            else:
                s['exchange_result'] = 'bailed_out'
                self._event('exchange_bailout')
            self._set_route('EXIT_PIT', 'pit', 'join')
        elif self.follower and s['phase'] not in ('DONE', 'STOPPED'):
            if self.follower.settled + 1e-9 >= self.config['control']['settle_time_s']:
                if self.follower.advance():
                    self._finish_route()

    def step(self, action=None):
        s = self.state
        if s['phase'] in ('DONE', 'STOPPED'):
            return self.observation(), 0.0, True, self.info()
        action = self.classical_action() if action is None else action
        if len(action) != 2 or not all(math.isfinite(x) for x in action):
            raise ValueError('action must contain two finite values')
        c, dt = self.config['control'], self.config['dt_s']
        target_v = clamp(float(action[0]), -1, 1) * c['max_speed_m_s'] * self.traction
        target_w = clamp(float(action[1]), -1, 1) * c['max_yaw_rate_rad_s'] * self.traction
        s['v'] += clamp(target_v - s['v'], -c['max_acceleration_m_s2'] * dt, c['max_acceleration_m_s2'] * dt)
        s['yaw_rate'] += clamp(target_w - s['yaw_rate'], -c['max_yaw_acceleration_rad_s2'] * dt, c['max_yaw_acceleration_rad_s2'] * dt)
        s['previous_pose'] = (s['x'], s['y'], s['yaw'])
        next_yaw = wrap(s['yaw'] + s['yaw_rate'] * dt)
        dx, dy = s['v'] * math.cos((s['yaw'] + next_yaw) / 2) * dt, s['v'] * math.sin((s['yaw'] + next_yaw) / 2) * dt
        s['x'], s['y'], s['yaw'] = s['x'] + dx, s['y'] + dy, next_yaw
        s['distance'] += math.hypot(dx, dy)
        s['t'] += dt
        s['phase_t'] += dt
        collided = self._contact()
        if not collided:
            self._mission()
        if s['t'] + 1e-9 >= self.config['auto_stop_s'] and s['phase'] not in ('DONE', 'STOPPED'):
            s['stop_reason'], s['phase'] = 'auto_stop', 'STOPPED'
        reward = math.hypot(dx, dy) - 0.002 - (2 if collided else 0) + (5 if s['phase'] == 'DONE' else 0)
        return self.observation(), reward, s['phase'] in ('DONE', 'STOPPED'), self.info()

    def info(self):
        s = self.state
        score = ((25 if s['entered'] else 0) + (100 if s['finish_seconds'] is not None else 0)
                 + (30 if s['finish_seconds'] is not None and s['finish_seconds'] < 165 else 0)
                 + (10 if s['green_start'] else 0) + (15 if s['parked'] else 0)
                 + {'none': 0, 'assigned': 25, 'other': 12}[s['tire_drop']]
                 + ({'none': 0, 'assigned': 40, 'other': 20}[s['tire_pickup']] if s['blue_retained'] else 0)
                 + sum(n == 0 for n in s['wall_contacts']) * 15 + sum(n == 0 for n in s['obstacle_contacts']) * 25
                 + (25 if s['flag_up'] else 0))
        return {'phase': s['phase'], 'time_s': round(s['t'], 3), 'laps_completed': s['laps'],
                'assigned_box': self.assigned_box, 'entered': s['entered'], 'finish_seconds': s['finish_seconds'],
                'parked': s['parked'], 'parking_overlap': s['parking_overlap'], 'exchange_result': s['exchange_result'],
                'blue_retained': s['blue_retained'], 'collisions': s['collisions'], 'collision_log': s['collision_log'],
                'wall_contacts': s['wall_contacts'], 'obstacle_contacts': s['obstacle_contacts'],
                'score_like_total': score, 'score_status': 'synthetic event arithmetic, not referee adjudication',
                'pose': [s['x'], s['y'], s['yaw']], 'target': self._target(), 'stop_reason': s['stop_reason'],
                'route_name': s['route_name'], 'route_index': self.follower.index if self.follower else None,
                'avoidance_status': s['avoidance_status'], 'events': s['reward_events']}


class MissionEnv:
    """Gymnasium API when installed; otherwise the same API returns Python lists."""
    def __init__(self, seed=0, evaluation=False):
        self.sim = MissionSim()
        self.seed, self.evaluation, self.episode = seed, evaluation, 0
        try:
            from gymnasium import spaces
            import numpy as np
            self.action_space = spaces.Box(-1.0, 1.0, shape=(2,), dtype=np.float32)
            self.observation_space = spaces.Box(-np.inf, np.inf, shape=(18,), dtype=np.float32)
        except ImportError:
            self.action_space = self.observation_space = None

    def reset(self, *, seed=None, options=None):
        if seed is not None:
            self.seed = seed
        episode_seed = self.seed if self.evaluation else self.seed + self.episode
        self.episode += 1
        return self._array(self.sim.reset(episode_seed, options)), {'seed': episode_seed}

    def step(self, action):
        obs, reward, done, info = self.sim.step(action)
        return self._array(obs), reward, done, False, info

    def _array(self, obs):
        try:
            import numpy as np
            return np.asarray(obs, dtype=np.float32)
        except ImportError:
            return obs


def evaluate(seeds=range(100, 120), options=None):
    rows = []
    for seed in seeds:
        sim = MissionSim()
        sim.reset(seed, options)
        while True:
            _, _, done, info = sim.step()
            if done:
                rows.append({'seed': seed, **info})
                break
    return rows


if __name__ == '__main__':
    rows = evaluate()
    print(json.dumps({'episodes': len(rows), 'completed': sum(r['phase'] == 'DONE' for r in rows),
                      'clean_completed': sum(r['phase'] == 'DONE' and not r['collisions'] for r in rows),
                      'mean_score_like': sum(r['score_like_total'] for r in rows) / len(rows),
                      'total_collisions': sum(r['collisions'] for r in rows), 'results': rows}, indent=2))
