# This script updates data.json daily.
# Replace the 'TODO' section with real values (e.g., from your morning updates).
import json, random
from datetime import datetime, timedelta
from pathlib import Path

DATA_PATH = Path('data.json')

def gen_series(base, noise=0.01, n=30):
    out = []
    for i in range(n):
        drift = (0.2 * base) * (0.01 * (i % 5) - 0.02)
        base = max(0.0001, base + drift * 0.001 + (random.random()-0.5) * base * noise)
        out.append(round(base, 2))
    return out

def main():
    if not DATA_PATH.exists():
        raise SystemExit("data.json not found in repo root. Please ensure index.html and data.json are in the root.")

    with DATA_PATH.open('r', encoding='utf-8') as f:
        data = json.load(f)

    # Update timestamps
    data['last_updated'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    data['delta_vs'] = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')

    # === TODO: Plug in real values here if you have them ===
    # For now we just 'nudge' the series so the charts move each day.
    if 'series_30d' not in data:
        data['series_30d'] = {}
    for key, series in list(data['series_30d'].items()):
        base = series[-1] if series else 100.0
        data['series_30d'][key] = gen_series(base, 0.01, 30)

    with DATA_PATH.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
