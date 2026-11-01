#!/usr/bin/env python3
"""Cross-section of one straightaway showing why a top-mounted 2D LiDAR misses the
field barriers. Run from /workspace/ieee/ieee:

  uv run --no-project --python 3.12 --with matplotlib python -I tools/sensor-plane-figure-v7.py

Heights are ASSUMPTIONS: nominal 1x4 / 1x2 lumber standing on edge (actual 3.5 in and
1.5 in), as the organizer build photos suggest. The toy-car height is not published.
Agent-drawn planning figure, not a measurement.
"""
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'derived/team-brief-v7'

SURFACE, INK, INK2, MUTED = '#fcfcfb', '#0b0b0b', '#52514e', '#8a8984'
WALL_GRAY, FLOOR = '#a9a8a2', '#2b2b2a'
LOW, TOP = '#2a78d6', '#eb6834'  # categorical slots 1 and 2 (reference palette)

WALL_H, DIVIDER_H = 3.5, 1.5        # assumed: 1x4 and 1x2 on edge
LINE_X, LINE_W = 10.98, 1.0         # white center line (drawing-derived position, assumed width)
DIVIDER_X = 23.625                  # inner face of a 0.75-in divider centred at 24 in
LOW_PLANE, TOP_PLANE = 1.0, 6.0     # example sensor heights


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({'font.size': 9, 'axes.edgecolor': MUTED, 'text.color': INK})
    fig, ax = plt.subplots(figsize=(8.6, 3.6), dpi=200)
    fig.patch.set_facecolor(SURFACE)
    ax.set_facecolor(SURFACE)

    ax.add_patch(Rectangle((-1.2, -0.6), 26.6, 0.6, color=FLOOR, lw=0))
    ax.add_patch(Rectangle((LINE_X - LINE_W / 2, -0.6), LINE_W, 0.6, color='#ffffff', lw=0))
    ax.add_patch(Rectangle((-0.75, 0), 0.75, WALL_H, facecolor=WALL_GRAY, edgecolor=INK2, lw=0.8))
    ax.add_patch(Rectangle((DIVIDER_X, 0), 0.75, DIVIDER_H, facecolor=WALL_GRAY, edgecolor=INK2, lw=0.8))
    ax.add_patch(Rectangle((14.0, 0), 4.0, 3.0, facecolor='none', edgecolor=INK2, lw=0.9, ls=(0, (3, 2))))
    ax.text(16.0, 2.1, 'toy car\n(height not\npublished)', ha='center', va='center', color=INK2, fontsize=7.5)

    ax.add_patch(Rectangle((0.5, 0.35), 10.0, 2.65, facecolor='#ecebe7', edgecolor=INK2, lw=0.9))
    ax.text(5.5, 1.75, 'robot body: at least 10 in wide\nfor the bottom 3 in (GM1 R01)', ha='center',
            va='center', color=INK, fontsize=7.5)
    ax.add_patch(Rectangle((4.9, 3.0), 1.2, 2.4, facecolor='#d9d8d3', edgecolor=INK2, lw=0.8))
    ax.add_patch(Rectangle((4.4, 5.4), 2.2, 1.0, facecolor='#d9d8d3', edgecolor=INK2, lw=0.8))
    ax.text(6.8, 6.55, 'LiDAR on top', color=INK2, fontsize=7.5, va='bottom')
    ax.add_patch(Rectangle((10.5, LOW_PLANE - 0.2), 0.35, 0.4, facecolor='#d9d8d3', edgecolor=INK2, lw=0.8))

    ax.plot([5.5, 25.2], [TOP_PLANE, TOP_PLANE], color=TOP, lw=2, solid_capstyle='round', label='top-mounted 2D LiDAR scan plane (6 in)')
    ax.plot([10.85, 14.0], [LOW_PLANE, LOW_PLANE], color=LOW, lw=2, solid_capstyle='round', label='low side sensor (1 in): ToF, IR or a low LiDAR')
    ax.plot([18.0, DIVIDER_X], [LOW_PLANE, LOW_PLANE], color=LOW, lw=1.4, ls=(0, (2, 2)))
    ax.plot([14.0, DIVIDER_X], [LOW_PLANE, LOW_PLANE], ls='none', marker='o', ms=5, color=LOW)
    ax.text(17.0, TOP_PLANE + 0.2, 'passes over the wall and divider (and maybe the cars)', color=INK, fontsize=7.5, ha='center', va='bottom')
    ax.text(20.8, LOW_PLANE + 0.2, 'sees the car, or the\ndivider if no car is there', color=INK, fontsize=7.5, ha='center', va='bottom')

    ax.annotate('', xy=(-1.0, WALL_H), xytext=(-1.0, 0), arrowprops={'arrowstyle': '<->', 'color': INK2, 'lw': 0.8})
    ax.text(-1.15, WALL_H / 2, 'gray side wall\n1x4 on edge\n~3.5 in', ha='right', va='center', color=INK2, fontsize=7.5)
    ax.annotate('', xy=(24.75, DIVIDER_H), xytext=(24.75, 0), arrowprops={'arrowstyle': '<->', 'color': INK2, 'lw': 0.8})
    ax.text(24.9, DIVIDER_H / 2, 'gray center\ndivider 1x2\n~1.5 in', ha='left', va='center', color=INK2, fontsize=7.5)
    ax.text(LINE_X, -0.95, 'white center line\n(splits outer / inner lane)', ha='center', va='top', color=INK2, fontsize=7.5)
    ax.text(5.5, -0.95, 'outer lane', ha='center', va='top', color=INK2, fontsize=7.5)
    ax.text(17.5, -0.95, 'inner lane', ha='center', va='top', color=INK2, fontsize=7.5)

    ax.set_xlim(-5.2, 29.0)
    ax.set_ylim(-2.4, 9.0)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.legend(loc='upper right', frameon=False, fontsize=7.5, labelcolor=INK)
    ax.set_title('Cross-section of a straightaway (inches). Heights assume nominal lumber on edge; measure a built field.',
                 fontsize=8.5, color=INK, loc='left')
    fig.tight_layout()
    for ext in ('png', 'svg'):
        fig.savefig(OUT / f'sensor-planes.{ext}', facecolor=SURFACE)
    print(f'wrote {OUT}/sensor-planes.png and .svg')


if __name__ == '__main__':
    main()
