#!/usr/bin/env python3
"""
Design Changelog Generator for design-system-creator skill.
Parses git log for UI-related commits and generates Decision Log entries
ready to paste into DESIGN-AI.md and DESIGN-HUMAN.md.

Usage:
  python generate_changelog.py                        # last 30 days
  python generate_changelog.py --since "2025-01-01"  # since date
  python generate_changelog.py --since "30 days ago" # relative
  python generate_changelog.py --output changelog.md # save to file
  python generate_changelog.py --format decision-log # format for DESIGN.md
"""

import subprocess
import re
import argparse
import sys
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass

# ── Config — paths considered UI-related ──────────────────────────────────────
UI_PATHS = [
    'src/shared/ui',
    'src/features',
    'src/app/app.css',
    'tailwind.config',
    'src/entities',
    'docs/design',
]

# ── Commit categories from conventional commits + common patterns ──────────────
CATEGORY_PATTERNS = [
    (re.compile(r'^feat(?:\(.+\))?!?:'),           'Feature'),
    (re.compile(r'^fix(?:\(.+\))?:'),              'Bug Fix'),
    (re.compile(r'^refactor(?:\(.+\))?:'),         'Refactor'),
    (re.compile(r'^style(?:\(.+\))?:'),            'Style'),
    (re.compile(r'^design(?:\(.+\))?:',re.I),     'Design'),
    (re.compile(r'^ui(?:\(.+\))?:',re.I),         'UI'),
    (re.compile(r'^component(?:\(.+\))?:',re.I),  'Component'),
    (re.compile(r'^token(?:\(.+\))?:',re.I),      'Token'),
    (re.compile(r'^animation(?:\(.+\))?:',re.I),  'Animation'),
    (re.compile(r'^chore(?:\(.+\))?:'),            'Chore'),
    (re.compile(r'^docs(?:\(.+\))?:'),             'Docs'),
]

# Commit message patterns that suggest design significance
SIGNIFICANT_PATTERNS = re.compile(
    r'(?:color|colour|radius|rounded|spacing|padding|margin|font|text|'
    r'button|input|card|modal|sheet|component|icon|animation|motion|'
    r'theme|token|design|ui|ux|layout|style|breakpoint|responsive)',
    re.IGNORECASE
)

# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class Commit:
    hash: str
    date: str
    author: str
    message: str
    body: str
    files_changed: list[str]
    category: str
    is_significant: bool


# ── Git operations ─────────────────────────────────────────────────────────────

def run_git(args: list[str]) -> str:
    try:
        result = subprocess.run(
            ['git'] + args,
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f'Git error: {e.stderr}', file=sys.stderr)
        return ''
    except FileNotFoundError:
        print('Git not found. Make sure git is installed.', file=sys.stderr)
        return ''


def get_commits(since: str) -> list[str]:
    """Get commit hashes since a date."""
    return run_git([
        'log',
        f'--since={since}',
        '--format=%H',
        '--',
        *UI_PATHS,
    ]).splitlines()


def get_commit_detail(hash: str) -> Commit | None:
    """Get full details of a single commit."""
    # Format: hash|date|author|subject|body
    raw = run_git([
        'show',
        '--format=%H|%as|%an|%s|%b',
        '--name-only',
        hash,
    ])
    if not raw:
        return None

    lines = raw.splitlines()
    if not lines:
        return None

    # First line is the format output
    parts = lines[0].split('|', 4)
    if len(parts) < 4:
        return None

    commit_hash = parts[0]
    date        = parts[1]
    author      = parts[2]
    message     = parts[3]
    body        = parts[4] if len(parts) > 4 else ''

    # Remaining lines after empty line are files
    files = [l for l in lines[2:] if l.strip() and not l.startswith('diff')]

    # Determine category
    category = 'Other'
    for pattern, cat in CATEGORY_PATTERNS:
        if pattern.match(message):
            category = cat
            break

    is_significant = bool(SIGNIFICANT_PATTERNS.search(message + ' ' + body))

    return Commit(
        hash=commit_hash[:8],
        date=date,
        author=author,
        message=message,
        body=body.strip(),
        files_changed=files,
        category=category,
        is_significant=is_significant,
    )


# ── Formatters ────────────────────────────────────────────────────────────────

def format_as_decision_log(commits: list[Commit]) -> str:
    """Format as rows ready to paste into DESIGN-AI.md Decision Log table."""
    lines = [
        '## Generated Decision Log Entries',
        '',
        'Paste these rows into the Decision Log table in DESIGN-AI.md and DESIGN-HUMAN.md.',
        '',
        '| Date | Change | Reason | Previous Value |',
        '|---|---|---|---|',
    ]
    for c in commits:
        # Clean up conventional commit prefix for the "Change" column
        change = re.sub(r'^(?:feat|fix|refactor|style|design|ui|chore|docs)(?:\(.+\))?!?:\s*', '', c.message)
        change = change[:80]
        reason = c.body[:80].replace('\n', ' ') if c.body else '—'
        lines.append(f'| {c.date} | {change} | {reason} | — |')

    return '\n'.join(lines)


def format_as_changelog(commits: list[Commit]) -> str:
    """Format as readable changelog grouped by date."""
    if not commits:
        return 'No UI-related commits found in the specified period.'

    # Group by date
    by_date: dict[str, list[Commit]] = {}
    for c in commits:
        by_date.setdefault(c.date, []).append(c)

    lines = [
        f'# UI Changelog',
        f'Generated: {datetime.now().strftime("%Y-%m-%d")}',
        f'Commits found: {len(commits)}',
        '',
    ]

    for date in sorted(by_date.keys(), reverse=True):
        lines.append(f'## {date}')
        for c in by_date[date]:
            sig = '⭐ ' if c.is_significant else ''
            lines.append(f'- {sig}[{c.category}] {c.message} ({c.hash})')
            if c.body:
                for line in c.body.splitlines()[:2]:
                    if line.strip():
                        lines.append(f'  {line.strip()}')
            if c.files_changed:
                ui_files = [f for f in c.files_changed if any(p in f for p in UI_PATHS)][:3]
                if ui_files:
                    lines.append(f'  Files: {", ".join(Path(f).name for f in ui_files)}')
        lines.append('')

    return '\n'.join(lines)


def format_as_summary(commits: list[Commit]) -> str:
    """Format as short summary for a quick overview."""
    if not commits:
        return 'No UI-related commits found.'

    significant = [c for c in commits if c.is_significant]
    by_category: dict[str, int] = {}
    for c in commits:
        by_category[c.category] = by_category.get(c.category, 0) + 1

    lines = [
        f'UI Changes Summary ({len(commits)} commits)',
        '-' * 40,
    ]
    for cat, count in sorted(by_category.items(), key=lambda x: -x[1]):
        lines.append(f'  {cat}: {count}')

    lines += [
        '',
        f'Significant design changes ({len(significant)}):',
    ]
    for c in significant[:10]:
        lines.append(f'  {c.date} — {c.message}')

    return '\n'.join(lines)


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Generate design changelog from git history'
    )
    parser.add_argument(
        '--since', default='30 days ago',
        help='Start date (e.g. "2025-01-01" or "30 days ago")'
    )
    parser.add_argument(
        '--format',
        choices=['changelog', 'decision-log', 'summary'],
        default='changelog',
        help='Output format'
    )
    parser.add_argument(
        '--output', default=None,
        help='Save output to file instead of printing'
    )
    parser.add_argument(
        '--all', action='store_true',
        help='Include all commits, not just significant ones'
    )
    args = parser.parse_args()

    print(f'Scanning git history since: {args.since}', file=sys.stderr)
    hashes = get_commits(args.since)

    if not hashes:
        print('No UI-related commits found in the specified period.')
        return

    print(f'Found {len(hashes)} commits — fetching details...', file=sys.stderr)
    commits = []
    for h in hashes:
        c = get_commit_detail(h)
        if c:
            if args.all or c.is_significant:
                commits.append(c)

    print(f'Processing {len(commits)} relevant commits.', file=sys.stderr)

    if args.format == 'decision-log':
        output = format_as_decision_log(commits)
    elif args.format == 'summary':
        output = format_as_summary(commits)
    else:
        output = format_as_changelog(commits)

    if args.output:
        Path(args.output).write_text(output)
        print(f'Saved to {args.output}', file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    main()