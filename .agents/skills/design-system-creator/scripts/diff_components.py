#!/usr/bin/env python3
"""
Component Registry Diff for design-system-creator skill.
Compares COMPONENTS.md against the actual codebase.
Shows: undocumented components, deprecated candidates, path mismatches.
Usage: python diff_components.py --root ./src --registry ./docs/design/COMPONENTS.md
"""

import os
import re
import argparse
from pathlib import Path
from dataclasses import dataclass

SKIP_DIRS  = {'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage'}
COMP_EXPORT = re.compile(r'export (?:default )?(?:function|const) ([A-Z][A-Za-z0-9]+)')
REGISTRY_ROW = re.compile(r'\|\s*`([A-Z][A-Za-z0-9]+)`\s*\|\s*`([^`]+)`')
DEPRECATED_ROW = re.compile(r'\|\s*`([A-Z][A-Za-z0-9]+)`.*\[DEPRECATED')

# ── Scan codebase for exported components ─────────────────────────────────────

@dataclass
class CodeComponent:
    name: str
    path: str
    line_count: int


def scan_codebase(root: str) -> dict[str, CodeComponent]:
    found: dict[str, CodeComponent] = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for filename in filenames:
            if not filename.endswith(('.tsx', '.ts')):
                continue
            filepath = Path(dirpath) / filename
            try:
                content = filepath.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            lines = content.splitlines()
            for name in COMP_EXPORT.findall(content):
                # Skip common non-UI exports
                if name in {'App', 'Router', 'Provider', 'Store'}:
                    continue
                found[name] = CodeComponent(
                    name=name,
                    path=str(filepath),
                    line_count=len(lines),
                )
    return found


# ── Parse COMPONENTS.md ───────────────────────────────────────────────────────

@dataclass
class RegistryComponent:
    name: str
    path: str
    deprecated: bool = False


def parse_registry(registry_path: str) -> dict[str, RegistryComponent]:
    registered: dict[str, RegistryComponent] = {}
    try:
        content = Path(registry_path).read_text(encoding='utf-8')
    except FileNotFoundError:
        print(f'⚠️  Registry not found at {registry_path}')
        return {}

    deprecated_names = set(DEPRECATED_ROW.findall(content))

    for match in REGISTRY_ROW.finditer(content):
        name, path = match.group(1), match.group(2)
        registered[name] = RegistryComponent(
            name=name,
            path=path,
            deprecated=name in deprecated_names,
        )
    return registered


# ── Diff & Report ─────────────────────────────────────────────────────────────

def diff_and_report(code: dict, registry: dict) -> None:
    code_names     = set(code.keys())
    registry_names = set(k for k, v in registry.items() if not v.deprecated)
    deprecated     = set(k for k, v in registry.items() if v.deprecated)

    undocumented   = code_names - registry_names - deprecated
    missing_files  = registry_names - code_names
    path_mismatches = []

    for name in registry_names & code_names:
        reg_path  = registry[name].path
        code_path = code[name].path
        # Normalize: just check filename + parent dir
        if Path(reg_path).name != Path(code_path).name:
            path_mismatches.append((name, reg_path, code_path))

    print('\n' + '='*60)
    print('Component Registry Diff')
    print('='*60)

    # ── Undocumented (need to add to COMPONENTS.md)
    if undocumented:
        print(f'\n📝 UNDOCUMENTED ({len(undocumented)}) — add these to COMPONENTS.md:')
        print('-'*40)
        for name in sorted(undocumented):
            c = code[name]
            print(f'  {name}')
            print(f'  Path: {c.path}')
            print(f'  Lines: {c.line_count}')
            print()
    else:
        print('\n✅ All components are documented.')

    # ── Missing files (candidates for DEPRECATED)
    if missing_files:
        print(f'\n🗑️  MISSING FROM CODEBASE ({len(missing_files)}) — mark as [DEPRECATED]:')
        print('-'*40)
        for name in sorted(missing_files):
            r = registry[name]
            print(f'  {name}  (was at {r.path})')
    else:
        print('✅ No documented components are missing from codebase.')

    # ── Path mismatches
    if path_mismatches:
        print(f'\n⚠️  PATH MISMATCHES ({len(path_mismatches)}) — update COMPONENTS.md:')
        print('-'*40)
        for name, reg_path, code_path in path_mismatches:
            print(f'  {name}')
            print(f'  Registry: {reg_path}')
            print(f'  Actual:   {code_path}')
            print()
    else:
        print('✅ All paths match.')

    # ── Already deprecated (info only)
    if deprecated:
        print(f'\nℹ️  DEPRECATED ({len(deprecated)}) — already marked, no action needed:')
        for name in sorted(deprecated):
            print(f'  {name}')

    # ── Summary
    print('\n' + '='*60)
    print(f'Summary:')
    print(f'  In codebase:     {len(code_names)} components')
    print(f'  In registry:     {len(registry_names)} active + {len(deprecated)} deprecated')
    print(f'  Undocumented:    {len(undocumented)}')
    print(f'  Missing files:   {len(missing_files)}')
    print(f'  Path mismatches: {len(path_mismatches)}')

    if undocumented or missing_files:
        print('\n→ Run "sync design system" in design-system-creator to update COMPONENTS.md')

    print()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root',     default='./src',
                        help='Source root to scan')
    parser.add_argument('--registry', default='./docs/design/COMPONENTS.md',
                        help='Path to COMPONENTS.md')
    args = parser.parse_args()

    print(f'Scanning codebase: {args.root}')
    print(f'Reading registry:  {args.registry}')

    code     = scan_codebase(args.root)
    registry = parse_registry(args.registry)

    diff_and_report(code, registry)


if __name__ == '__main__':
    main()