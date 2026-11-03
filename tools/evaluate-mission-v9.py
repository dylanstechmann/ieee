#!/usr/bin/env python3
"""Write reproducible synthetic baseline evidence; never train or claim a policy."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'software'))
from mission_v9 import MissionSim, evaluate


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def main():
    nominal = evaluate(range(100, 120), {'noise': False, 'obstacle_enabled': False})
    obstacle_cases = [
        ('entry-blocker', (36 * 0.0254, 36 * 0.0254)),
        ('upper-lane-blocker', (60 * 0.0254, 36 * 0.0254)),
        ('off-route-control', (60 * 0.0254, 45 * 0.0254)),
    ]
    obstacle = []
    for case_id, center in obstacle_cases:
        for row in evaluate(range(100, 103), {'noise': False, 'obstacle_enabled': True, 'obstacle': center}):
            obstacle.append({'case_id': case_id, **row})
    trace = []
    sim = MissionSim()
    sim.reset(100, {'assigned_box': 1, 'noise': False, 'obstacle_enabled': False})
    while True:
        _, _, done, info = sim.step()
        trace.append({'t': round(info['time_s'], 3), 'phase': info['phase'],
                      'route': info['route_name'], 'route_index': info['route_index'],
                      'pose_m_rad': info['pose'], 'laps': info['laps_completed'],
                      'collisions': info['collisions']})
        if done:
            break
    out = ROOT / 'derived/mission-v9'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'trace-box-1.json').write_text(json.dumps(trace, indent=2) + '\n')
    report = {
        'status': 'synthetic-classical-baseline-not-legal-route-or-hardware-validation',
        'controller': 'forward/reverse/spin path follower with shortened conditional pit/parking routes; blocked obstacle routes stop safely',
        'training': {'trained_policy': False, 'training_episodes': 0,
                     'reason': 'Obstacle handling, official Q&A and realistic sensing must be resolved before RL comparison.',
                     'interface': 'MissionEnv reset/step; 18 observations and two normalized actions',
                     'optional_dependencies_installed': False},
        'seed_partition': {'nominal_evaluation': list(range(100, 120)),
                           'future_training': '0..99 reserved; no training performed',
                           'obstacle_probe': [100, 101, 102]},
        'summary': {
            'episodes': len(nominal),
            'completed_and_parked': sum(r['phase'] == 'DONE' and r['parked'] for r in nominal),
            'three_laps': sum(r['laps_completed'] == 3 for r in nominal),
            'clean_three_laps': sum(r['laps_completed'] == 3 and r['collisions'] == 0 for r in nominal),
            'exchange_success': sum(r['exchange_result'] == 'done' for r in nominal),
            'auto_stop': sum(r['stop_reason'] == 'auto_stop' for r in nominal),
            'collisions': sum(r['collisions'] for r in nominal),
            'obstacle_probe_episodes': len(obstacle),
            'obstacle_probe_collisions': sum(r['collisions'] for r in obstacle),
            'obstacle_safe_stops': sum(r['stop_reason'] == 'obstacle_no_safe_route' and not r['collisions'] for r in obstacle),
            'obstacle_detours_completed': sum(r['avoidance_status'] == 'detoured' and r['parked'] for r in obstacle),
            'finish_before_165_s': sum(r['finish_seconds'] is not None and r['finish_seconds'] < 165 for r in nominal),
        },
        'nominal_results': [{k: v for k, v in r.items() if k not in ('events', 'collision_log')} for r in nominal],
        'obstacle_probe_results': [{k: v for k, v in r.items() if k not in ('events', 'collision_log')} for r in obstacle],
        'limitations': [
            'Synthetic kinematics and ideal route knowledge; no calibrated motor, traction, sensor or mechanism model.',
            'Pit access, lap counting, finish-line timing and parking interpretation require official Q&A.',
            'A timed exchange event is not tire acquisition, retention or physical mechanism validation.',
            'Shortened pit and parking routes are conditional on official access and lap interpretations; no legal route is claimed.',
            'Blocked entry and upper-lane probes stop safely without avoidance; an offline upper-lane detour is not connected or qualified.',
            'The off-route control completes without a detour; this is not coverage of real obstacle placements or sensing.',
            'No PPO training, held-out trained-policy evaluation or real-robot transfer has occurred.',
        ],
        'input_hashes': {f: digest(f) for f in ['mission-v9.json', 'robot-baseline-v9.json',
                         'software/mission_v9.py', 'derived/differential-drive-v3/report.json',
                         'derived/constrained-field-v3/layout.json', 'derived/mission-v9/avoidance-scenarios.json',
                         'tools/plan-mission-v9-avoidance.js']},
    }
    (out / 'evaluation.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report['summary'], indent=2))


if __name__ == '__main__':
    main()
