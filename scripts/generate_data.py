import json, random
from datetime import datetime, timedelta

def gen_series(base, noise=0.01, n=30):
    out = []
    for i in range(n):
        drift = (0.2 * base) * (0.01 * (i % 5) - 0.02)
        base = max(0.0001, base + drift * 0.001 + (random.random()-0.5) * base * noise)
        out.append(round(base, 2))
    return out

with open('data.json','r',encoding='utf-8') as f:
    data = json.load(f)

data['last_updated'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
data['delta_vs'] = yesterday

# Refresh all series with a small random walk
for k, v in data['series_30d'].items():
    base = v[-1] if v else 100.0
    data['series_30d'][k] = gen_series(base, 0.01, 30)

with open('data.json','w',encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
