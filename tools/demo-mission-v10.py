"""Runs one simulated whole mission and writes a self-contained, offline replay page.

Agent-run demo for the owner's hobby/learning project. It reuses firmware/host_tests/full_mission.py, so the
mission is the same stack as derived/full-mission-v10/: supervisor, mission driver, packed routes, path tracker,
EKF and the firmware loop on the drivetrain model. Placeholder values throughout. Not a robot test.

Usage: python -I tools/demo-mission-v10.py [--layout SEED] [--box 1|2|3] [--lap NAME] [--seed N] [--out FILE]
With --layout, guide-size vehicles are placed as in the study. The simulated robot passes straight through them;
the page marks each overlap instead of hiding it.
"""
import argparse
import json
import pathlib
import random
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "software"), str(ROOT / "firmware"), str(ROOT / "firmware" / "pico2"), str(ROOT / "tools")]
import build_pico_bundle  # noqa: E402
import config  # noqa: E402
from host_tests import full_mission  # noqa: E402
from host_tests.route_follow import RECORD_EVERY  # noqa: E402
from stockcar import mission  # noqa: E402
from stockcar.field import Field  # noqa: E402
from stockcar.geometry import separation  # noqa: E402

TYPICAL = (11.1, 0.25, 4.0)  # supply volts, friction, mass in kg: the "typical" plant of the study
KEEP_EVERY = 5               # 10 Hz in the page


def keep_samples():
    """full_mission.run discards its trace after judging, so catch it on the way into judge()."""
    kept = {}
    judge = full_mission.judge

    def catch(field, barriers, driver, supervisor, samples, *rest):
        kept.update(samples=samples, events=supervisor.events)
        return judge(field, barriers, driver, supervisor, samples, *rest)

    full_mission.judge = catch
    return kept


def polygon(points):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in points)


def field_svg(field, vehicles, box):
    f = field.data["features"]
    x0, y0, x1, y1 = f["board"]["rect"]
    parts = [f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="#17191d"/>']

    def box_rect(rect, fill, stroke="none"):
        return f'<rect x="{rect[0]}" y="{rect[1]}" width="{rect[2] - rect[0]}" height="{rect[3] - rect[1]}" fill="{fill}" stroke="{stroke}" stroke-width="0.5"/>'

    ring = f["track_marking"]
    outer, inner = (" ".join(("M" if i == 0 else "L") + f"{x} {y}" for i, (x, y) in enumerate(ring[k])) + "Z" for k in ("outer_ring", "inner_ring"))
    parts.append(f'<path d="{outer} {inner}" fill="#e8e8e8" fill-rule="evenodd"/>')
    for number, rect in field.pit_boxes.items():
        parts.append(box_rect(rect, "#2c3a4d" if number == box else "#26292f", "#58a6ff" if number == box else "#e8e8e8"))
    parts.append(box_rect(field.start_box, "#26292f", "#e8e8e8"))
    parts += [f'<polygon points="{polygon(b)}" fill="#8b929c"/>' for b in field.barriers()]
    parts += [f'<polygon points="{polygon(v)}" fill="#e08a2e" fill-opacity="0.85"/>' for v in vehicles]
    return "".join(parts)


PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Simulated mission replay</title><style>
body{margin:0;background:#0e1013;color:#e6e8eb;font:15px/1.4 'Segoe UI',Arial,'Liberation Sans',sans-serif}
main{max-width:1180px;margin:0 auto;padding:16px 20px;display:grid;grid-template-columns:1fr 280px;gap:16px}
h1{grid-column:1/3;font-size:20px;margin:0}
svg{width:100%;display:block;border-radius:6px}
#hud{display:flex;gap:18px;align-items:center;margin-top:10px;flex-wrap:wrap}
#clock{font:600 24px ui-monospace,Consolas,monospace;min-width:92px}
input[type=range]{flex:1;min-width:160px}
button,select{background:#232830;color:inherit;border:1px solid #3a414c;border-radius:4px;padding:5px 12px;font:inherit}
ol{list-style:none;margin:0;padding:0;font-size:13px}
li{padding:3px 6px;border-left:3px solid #2a2f37;color:#79818c}
li.past{color:#e6e8eb;border-color:#58a6ff}
#result{font-size:13px;margin:10px 0 0}
#note{grid-column:1/3;font-size:13px;color:#b9bec6;border-top:1px solid #2a2f37;padding-top:10px}
#touch{color:#e08a2e;font-weight:600;visibility:hidden}
</style></head><body><main>
<h1>Simulated whole mission: top-down replay</h1>
<div><svg viewBox="0 0 96 48" role="img" aria-label="Field with the simulated robot"><g transform="translate(0 48) scale(1 -1)">__FIELD__
<polyline id="trail" fill="none" stroke="#58a6ff" stroke-width="0.35" stroke-opacity="0.75"/>
<g id="robot"><rect x="-5" y="-5" width="10" height="10" rx="0.4" fill="#2f81f7" fill-opacity="0.8" stroke="#fff" stroke-width="0.25"/><path d="M0 0L5 0" stroke="#fff" stroke-width="0.5"/></g></g></svg>
<div id="hud"><span id="clock">0.0 s</span><button id="play">Pause</button>
<label>Speed <select id="rate"><option value="1">1x</option><option value="2" selected>2x</option><option value="4">4x</option></select></label>
<input id="seek" type="range" min="0" value="0" aria-label="Replay position"><span id="touch">touching a vehicle</span></div></div>
<aside><ol id="events"></ol><p id="result"></p></aside>
<p id="note">Agent-run simulation with placeholder values, on the organizer's June 2026 CAD field. Nothing here ran on a robot. The simulated robot passes straight through vehicles, which neither resist nor move, so a real robot could push, deflect or jam. The camera, start flag and lap line are not modeled. Times count from the simulated green flag, so the wait before it is negative.</p>
</main><script>
const D=__DATA__;
const $=id=>document.getElementById(id),last=D.t.length-1;
let i=0,playing=true,prev=null,pos=0;
$('seek').max=last;$('result').textContent=D.result;
D.events.forEach(e=>{const li=document.createElement('li');li.textContent=(e[0]-D.start).toFixed(1)+' s  '+e[1];$('events').append(li)});
const rows=[...$('events').children];
function show(){
 const p=D.p[i];
 $('robot').setAttribute('transform',`translate(${p[0]} ${p[1]}) rotate(${p[2]})`);
 $('trail').setAttribute('points',D.p.slice(0,i+1).map(q=>q[0]+','+q[1]).join(' '));
 $('clock').textContent=(D.t[i]-D.start).toFixed(1)+' s';
 $('seek').value=i;$('touch').style.visibility=D.touch[i]?'visible':'hidden';
 rows.forEach((r,k)=>r.classList.toggle('past',i===last||D.events[k][0]<=D.t[i]));
}
function tick(now){
 if(playing&&prev!==null){pos+=(now-prev)/1000*$('rate').value/D.dt;i=Math.min(last,Math.floor(pos));show();if(i===last){playing=false;$('play').textContent='Replay'}}
 prev=now;requestAnimationFrame(tick);
}
$('play').onclick=()=>{if(i===last){i=0;pos=0}playing=!playing;$('play').textContent=playing?'Pause':'Play'};
$('seek').oninput=e=>{i=+e.target.value;pos=i;show();$('play').textContent=playing?'Pause':i===last?'Replay':'Play'};
show();requestAnimationFrame(tick);
</script></body></html>
"""


def page(field, kept, result, vehicles, box):
    trace = kept["samples"][::KEEP_EVERY]
    period = RECORD_EVERY * KEEP_EVERY / config.CONTROL_HZ
    events = [(float(when), text) for when, text in kept["events"]]
    start = next((when for when, text in events if text == "green flag confirmed"), 0.0)
    touch = [int(any(separation(full_mission.footprint(x, y, h), v) < 0 for v in vehicles)) for x, y, h, _ in trace]
    parked = f"parked in box {box}" if result["parked"] else "not parked"
    summary = f"{result['laps']} laps, finish {result['finish_s']} s, exchange {result['exchange']}, {parked}. {result['vehicle_contact_laps']} of 3 laps touched a vehicle. Score-like total {result['score_like']} of 390."
    data = {"t": [round(k * period, 2) for k in range(len(trace))], "p": [[round(x, 2), round(y, 2), round(h * 57.29578, 1)] for x, y, h, _ in trace], "touch": touch,
            "events": events, "start": start, "dt": period, "result": summary}
    return PAGE.replace("__FIELD__", field_svg(field, vehicles, box)).replace("__DATA__", json.dumps(data, separators=(",", ":")).replace("</", "<\\/"))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--layout", type=int, help="seed of a vehicle layout; omit for an empty field")
    parser.add_argument("--box", type=int, choices=(1, 2, 3), help="assigned box (default: the layout's, or 1)")
    parser.add_argument("--lap", default="lanes", help="route file for the lap (default: lanes)")
    parser.add_argument("--seed", type=int, help="sensor noise seed (default: the layout seed, as in the study, or 100)")
    parser.add_argument("--out", type=pathlib.Path, default=pathlib.Path(tempfile.gettempdir()) / "mission-replay.html")
    args = parser.parse_args()
    field = Field()
    envelope = json.loads((ROOT / "derived" / "envelope-v10" / "report.json").read_text(encoding="utf-8"))["planning_envelopes"]["conservative"]
    vehicles, box, works, seed = (), args.box or 1, True, 100
    if args.layout is not None:
        layout = mission.random_layout(random.Random(args.layout), field)
        vehicles, works, box, seed = layout.polys, layout.exchange_success, args.box or layout.assigned_box, args.layout
    seed = seed if args.seed is None else args.seed
    kept = keep_samples()
    with tempfile.TemporaryDirectory() as folder:
        build_pico_bundle.write_routes(folder)
        result = full_mission.run(folder, args.lap, box, TYPICAL, envelope, seed, vehicles=vehicles, exchange_works=works)
    start = next((float(when) for when, text in kept["events"] if text == "green flag confirmed"), 0.0)
    for when, text in kept["events"]:
        print(f"{float(when) - start:7.2f} s  {text}")
    print(f"\n{result['state']}: {result['laps']} laps, finish {result['finish_s']} s, exchange {result['exchange']}, parked {result['parked']} ({result['parked_share']:.0%} in box {box})")
    print(f"least clearance {result['least_clearance_in']} in, worst pose error {result['max_position_error_in']} in, laps touching a vehicle {result['vehicle_contact_laps']}, score-like {result['score_like']} of 390")
    args.out.write_text(page(field, kept, result, vehicles, box), encoding="utf-8")
    print(f"\nreplay: {args.out}\nSimulated with placeholder values. Not a robot test.")


if __name__ == "__main__":
    main()
