#!/usr/bin/env python3
"""
Design Violations Linter for design-system-creator skill.
Fast checker for known antipatterns — run before commit or in CI.
Usage: python check_design_violations.py --root ./src [--strict]
       --strict exits with code 1 if any critical violations found
"""

import os
import re
import sys
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# ── Violation definitions ──────────────────────────────────────────────────────

@dataclass
class Violation:
    rule_id: str
    severity: str          # critical | high | medium | low
    file: str
    line: int
    snippet: str
    message: str

# ── Patterns ──────────────────────────────────────────────────────────────────

RULES = [
    {
        'id': 'AP-001a',
        'severity': 'critical',
        'desc': 'Wrong border radius on input/button (rounded-lg)',
        'pattern': re.compile(
            r'<(?:input|button|Button)[^>]*className[^>]*\brounded-lg\b'
        ),
        'message': 'Use rounded-3xl on inputs and buttons, not rounded-lg',
    },
    {
        'id': 'AP-001b',
        'severity': 'critical',
        'desc': 'Wrong border radius on input/button (rounded-xl)',
        'pattern': re.compile(
            r'<(?:input|button|Button)[^>]*className[^>]*\brounded-xl\b'
        ),
        'message': 'Use rounded-3xl on inputs and buttons, not rounded-xl',
    },
    {
        'id': 'AP-001c',
        'severity': 'critical',
        'desc': 'Wrong border radius on input/button (rounded-md)',
        'pattern': re.compile(
            r'<(?:input|button|Button)[^>]*className[^>]*\brounded-md\b'
        ),
        'message': 'Use rounded-3xl on inputs and buttons, not rounded-md',
    },
    {
        'id': 'AP-002',
        'severity': 'critical',
        'desc': 'Modal visibility via useState',
        'pattern': re.compile(
            r'useState[^;]{0,80}(?:modal|Modal|sheet|Sheet|isOpen|isVisible|showModal)'
        ),
        'message': 'Modal visibility must use global state (AppModals.tsx registry), not useState',
    },
    {
        'id': 'AP-003a',
        'severity': 'high',
        'desc': 'Raw hex color in className',
        'pattern': re.compile(
            r'className[^"\'`]*["\'\`][^"\'`]*\[#[0-9a-fA-F]{3,8}\]'
        ),
        'message': 'Use Tailwind token or CSS variable instead of raw hex in className',
    },
    {
        'id': 'AP-003b',
        'severity': 'high',
        'desc': 'Raw hex color in style prop',
        'pattern': re.compile(
            r'(?:color|background|backgroundColor|borderColor)\s*:\s*[\'"]#[0-9a-fA-F]{3,8}[\'"]'
        ),
        'message': 'Use var(--color-*) CSS variable instead of raw hex in style prop',
    },
    {
        'id': 'AP-004',
        'severity': 'high',
        'desc': 'Wrong interactive element height (h-10, h-12, h-14)',
        'pattern': re.compile(
            r'<(?:input|button|Button)[^>]*className[^>]*\b(?:h-10|h-12|h-14)\b'
        ),
        'message': 'Use h-[60px] for all inputs and buttons, not h-10/h-12/h-14',
    },
    {
        'id': 'AP-005',
        'severity': 'medium',
        'desc': 'Raw motion.div instead of shared MotionDiv',
        'pattern': re.compile(r'<motion\.div\b'),
        'message': 'Use <MotionDiv> from shared/ui/animations/MotionComponents instead of raw motion.div',
    },
    {
        'id': 'AP-007',
        'severity': 'medium',
        'desc': 'File over 500 lines',
        'pattern': None,  # handled separately via line count
        'message': 'File exceeds 500 lines — split into hook + sub-components + utils',
    },
    {
        'id': 'AP-008',
        'severity': 'low',
        'desc': 'Button onClick missing haptic feedback',
        'pattern': re.compile(
            r'onClick=\{[^}]{0,200}\}(?![\s\S]{0,300}HapticFeedback)',
            re.DOTALL
        ),
        'message': 'Consider adding HapticFeedback.impact("light") to button onClick',
    },
]

SKIP_DIRS  = {'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage'}
SKIP_FILES = {'.test.tsx', '.test.ts', '.stories.tsx', '.stories.ts', 'database.types.ts', 'types.ts'}

# ── Scanner ────────────────────────────────────────────────────────────────────

def scan_file(filepath: Path, rules: list) -> list[Violation]:
    if any(filepath.name.endswith(s) for s in SKIP_FILES):
        return []
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return []

    lines = content.splitlines()
    violations = []

    # Line-count check (AP-007)
    if len(lines) > 500:
        violations.append(Violation(
            rule_id='AP-007',
            severity='medium',
            file=str(filepath),
            line=len(lines),
            snippet=f'{len(lines)} lines',
            message=f'File has {len(lines)} lines — split into hook + sub-components + utils',
        ))

    # Pattern-based checks
    for rule in rules:
        if rule['pattern'] is None:
            continue
        for match in rule['pattern'].finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            snippet = lines[line_num - 1].strip()[:80]
            violations.append(Violation(
                rule_id=rule['id'],
                severity=rule['severity'],
                file=str(filepath),
                line=line_num,
                snippet=snippet,
                message=rule['message'],
            ))

    return violations


def scan_directory(root: str) -> list[Violation]:
    all_violations = []
    root_path = Path(root)
    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for filename in filenames:
            if not filename.endswith(('.tsx', '.ts')):
                continue
            filepath = Path(dirpath) / filename
            all_violations.extend(scan_file(filepath, RULES))
    return all_violations


# ── Reporter ───────────────────────────────────────────────────────────────────

SEVERITY_ORDER = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
SEVERITY_EMOJI = {'critical': '🔴', 'high': '🟡', 'medium': '🟠', 'low': '🟢'}


def print_report(violations: list[Violation], strict: bool) -> int:
    if not violations:
        print('✅ No design violations found.')
        return 0

    violations.sort(key=lambda v: (SEVERITY_ORDER.get(v.severity, 9), v.file, v.line))

    by_severity: dict[str, list] = {'critical': [], 'high': [], 'medium': [], 'low': []}
    for v in violations:
        by_severity[v.severity].append(v)

    print(f'\n{"="*60}')
    print(f'Design Violations Report — {sum(len(v) for v in by_severity.values())} issues found')
    print(f'{"="*60}\n')

    for sev in ['critical', 'high', 'medium', 'low']:
        items = by_severity[sev]
        if not items:
            continue
        emoji = SEVERITY_EMOJI[sev]
        print(f'{emoji} {sev.upper()} ({len(items)})')
        print('-' * 40)
        for v in items:
            print(f'  [{v.rule_id}] {v.file}:{v.line}')
            print(f'  → {v.message}')
            print(f'  Code: {v.snippet}')
            print()

    critical_count = len(by_severity['critical'])
    high_count = len(by_severity['high'])
    print(f'Summary: {critical_count} critical, {high_count} high, '
          f'{len(by_severity["medium"])} medium, {len(by_severity["low"])} low\n')

    if strict and (critical_count > 0 or high_count > 0):
        print('❌ Strict mode: critical/high violations found. Exiting with code 1.')
        return 1
    return 0


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Check for design system violations')
    parser.add_argument('--root', default='./src', help='Root directory to scan')
    parser.add_argument('--strict', action='store_true',
                        help='Exit with code 1 if critical/high violations found')
    args = parser.parse_args()

    print(f'Checking {args.root} for design violations...')
    violations = scan_directory(args.root)
    exit_code = print_report(violations, args.strict)
    sys.exit(exit_code)


if __name__ == '__main__':
    main()