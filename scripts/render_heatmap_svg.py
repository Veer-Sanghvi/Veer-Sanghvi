#!/usr/bin/env python3
"""Render data/contributions.json into a self-contained animated SVG.
No JS: cells slide in diagonally via CSS keyframes, staggered by
(week + day) index so the wave sweeps top-left to bottom-right, then
holds at full opacity. GitHub strips <script> and inline event handlers
from README SVGs but keeps <style> keyframes, so this stays purely CSS."""

import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "contributions.json"
OUT_PATH = Path(__file__).resolve().parent.parent / "contrib-heatmap.svg"

# GitHub's own dark-theme contribution palette, index 0..4 (level 0 = no contributions).
LEVEL_COLORS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]
BG = "#0d1117"
FG = "#c9d1d9"
MUTED = "#8b949e"
CELL = 11
GAP = 3
STEP = CELL + GAP
LEFT_PAD = 30
TOP_PAD = 34
WIDTH = 860


def build_weeks(days):
    """Group flat day list into GitHub-style weeks (columns), Sun-Sat rows."""
    if not days:
        return []
    weeks = []
    week = [None] * 7
    from datetime import date as _date

    for d in days:
        dt = _date.fromisoformat(d["date"])
        dow = (dt.weekday() + 1) % 7  # convert Mon=0..Sun=6 -> Sun=0..Sat=6
        if dow == 0 and any(week):
            weeks.append(week)
            week = [None] * 7
        week[dow] = d
    if any(week):
        weeks.append(week)
    return weeks[-53:]


def month_labels(weeks):
    labels = []
    last_month = None
    for i, week in enumerate(weeks):
        first = next((d for d in week if d), None)
        if not first:
            continue
        month = first["date"][:7]
        if month != last_month:
            labels.append((i, first["date"][5:7]))
            last_month = month
    return labels


MONTH_NAMES = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
}


def render(payload):
    days = payload["days"]
    weeks = build_weeks(days)
    stats = payload["stats"]

    height = TOP_PAD + 7 * STEP + 54

    cells_svg = []
    delays = []
    idx = 0
    for wi, week in enumerate(weeks):
        for di, d in enumerate(week):
            if d is None:
                continue
            x = LEFT_PAD + wi * STEP
            y = TOP_PAD + di * STEP
            level = min(int(d.get("level", 0)), 4)
            color = LEVEL_COLORS[level]
            delay = (wi + di) * 0.006
            cls = f"cell d{idx % 40}"
            cells_svg.append(
                f'<rect class="{cls}" x="{x}" y="{y}" width="{CELL}" height="{CELL}" '
                f'rx="2.5" ry="2.5" fill="{color}"><title>{d["date"]}: {d["count"]} contributions</title></rect>'
            )
            delays.append((idx % 40, delay))
            idx += 1

    delay_rules = "\n".join(
        f".d{i} {{ animation-delay: {delay:.3f}s; }}"
        for i, delay in sorted(set(delays))
    )

    labels = month_labels(weeks)
    month_svg = "\n".join(
        f'<text x="{LEFT_PAD + wi * STEP}" y="{TOP_PAD - 10}" class="month">{MONTH_NAMES.get(m, m)}</text>'
        for wi, m in labels
    )

    legend_x = LEFT_PAD
    legend_y = height - 34
    legend_swatches = "\n".join(
        f'<rect x="{legend_x + 62 + i * (CELL + 4)}" y="{legend_y}" width="{CELL}" height="{CELL}" '
        f'rx="2.5" ry="2.5" fill="{c}"/>'
        for i, c in enumerate(LEVEL_COLORS)
    )

    stats_line = (
        f'total {payload["total_contributions"]} &#183; '
        f'current streak {stats["current_streak"]}d &#183; '
        f'longest streak {stats["longest_streak"]}d'
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height}" viewBox="0 0 {WIDTH} {height}" font-family="'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace">
  <style>
    .bg {{ fill: {BG}; }}
    .month {{ fill: {MUTED}; font-size: 11px; }}
    .legend-label {{ fill: {MUTED}; font-size: 11px; }}
    .stats {{ fill: {FG}; font-size: 12px; }}
    .cell {{ opacity: 0; transform-box: fill-box; transform-origin: center; animation: slideIn 0.5s ease-out forwards; }}
    @keyframes slideIn {{
      0% {{ opacity: 0; transform: translate(-6px, -6px) scale(0.4); }}
      100% {{ opacity: 1; transform: translate(0, 0) scale(1); }}
    }}
    {delay_rules}
  </style>
  <rect class="bg" x="0" y="0" width="{WIDTH}" height="{height}" rx="8" ry="8"/>
  <text x="{LEFT_PAD}" y="20" class="stats">{payload["username"]}'s contributions</text>
  {month_svg}
  {''.join(cells_svg)}
  <text x="{legend_x}" y="{legend_y + 9}" class="legend-label">less</text>
  {legend_swatches}
  <text x="{legend_x + 62 + len(LEVEL_COLORS) * (CELL + 4) + 6}" y="{legend_y + 9}" class="legend-label">more</text>
  <text x="{WIDTH - LEFT_PAD}" y="{legend_y + 9}" text-anchor="end" class="stats">{stats_line}</text>
</svg>
"""
    return svg


def main():
    payload = json.loads(DATA_PATH.read_text())
    svg = render(payload)
    OUT_PATH.write_text(svg)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
