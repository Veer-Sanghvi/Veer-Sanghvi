#!/usr/bin/env python3
"""Scrape the public GitHub contributions calendar HTML (no token/API needed)
and write data/contributions.json for render_heatmap_svg.py to consume."""

import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

USERNAME = "Veer-Sanghvi"
URL = f"https://github.com/users/{USERNAME}/contributions"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "contributions.json"


def fetch_days():
    resp = requests.get(URL, headers={"User-Agent": "profile-readme-bot"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    cells = soup.select("td.ContributionCalendar-day")
    if not cells:
        # GitHub has iterated on the markup before; fall back to the <tool-tip>
        # based list used by the newer calendar component.
        cells = soup.select("[data-date][data-level]")

    days = []
    for cell in cells:
        d = cell.get("data-date")
        level = cell.get("data-level")
        count_attr = cell.get("data-count")
        if d is None:
            continue
        if level is not None:
            level = int(level)
        count = int(count_attr) if count_attr is not None else None
        if count is None:
            tooltip_id = cell.get("id")
            tooltip = None
            if tooltip_id:
                tooltip = soup.find("tool-tip", attrs={"for": tooltip_id})
            text = tooltip.get_text(strip=True) if tooltip else cell.get("aria-label", "")
            count = 0
            if "No contributions" not in text:
                first_tok = text.split(" ")[0].replace(",", "")
                if first_tok.isdigit():
                    count = int(first_tok)
        days.append({"date": d, "count": count, "level": level if level is not None else 0})

    days.sort(key=lambda x: x["date"])
    return days


def compute_stats(days):
    if not days:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "best_day": None,
            "monthly_totals": {},
        }

    longest = current = 0
    running = 0
    for d in days:
        if d["count"] > 0:
            running += 1
            longest = max(longest, running)
        else:
            running = 0

    # current streak counts backward from the most recent day with data.
    current = 0
    for d in reversed(days):
        today = date.today().isoformat()
        if d["date"] > today:
            continue
        if d["count"] > 0:
            current += 1
        else:
            break

    best_day = max(days, key=lambda x: x["count"])
    monthly = {}
    for d in days:
        month = d["date"][:7]
        monthly[month] = monthly.get(month, 0) + d["count"]

    return {
        "current_streak": current,
        "longest_streak": longest,
        "best_day": {"date": best_day["date"], "count": best_day["count"]},
        "monthly_totals": monthly,
    }


def main():
    try:
        days = fetch_days()
    except requests.RequestException as exc:
        print(f"fetch_contributions: request failed: {exc}", file=sys.stderr)
        sys.exit(1)

    if not days:
        print("fetch_contributions: no day cells parsed, GitHub markup may have changed", file=sys.stderr)
        sys.exit(1)

    stats = compute_stats(days)
    payload = {
        "username": USERNAME,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_contributions": sum(d["count"] for d in days),
        "days": days,
        "stats": stats,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"wrote {len(days)} days -> {OUT_PATH}")


if __name__ == "__main__":
    main()
