
async function loadData(){
  const res = await fetch('data.json?ts=' + Date.now());
  const data = await res.json();
  return data;
}

function last30Dates(){ 
  const labels=[]; 
  const now=new Date(); 
  for (let i=29;i>=0;i--){ 
    const d=new Date(now); d.setDate(now.getDate()-i); 
    const m=(d.getMonth()+1).toString().padStart(2,'0');
    const day=d.getDate().toString().padStart(2,'0');
    labels.push(m+'-'+day);
  } 
  return labels; 
}
const X_LABELS = last30Dates();

function drawLineChart(canvas, series, label) { 
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const m = {l:55,r:20,t:20,b:45};
  let min = Math.min(...series), max = Math.max(...series);
  if (min===max) { min -= 1; max += 1; }
  const x0 = m.l, y0 = h - m.b, x1 = w - m.r, y1 = m.t;
  const W = x1 - x0, H = y0 - y1;
  // grid
  ctx.strokeStyle = '#223049'; ctx.lineWidth = 1;
  for (let i=0;i<=4;i++) { 
    const y = y0 - (H*i/4);
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
  }
  // axes
  ctx.strokeStyle = '#35445e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0,y1); ctx.lineTo(x1,y1); ctx.stroke();
  // y labels
  ctx.fillStyle = '#9aa4b2'; ctx.font = '12px system-ui';
  for (let i=0;i<=4;i++) { 
    const val = min + (max-min)*i/4; 
    const y = y0 - (H*i/4); 
    ctx.fillText(val.toFixed(2), 6, y+4); 
  }
  // X labels
  const stepIdx = [0,5,10,15,20,25,29];
  ctx.fillStyle = '#9aa4b2'; ctx.textAlign = 'center';
  stepIdx.forEach(idx => {
    const x = x0 + (W * idx / (series.length-1));
    ctx.fillText(X_LABELS[idx], x, y0 + 18);
    ctx.strokeStyle = '#35445e'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0+5); ctx.stroke();
  });
  ctx.textAlign = 'start';
  // line
  ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2;
  ctx.beginPath();
  series.forEach((v, idx) => {
    const x = x0 + (W * idx / (series.length-1));
    const y = y0 - ((v - min) / (max - min)) * H;
    if (idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  // title/last point
  const last = series[series.length-1];
  ctx.fillStyle = '#e6edf3'; ctx.textAlign = 'start';
  ctx.fillText(label + '  ' + last.toFixed(2), x0+8, y1+16);
}

function setupSection(panelSelector, canvasSelector, titleSelector, dataObj) {
  const section = document.querySelector(panelSelector);
  const canvas = document.querySelector(canvasSelector);
  const title = document.querySelector(titleSelector);
  const wrap = section.querySelector('.chart-wrap');
  section.querySelectorAll('.row').forEach(row => {
    row.addEventListener('click', () => {
      const key = row.getAttribute('data-series');
      const unit = row.getAttribute('data-unit') || '';
      title.textContent = key + (unit ? ' ('+unit+')' : '');
      const series = dataObj.series_30d[key] || [];
      wrap.style.display = 'block';
      drawLineChart(canvas, series, key);
      wrap.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });
  });
}

function wireTabs(){
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('[data-panel]');
  tabs.forEach(btn=>{ btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.getAttribute('data-tab');
    panels.forEach(p=>{ p.hidden = p.getAttribute('data-panel')!==id; });
  }); });
}

async function init(){
  const data = await loadData();
  document.getElementById('lastUpdated').textContent = data.last_updated;
  const refDates = document.querySelectorAll('.refdate');
  refDates.forEach(el => el.textContent = 'Δ vs ' + data.delta_vs);

  wireTabs();
  setupSection('[data-panel="containers-cn"]', '#canvas-cn', '#chartTitleCN', data);
  setupSection('[data-panel="containers-in"]', '#canvas-in', '#chartTitleIN', data);
  setupSection('[data-panel="metals"]', '#canvas-metals', '#chartTitleMetals', data);
  setupSection('[data-panel="plastics"]', '#canvas-plastics', '#chartTitlePlastics', data);
  setupSection('[data-panel="energy"]', '#canvas-energy', '#chartTitleEnergy', data);
}
init().catch(console.error);
// === HS-code AI: klik-handler + render ===
async function callHsApi(payload) {
  const ENDPOINT = 'https://<JOUW-SERVERLESS-URL>/api/hs'; // <-- straks vervangen
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    // DEMO fallback: simpele suggesties zodat de UI werkt zonder backend
    const txt = (payload.description || '').toLowerCase();
    const guess = txt.includes('scharnier') ? '83021000'
               : txt.includes('plastic') && txt.includes('zit') ? '95069990'
               : txt.includes('rvs') || txt.includes('stainless') ? '73269098'
               : txt.includes('aluminium') ? '76169990'
               : '39269097';
    return {
      origin: payload.origin || 'CN',
      candidates: [
        { hs_code: guess, title: 'Indicatieve match (demo)', duty: null,
          reason: 'Demo-modus: ruwe keyword-match (vervang door serverless endpoint).',
          links: {
            a2m: `https://www.google.com/search?q=site%3Atrade.ec.europa.eu+${guess}`,
            nl:  `https://tarief.douane.nl/arctictariff-public-web/Tariff?preferredLanguage=nl&taricCode=${guess}`
          }
        }
      ]
    };
  }
}

function renderHS(data){
  const box = document.getElementById('hsResults');
  if (!data || !data.candidates || !data.candidates.length) {
    box.innerHTML = '<div class="small">Geen match. Probeer specifieker (materiaal, functie, set/onderdeel, afmetingen).</div>';
    return;
  }
  box.innerHTML = data.candidates.map(c => `
    <div class="card" style="margin:0 0 10px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div><strong>${c.hs_code || '—'}</strong> — ${c.title || ''}</div>
        <div>${c.duty != null ? `<strong>${c.duty}% invoerrecht</strong>` : `<span class="small">tarief: n.v.t.</span>`}</div>
      </div>
      <div class="small" style="margin-top:6px">${c.reason || ''}</div>
      <div class="small" style="margin-top:8px">
        🔗 Verifieer:
        <a href="https://trade.ec.europa.eu/access-to-markets/en/home" target="_blank">Access2Markets</a> ·
        <a href="https://tarief.douane.nl/" target="_blank">NL Gebruikstarief</a>
        ${c.links?.a2m ? ` · <a href="${c.links.a2m}" target="_blank">A2M zoeklink</a>` : ''}
        ${c.links?.nl ? ` · <a href="${c.links.nl}" target="_blank">NL tarieflink</a>` : ''}
      </div>
    </div>
  `).join('');
}

// Koppeling aan de knop
const hsBtn = document.getElementById('hsSubmit');
if (hsBtn) {
  hsBtn.addEventListener('click', async () => {
    const payload = {
      description: (document.getElementById('hsDesc')?.value || '').trim(),
      material: (document.getElementById('hsMaterial')?.value || '').trim(),
      use: (document.getElementById('hsUse')?.value || '').trim(),
      origin: (document.getElementById('hsOrigin')?.value || 'CN').toUpperCase()
    };
    const data = await callHsApi(payload);
    renderHS(data);
  });
}
