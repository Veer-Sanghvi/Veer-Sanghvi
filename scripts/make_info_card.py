#!/usr/bin/env python3
"""Generate info-card.svg: a neofetch-style terminal panel with a subtle
animated 3D feel. CSS animations only (no JS, no external resources) so it
renders through GitHub's camo <img> proxy. Motion: a depth-offset back plate
and the front panel slide in at different speeds (parallax), rows fade and
slide in staggered, a lime scan line sweeps once, and an isometric wireframe
cube draws itself in and then floats slowly. Everything settles by ~3 s.
prefers-reduced-motion disables all of it. Set STATIC=1 to render the frozen
end frame for quick previewing."""

import math
import os
from pathlib import Path

OUT_PATH = Path(__file__).resolve().parent.parent / "info-card.svg"
STATIC = os.environ.get("STATIC") == "1"

BG = "#0B0B0C"
SURFACE = "#141415"
BORDER = "#2A2A2D"
LABEL = "#C6F432"
VALUE = "#FFFFFF"
MUTED = "#A3A3A6"

VALUE_X = 175
LINE_H = 26
TOP_PAD = 66
CHAR_W = 10.0  # generous monospace advance width at 16px, covers wide fallback fonts
CUBE_COL = 120  # right-hand column reserved for the wireframe cube
DEPTH = 6  # back plate offset, gives the layered-panel depth

# label, value -- kept in sync with PROFILE.md / CLAUDE.md identity, no
# employer named for the patent line per the NDA constraint, X-FLEX stays
# "remote-controlled" (never "autonomous").
ROWS = [
    ("user", "veer@wentworth"),
    ("role", "ME Senior, Wentworth Institute of Technology"),
    ("now", "Manufacturing & Operations Co-op @ Moveras (Aug-Dec 2026)"),
    ("next", "Plumbing & Fire Protection Co-op @ Buro Happold (Jan 2027)"),
    ("stack", "SolidWorks · Fusion 360 · MATLAB/Simscape · Python · Arduino · PLC"),
    ("patent", "Fire suppression, heat-based leak detection (filed)"),
    ("built", "X-FLEX remote-controlled scissor lift for uneven terrain"),
    ("links", "veer-sanghvi.github.io · linkedin.com/in/veer-sanghvi"),
]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def iso(px, py, pz, a):
    """Project a unit-cube corner to 2D isometric coords, edge length a."""
    x = (px - py) * math.cos(math.radians(30)) * a
    y = (px + py) * math.sin(math.radians(30)) * a - pz * a
    return f"{x:.2f} {y:.2f}"


def cube_svg(cx, cy, a):
    # 12 edges of the cube, drawn as one path so a single dash animation draws them in.
    verts = {(x, y, z): iso(x, y, z, a) for x in (0, 1) for y in (0, 1) for z in (0, 1)}
    edges = []
    for v in verts:
        for i in range(3):
            if v[i] == 0:
                w = list(v)
                w[i] = 1
                edges.append(f"M{verts[v]}L{verts[tuple(w)]}")
    top = " ".join(verts[v] for v in [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)])
    return (
        f'<g transform="translate({cx} {cy})">'
        f'<g class="cube">'
        f'<polygon points="{top}" fill="{LABEL}" fill-opacity="0.10" class="face"/>'
        f'<path d="{"".join(edges)}" fill="none" stroke="{MUTED}" stroke-opacity="0.6" '
        f'stroke-width="1.2" stroke-linecap="round" pathLength="100" class="wire"/>'
        f'<circle cx="{verts[(1, 1, 1)].split()[0]}" cy="{verts[(1, 1, 1)].split()[1]}" '
        f'r="2.5" fill="{LABEL}" class="vertex"/>'
        f'</g></g>'
    )


def render():
    panel_h = TOP_PAD + len(ROWS) * LINE_H + 20
    longest_value = max(len(v) for _, v in ROWS)
    panel_w = int(VALUE_X + longest_value * CHAR_W + 36) + CUBE_COL
    width, height = panel_w + DEPTH, panel_h + DEPTH

    rows = []
    for i, (label, value) in enumerate(ROWS):
        y = TOP_PAD + i * LINE_H
        delay = 0.45 + i * 0.12
        rows.append(
            f'<g class="row" style="animation-delay:{delay:.2f}s">'
            f'<text x="24" y="{y}" class="label">{esc(label)}</text>'
            f'<text x="{VALUE_X}" y="{y}" class="value">{esc(value)}</text>'
            f'</g>'
        )

    # Static mode and reduced motion share the same end-state rules.
    settled = (
        "*{animation:none!important}"
        ".plate,.panel,.row,.cube,.face,.vertex{opacity:1;transform:none}"
        ".wire{stroke-dashoffset:0}.scan{display:none}"
    )
    freeze = settled if STATIC else ""

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" font-family="'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace">
  <style>
    .label {{ fill: {LABEL}; font-size: 16px; font-weight: 600; }}
    .value {{ fill: {VALUE}; font-size: 16px; }}
    .title {{ fill: {MUTED}; font-size: 13px; }}
    .dot {{ opacity: 0.9; }}
    .plate {{ opacity: 0; transform: translateX(-18px); animation: slide 0.9s cubic-bezier(.2,.7,.2,1) 0s forwards; }}
    .panel {{ opacity: 0; transform: translateX(-8px); animation: slide 0.7s cubic-bezier(.2,.7,.2,1) 0.1s forwards; }}
    .row {{ opacity: 0; transform: translateX(-8px); animation: slide 0.35s ease-out forwards; }}
    .scan {{ opacity: 0; animation: scan 1.6s ease-in-out 0.5s forwards; }}
    .cube {{ animation: float 6s ease-in-out 2.6s infinite; }}
    .wire {{ stroke-dasharray: 100; stroke-dashoffset: 100; animation: draw 1.4s ease-out 0.6s forwards; }}
    .face, .vertex {{ opacity: 0; animation: fade 0.6s ease-out 1.9s forwards; }}
    @keyframes slide {{ to {{ opacity: 1; transform: translateX(0); }} }}
    @keyframes fade {{ to {{ opacity: 1; }} }}
    @keyframes draw {{ to {{ stroke-dashoffset: 0; }} }}
    @keyframes float {{ 50% {{ transform: translateY(-3px); }} }}
    @keyframes scan {{ 10% {{ opacity: 0.45; }} 90% {{ opacity: 0.45; }} to {{ opacity: 0; transform: translateY({panel_h - 34}px); }} }}
    @media (prefers-reduced-motion: reduce) {{ {settled} }}
    {freeze}
  </style>
  <defs>
    <clipPath id="body"><rect x="0.5" y="30.5" width="{panel_w - 1}" height="{panel_h - 31}" rx="10"/></clipPath>
    <linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="{LABEL}" stop-opacity="0"/><stop offset="0.5" stop-color="{LABEL}"/><stop offset="1" stop-color="{LABEL}" stop-opacity="0"/></linearGradient>
  </defs>
  <rect class="plate" x="{DEPTH + 0.5}" y="{DEPTH + 0.5}" width="{panel_w - 1}" height="{panel_h - 1}" rx="10" ry="10" fill="{SURFACE}" stroke="{BORDER}"/>
  <g class="panel">
    <rect x="0.5" y="0.5" width="{panel_w - 1}" height="{panel_h - 1}" rx="10" ry="10" fill="{BG}" stroke="{BORDER}"/>
    <rect x="0.5" y="0.5" width="{panel_w - 1}" height="30" rx="10" ry="10" fill="{SURFACE}"/>
    <rect x="0.5" y="20.5" width="{panel_w - 1}" height="10" fill="{SURFACE}"/>
    <circle class="dot" cx="20" cy="16" r="5" fill="#ff5f56"/>
    <circle class="dot" cx="38" cy="16" r="5" fill="#ffbd2e"/>
    <circle class="dot" cx="56" cy="16" r="5" fill="#27c93f"/>
    <text x="{panel_w / 2}" y="20" text-anchor="middle" class="title">veer@github: ~</text>
    <g clip-path="url(#body)"><rect class="scan" x="0.5" y="32" width="{panel_w - 1}" height="2" fill="url(#beam)"/></g>
    {cube_svg(panel_w - CUBE_COL / 2, 30 + (panel_h - 30) / 2 + 4, 34)}
    {''.join(rows)}
  </g>
</svg>
"""
    return svg


def main():
    OUT_PATH.write_text(render())
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    import xml.etree.ElementTree as ET

    ET.fromstring(render())  # parse check before writing
    main()
