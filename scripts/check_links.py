import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MD_LINK_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)|\[[^\]]*\]\(([^)]+)\)")
HTML_ATTR_RE = re.compile(r"(?:src|href)=[\"']([^\"'#>]+)[\"']")

def collect_files():
    exts = {'.md', '.html', '.htm', '.js', '.css'}
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix.lower() in exts:
            yield path

def extract_targets(text):
    targets = []
    for m in MD_LINK_RE.finditer(text):
        t = m.group(1) or m.group(2)
        if t:
            targets.append(t.strip())
    for m in HTML_ATTR_RE.finditer(text):
        targets.append(m.group(1).strip())
    return targets

def is_external(target):
    return target.startswith('http://') or target.startswith('https://') or target.startswith('mailto:')

def resolve_target(source_path: Path, target: str):
    # Strip any fragment or query
    target = target.split('#', 1)[0].split('?', 1)[0]
    if target == '':
        return None
    # If absolute (starts with /), resolve from repo root
    if target.startswith('/'):
        return ROOT.joinpath(target.lstrip('/'))
    # Else resolve relative to source file
    return (source_path.parent / target).resolve()

def main():
    missing = []
    for f in collect_files():
        text = f.read_text(encoding='utf-8', errors='ignore')
        targets = extract_targets(text)
        for t in targets:
            if is_external(t):
                continue
            resolved = resolve_target(f, t)
            if resolved is None:
                continue
            # If path points to a directory, consider index.html as acceptable
            if resolved.exists():
                continue
            if (resolved / 'index.html').exists():
                continue
            missing.append((str(f.relative_to(ROOT)), t, str(resolved.relative_to(ROOT))))

    if not missing:
        print('No missing local links found.')
        return 0

    print('Missing local links:')
    for src, target, resolved in missing:
        print(f'- {src} -> {target}  (resolved: {resolved})')
    return 1

if __name__ == '__main__':
    raise SystemExit(main())
