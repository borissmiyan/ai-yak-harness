#!/usr/bin/env python3
"""
Design System Scanner for design-system-creator skill.
Scans a React/Tailwind codebase and extracts design tokens, components, and patterns.
Usage: python scan_design_system.py --root ./src [--output scan_results.md]
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import date

# ── Patterns ──────────────────────────────────────────────────────────────────
COLOR_HEX       = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
COLOR_VAR       = re.compile(r'var\(--color-[\w-]+\)')
TW_COLOR        = re.compile(r'(?:bg|text|border|ring|from|to|via)-([a-z]+-\d+|primary|secondary|accent-\w+|white|black|transparent)(?:/\d+)?')
TW_RADIUS       = re.compile(r'rounded-(?:\[[\w%.]+\]|none|sm|md|lg|xl|2xl|3xl|full)')
TW_HEIGHT       = re.compile(r'\bh-(?:\[[\w%.]+\]|\d+|full|screen|auto)')
TW_PADDING      = re.compile(r'\b(?:p|pt|pb|pl|pr|px|py)-(?:\[[\w%.]+\]|\d+)')
FRAMER          = re.compile(r'(?:motion\.|animate=\{|variants=\{|whileTap=\{|whileHover=\{|useAnimation|AnimatePresence)')
HAPTIC          = re.compile(r'HapticFeedback\.\w+|impact\(|notification\(')
DND             = re.compile(r'useDraggable|useDroppable|DndContext|useSortable|@dnd-kit')
GESTURE         = re.compile(r'onSwipe|onLongPress|usePanGesture|drag=|PanGestureHandler|useGesture')
COMP_EXPORT     = re.compile(r'export (?:default )?(?:function|const) ([A-Z][A-Za-z0-9]+)')
MODAL_STATE     = re.compile(r'useState[^;]{0,60}(?:modal|Modal|sheet|Sheet|open|Open|visible|Visible|show|Show)')
ARIA            = re.compile(r'aria-\w+')
PLATFORM_HINT   = re.compile(r'(?:telegram|tg-|mini-app|TelegramWebApp|WebApp\.)', re.IGNORECASE)
SPRING_CONFIG   = re.compile(r'stiffness:\s*(\d+).*?damping:\s*(\d+)', re.DOTALL)

SCAN_EXTENSIONS = {'.tsx', '.ts', '.css', '.scss'}
SKIP_DIRS       = {'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.turbo', 'coverage'}

# ── Per-file scan ──────────────────────────────────────────────────────────────
def scan_file(filepath: Path) -> dict:
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return {}

    lines = content.splitlines()
    components = COMP_EXPORT.findall(content)

    platform = 'All'
    if PLATFORM_HINT.search(content):
        platform = 'TG'

    spring_configs = SPRING_CONFIG.findall(content)

    return {
        'path': str(filepath),
        'line_count': len(lines),
        'platform': platform,
        'components': components,
        'colors_hex': list(set('#' + c for c in COLOR_HEX.findall(content))),
        'colors_var': list(set(COLOR_VAR.findall(content))),
        'tailwind_colors': list(set(TW_COLOR.findall(content))),
        'border_radii': list(set(TW_RADIUS.findall(content))),
        'heights': list(set(TW_HEIGHT.findall(content))),
        'paddings': list(set(TW_PADDING.findall(content))),
        'has_framer': bool(FRAMER.search(content)),
        'has_haptics': bool(HAPTIC.search(content)),
        'has_dnd': bool(DND.search(content)),
        'has_gestures': bool(GESTURE.search(content)),
        'has_modal_state': bool(MODAL_STATE.search(content)),
        'has_aria': bool(ARIA.search(content)),
        'spring_configs': spring_configs,
    }

# ── Directory walk ─────────────────────────────────────────────────────────────
def scan_directory(root: str) -> list:
    results = []
    root_path = Path(root)
    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for filename in filenames:
            filepath = Path(dirpath) / filename
            if filepath.suffix in SCAN_EXTENSIONS:
                r = scan_file(filepath)
                if r:
                    results.append(r)
    return results

# ── Aggregate ──────────────────────────────────────────────────────────────────
def aggregate(results: list) -> dict:
    colors_hex, colors_var, tw_colors = set(), set(), set()
    radii, heights, paddings = set(), set(), set()
    components = []
    framer_files, haptic_files, dnd_files, gesture_files = [], [], [], []
    modal_violations, large_files, no_aria = [], [], []
    spring_configs = []

    for r in results:
        colors_hex.update(r.get('colors_hex', []))
        colors_var.update(r.get('colors_var', []))
        tw_colors.update(r.get('tailwind_colors', []))
        radii.update(r.get('border_radii', []))
        heights.update(r.get('heights', []))
        paddings.update(r.get('paddings', []))
        spring_configs.extend(r.get('spring_configs', []))

        for name in r.get('components', []):
            components.append({
                'name': name,
                'path': r['path'],
                'platform': r['platform'],
                'line_count': r['line_count'],
            })

        path = r['path']
        if r.get('has_framer'):   framer_files.append(path)
        if r.get('has_haptics'):  haptic_files.append(path)
        if r.get('has_dnd'):      dnd_files.append(path)
        if r.get('has_gestures'): gesture_files.append(path)
        if r.get('has_modal_state'):  modal_violations.append(path)
        if r.get('line_count', 0) > 500: large_files.append((path, r['line_count']))
        if r.get('components') and not r.get('has_aria'): no_aria.append(path)

    return {
        'scanned_files': len(results),
        'scan_date': str(date.today()),
        'tokens': {
            'colors_hex': sorted(colors_hex),
            'colors_var': sorted(colors_var),
            'tailwind_colors': sorted(tw_colors),
            'border_radii': sorted(radii),
            'heights': sorted(heights),
            'paddings': sorted(paddings),
        },
        'components': components,
        'motion': {
            'framer_files': framer_files,
            'haptic_files': haptic_files,
            'dnd_files': dnd_files,
            'gesture_files': gesture_files,
            'spring_configs_found': spring_configs,
        },
        'warnings': {
            'modal_state_violations': modal_violations,
            'large_files': large_files,
            'missing_aria': no_aria[:20],
        },
    }

# ── Report formatter ───────────────────────────────────────────────────────────
def format_report(data: dict) -> str:
    t = data['tokens']
    m = data['motion']
    w = data['warnings']
    today = data['scan_date']
    lines = [
        f"# Design System Scan — {today}",
        f"Scanned {data['scanned_files']} files.\n",
        "## Tokens",
        "\n### Hex Colors (check against token list)",
    ]
    for c in t['colors_hex']:
        lines.append(f"- `{c}`")

    lines += ["\n### CSS Variables"]
    for c in t['colors_var']:
        lines.append(f"- `{c}`")

    lines += ["\n### Border Radii"]
    for r in t['border_radii']:
        lines.append(f"- `{r}`")

    lines += ["\n### Heights (interactive elements)"]
    for h in t['heights']:
        lines.append(f"- `{h}`")

    lines += ["\n## Components Found"]
    lines.append("| Component | Path | Platform | Lines |")
    lines.append("|---|---|---|---|")
    for c in data['components']:
        lines.append(f"| `{c['name']}` | `{c['path']}` | {c['platform']} | {c['line_count']} |")

    lines += [
        "\n## Motion & Interactions",
        f"- framer-motion: {len(m['framer_files'])} files",
        f"- haptics: {len(m['haptic_files'])} files",
        f"- drag & drop: {len(m['dnd_files'])} files",
        f"- gestures: {len(m['gesture_files'])} files",
    ]

    if m['spring_configs_found']:
        lines.append("\n### Spring Configs Found")
        for stiffness, damping in set(m['spring_configs_found']):
            lines.append(f"- stiffness: {stiffness}, damping: {damping}")

    lines += ["\n---\n## ⚠️ Warnings & Violations"]

    mv = w['modal_state_violations']
    if mv:
        lines.append(f"\n### AP-002 Violations — Modal useState ({len(mv)} files)")
        for f in mv:
            lines.append(f"- `{f}`")
    else:
        lines.append("\n### AP-002 Modal useState — ✅ No violations")

    lf = w['large_files']
    if lf:
        lines.append(f"\n### AP-007 Violations — Files Over 500 Lines ({len(lf)} files)")
        for path, count in lf:
            lines.append(f"- `{path}` — {count} lines")
    else:
        lines.append("\n### AP-007 Large Files — ✅ No violations")

    ma = w['missing_aria']
    if ma:
        lines.append(f"\n### A11y — Components Missing aria-* (first 20)")
        for f in ma:
            lines.append(f"- `{f}`")

    return "\n".join(lines)

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='./src')
    parser.add_argument('--output', default=None, help='Output .md file path')
    parser.add_argument('--json', default=None, help='Output raw JSON path')
    args = parser.parse_args()

    print(f"Scanning {args.root}...")
    results = scan_directory(args.root)
    print(f"Scanned {len(results)} files.")

    data = aggregate(results)

    if args.json:
        Path(args.json).write_text(json.dumps(data, indent=2))
        print(f"JSON saved to {args.json}")

    report = format_report(data)

    if args.output:
        Path(args.output).write_text(report)
        print(f"Report saved to {args.output}")
    else:
        print(report)

if __name__ == '__main__':
    main()