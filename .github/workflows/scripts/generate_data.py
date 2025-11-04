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
        raise SystemExit("data.json not found in repo root.")

    with DATA_PATH.open('r', encoding='utf-8') as f:
        data = json.load(f)

    # Update timestamps
    data['last_updated'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    data['delta_vs'] = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')

    # Kleine willekeurige 'nudge' zodat grafieken bewegen
    for key, series in list(data.get('series_30d', {}).items()):
        base = series[-1] if series else 100.0
        data['series_30d'][key] = gen_series(base, 0.01, 30)

    with DATA_PATH.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
