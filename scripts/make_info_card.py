#!/usr/bin/env python3
"""Generate info-card.svg: a neofetch-style terminal panel with staggered
fade/slide-in lines (SMIL animate, no JS). Set STATIC=1 to render a frozen
frame (all lines already visible) for quick previewing."""

import os
from pathlib import Path

OUT_PATH = Path(__file__).resolve().parent.parent / "info-card.svg"
STATIC = os.environ.get("STATIC") == "1"

BG = "#0d1117"
BORDER = "#30363d"
TITLE_BG = "#161b22"
LABEL = "#39d353"
VALUE = "#c9d1d9"
MUTED = "#8b949e"

VALUE_X = 150
LINE_H = 20
TOP_PAD = 54
CHAR_W = 7.9  # approx monospace advance width at 13px

# label, value -- kept in sync with PROFILE.md / CLAUDE.md identity, no
# employer named for the patent line per the NDA constraint, X-FLEX stays
# "remote-controlled" (never "autonomous").
ROWS = [
    ("user", "veer@wentworth"),
    ("role", "ME Senior, Wentworth Institute of Technology"),
    ("now", "Manufacturing & Operations Co-op @ Moveras (Aug-Dec 2026)"),
    ("seeking", "Spring 2027 ME Co-op (CPT)"),
    ("stack", "SolidWorks - MATLAB/Simscape - Python - Arduino - PLC"),
    ("patent", "Fire suppression, heat-based leak detection (filed)"),
    ("built", "X-FLEX remote-controlled terrain-adaptive scissor lift"),
    ("links", "veer-sanghvi.github.io - linkedin.com/in/veer-sanghvi"),
]


def esc(s):
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def render():
    height = TOP_PAD + len(ROWS) * LINE_H + 20
    longest_value = max(len(v) for _, v in ROWS)
    width = int(VALUE_X + longest_value * CHAR_W + 24)

    lines = []
    for i, (label, value) in enumerate(ROWS):
        y = TOP_PAD + i * LINE_H
        delay = 0.15 + i * 0.12
        if STATIC:
            group_attrs = 'opacity="1"'
            anim = ""
        else:
            group_attrs = 'opacity="0"'
            anim = (
                f'<animate attributeName="opacity" from="0" to="1" '
                f'begin="{delay:.2f}s" dur="0.35s" fill="freeze"/>'
                f'<animateTransform attributeName="transform" type="translate" '
                f'from="-8 0" to="0 0" begin="{delay:.2f}s" dur="0.35s" fill="freeze"/>'
            )
        lines.append(
            f'<g {group_attrs} transform="translate(-8 0)">'
            f'{anim}'
            f'<text x="24" y="{y}" class="label">{esc(label)}</text>'
            f'<text x="{VALUE_X}" y="{y}" class="value">{esc(value)}</text>'
            f'</g>'
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" font-family="'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace">
  <style>
    .label {{ fill: {LABEL}; font-size: 13px; font-weight: 600; }}
    .value {{ fill: {VALUE}; font-size: 13px; }}
    .title {{ fill: {MUTED}; font-size: 12px; }}
    .dot {{ opacity: 0.9; }}
  </style>
  <rect x="0.5" y="0.5" width="{width - 1}" height="{height - 1}" rx="10" ry="10" fill="{BG}" stroke="{BORDER}"/>
  <rect x="0.5" y="0.5" width="{width - 1}" height="30" rx="10" ry="10" fill="{TITLE_BG}"/>
  <rect x="0.5" y="20.5" width="{width - 1}" height="10" fill="{TITLE_BG}"/>
  <circle class="dot" cx="20" cy="16" r="5" fill="#ff5f56"/>
  <circle class="dot" cx="38" cy="16" r="5" fill="#ffbd2e"/>
  <circle class="dot" cx="56" cy="16" r="5" fill="#27c93f"/>
  <text x="{width / 2}" y="20" text-anchor="middle" class="title">veer@github: ~</text>
  {''.join(lines)}
</svg>
"""
    return svg


def main():
    OUT_PATH.write_text(render())
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
