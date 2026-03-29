// ── Globaalit ──────────────────────────────────────────
let asiakkaat = [], tarvikkeet = [], tuntihinnoittelu = [];

const ROUTE_TO_PAGE = {
  '/': 'etusivu',
  '/asiakkaat': 'asiakkaat',
  '/tyokohde/uusi': 't1',
  '/tyosuorite/uusi': 't2',
  '/lasku/muistutus': 't3',
  '/raportti/hinta-arvio': 'r1',
  '/raportti/tuntityolasku': 'r2',
  '/raportti/alennus': 'r3',
  '/raportti/urakka': 'r4',
  '/urakka/hyvaksy': 'r5',
  '/raportti/turvallisuus': 'r6',
  '/tarvike/xml': 't5',
};

const PAGE_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_TO_PAGE).map(([route, page]) => [page, route])
);

async function api(method, url, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch('/api' + url, opts);
    const isJson = (r.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await r.json() : { error: await r.text() };
    if (!r.ok) return { error: data.error || `HTTP ${r.status}` };
    return data;
  } catch (e) {
    return { error: 'Yhteysvirhe palvelimeen tai tietokantaan' };
  }
}

function naytaAlustusvirhe(teksti) {
  msg('t1-msg', teksti, 'error');
  const stats = document.getElementById('stats');
  if (stats) {
    stats.innerHTML = `<div class="alert alert-error">${teksti}</div>`;
  }
}

function lataaAsiakkaat() {
  const tbody = document.getElementById('asiakkaat-tbody');
  if (!tbody) return;

  tbody.innerHTML = asiakkaat.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.nimi || ''}</td>
      <td>${a.osoite || ''}</td>
      <td>${a.email || ''}</td>
      <td>${a.puhelin || ''}</td>
    </tr>`).join('');
}

function showPage(id, pushToHistory = false) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (!page) return;

  page.classList.add('active');
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === id);
  });

  if (id === 'asiakkaat') {
    lataaAsiakkaat();
  }

  if (pushToHistory) {
    history.pushState({ page: id }, '', PAGE_TO_ROUTE[id] || '/');
  }
}

function routeNavigate(event, pageId) {
  event.preventDefault();
  showPage(pageId, true);
}

function applyRoute(pathname) {
  showPage(ROUTE_TO_PAGE[pathname] || 'etusivu', false);
}

function msg(id, teksti, tyyppi = 'success') {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = `<div class="alert alert-${tyyppi}">${teksti}</div>`; }
}

function badgeTila(tila) {
  return `<span class="badge badge-${tila}">${tila}</span>`;
}

function fmt(n) { return (+n).toFixed(2) + ' €'; }

// ── Init ──────────────────────────────────────────────
window.onload = async () => {
  const alkuData = await Promise.all([
    api('GET', '/asiakkaat'),
    api('GET', '/tarvikkeet'),
    api('GET', '/tuntihinnoittelu'),
  ]);

  if (alkuData.some(d => d.error)) {
    naytaAlustusvirhe('Asiakaslista ei lataudu. Tarkista PostgreSQL-yhteys ja seed-data.');
    return;
  }

  [asiakkaat, tarvikkeet, tuntihinnoittelu] = alkuData;

  if (!asiakkaat.length) {
    naytaAlustusvirhe('Asiakaslista on tyhja. Aja db/seed.sql tietokantaan.');
    return;
  }

  // Täytä asiakas-selectit
  ['t1-asiakas','t2-asiakas','r2-asiakas','r4-asiakas'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = asiakkaat.map(a => `<option value="${a.id}">${a.nimi}</option>`).join('');
  });

  // Työkohde-selectit init
  ladaTyokohteet('t2'); ladaTyokohteet('r2'); ladaTyokohteet('r4');

  // R5 urakkatarjoukset
  const ut = await api('GET', '/urakkatarjoukset');
  if (ut.error) {
    naytaAlustusvirhe('Urakkatarjousten lataus epaonnistui. Tarkista tietokantayhteys.');
    return;
  }
  const r5 = document.getElementById('r5-urakka');
  r5.innerHTML = ut.filter(u => !u.hyvaksytty)
    .map(u => `<option value="${u.id}">${u.asiakas} — ${u.kohde} (${fmt(u.tyo_osuus + u.tarvike_osuus)})</option>`).join('');

  applyRoute(window.location.pathname);
  window.addEventListener('popstate', () => applyRoute(window.location.pathname));

  lataEtusivu();
  lataLaskut();
};

// ── Etusivu ───────────────────────────────────────────
async function lataEtusivu() {
  const laskut = await api('GET', '/laskut');
  const avoin = laskut.filter(l => l.tila === 'avoin').length;
  const myohassa = laskut.filter(l => l.tila === 'myohassa').length;
  const maksettu = laskut.filter(l => l.tila === 'maksettu').length;
  document.getElementById('stats').innerHTML = `
    <div class="stat-card"><div class="stat-number">${avoin}</div><div class="stat-label">Avoimia laskuja</div></div>
    <div class="stat-card"><div class="stat-number" style="color:#e24b4a">${myohassa}</div><div class="stat-label">Myöhässä</div></div>
    <div class="stat-card"><div class="stat-number" style="color:#1D9E75">${maksettu}</div><div class="stat-label">Maksettu</div></div>
  `;
  document.getElementById('etusivu-laskut').innerHTML = laskut.slice(0,8).map(l => `
    <tr>
      <td>#${l.id}</td><td>${l.asiakas}</td><td>${l.kohde}</td>
      <td class="text-right">${fmt(l.summa)}</td>
      <td>${l.erapvm ? l.erapvm.split('T')[0] : '-'}</td>
      <td>${badgeTila(l.tila)}</td>
    </tr>`).join('');
}

async function lataLaskut() {
  const laskut = await api('GET', '/laskut');
  document.getElementById('laskut-tbody').innerHTML = laskut.map(l => `
    <tr>
      <td>#${l.id}</td><td>${l.asiakas}</td><td>${l.kohde}</td>
      <td>${l.pvm ? l.pvm.split('T')[0] : '-'}</td>
      <td>${l.erapvm ? l.erapvm.split('T')[0] : '-'}</td>
      <td>${l.tyyppi}</td>
      <td class="text-right">${fmt(l.summa)}</td>
      <td>${badgeTila(l.tila)}</td>
      <td>${l.tila === 'avoin' || l.tila === 'myohassa'
        ? `<button class="btn btn-success btn-sm" onclick="merkkaaMaksetuksi(${l.id})">Maksettu</button>` : ''}</td>
    </tr>`).join('');
}

async function merkkaaMaksetuksi(id) {
  await api('PATCH', `/lasku/${id}/maksettu`);
  lataLaskut(); lataEtusivu();
}

// ── Apufunktiot ───────────────────────────────────────
async function ladaTyokohteet(prefix) {
  const asiakasEl = document.getElementById(prefix + '-asiakas');
  if (!asiakasEl) return;
  const kaikki = await api('GET', '/tyokohteet');
  const filtteroidut = kaikki.filter(tk => tk.asiakas_id == asiakasEl.value);
  const el = document.getElementById(prefix + '-tyokohde');
  if (el) el.innerHTML = filtteroidut.map(tk => `<option value="${tk.id}">${tk.osoite} — ${tk.kuvaus || ''}</option>`).join('');
  if (prefix === 'r2') ladaTyosuoritteet('r2');
}

async function ladaTyosuoritteet(prefix) {
  const tkEl = document.getElementById(prefix + '-tyokohde');
  if (!tkEl || !tkEl.value) return;
  const ts = await api('GET', `/tyosuoritteet?tyokohde_id=${tkEl.value}`);
  const el = document.getElementById(prefix + '-tyosuoritteet');
  if (el) el.innerHTML = ts.map(s => `
    <div class="rivi-lisays" style="margin-top:8px">
      <input type="checkbox" name="ts" value="${s.id}" id="ts-${s.id}">
      <label for="ts-${s.id}" style="display:inline;margin:0 0 0 8px">${s.pvm.split('T')[0]} — ${s.kuvaus || 'Käynti'}</label>
    </div>`).join('');
}

function tarvikeOptions() {
  return tarvikkeet.map(t => `<option value="${t.id}">${t.nimi} (${t.myyntihinta}€/${t.yksikko}, alv ${t.alv}%)</option>`).join('');
}

function lisaaTarvikeRivi(prefix) {
  const container = document.getElementById(prefix + '-tarvikkeet');
  const div = document.createElement('div');
  div.className = 'rivi-lisays';
  div.style.marginTop = '8px';
  div.innerHTML = `
    <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    <div class="grid3">
      <div><label>Tarvike</label><select class="tarv-id">${tarvikeOptions()}</select></div>
      <div><label>Määrä</label><input class="tarv-maara" type="number" min="0.1" step="0.1" value="1"></div>
      <div><label>Alennus %</label><input class="tarv-ale" type="number" min="0" max="100" value="0"></div>
    </div>`;
  container.appendChild(div);
}

function lisaaTuntityoRivi() {
  const container = document.getElementById('t2-tuntityot');
  const div = document.createElement('div');
  div.className = 'rivi-lisays';
  div.style.marginTop = '8px';
  div.innerHTML = `
    <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    <div class="grid3">
      <div><label>Tyyppi</label><select class="tt-tyyppi">
        ${tuntihinnoittelu.map(h => `<option value="${h.id}">${h.tyyppi} (${h.bruttohinta}€/h)</option>`).join('')}
      </select></div>
      <div><label>Tunnit</label><input class="tt-tunnit" type="number" min="0.5" step="0.5" value="1"></div>
      <div><label>Alennus %</label><input class="tt-ale" type="number" min="0" max="100" value="0"></div>
    </div>`;
  container.appendChild(div);
}

// ── T1 ────────────────────────────────────────────────
async function lisaaTyokohde() {
  const data = {
    asiakas_id: document.getElementById('t1-asiakas').value,
    osoite: document.getElementById('t1-osoite').value,
    kuvaus: document.getElementById('t1-kuvaus').value,
  };
  if (!data.osoite) return msg('t1-msg', 'Osoite on pakollinen', 'error');
  const r = await api('POST', '/t1/tyokohde', data);
  if (r.error) return msg('t1-msg', r.error, 'error');
  msg('t1-msg', `Työkohde lisätty! ID: ${r.id}, osoite: ${r.osoite}`);
  document.getElementById('t1-osoite').value = '';
  document.getElementById('t1-kuvaus').value = '';
}

// ── T2 ────────────────────────────────────────────────
async function tallennaTyosuorite() {
  const tuntityot = [...document.querySelectorAll('#t2-tuntityot .rivi-lisays')].map(div => ({
    tuntihinnoittelu_id: div.querySelector('.tt-tyyppi').value,
    tunnit: div.querySelector('.tt-tunnit').value,
    alennus: div.querySelector('.tt-ale').value,
  }));
  const tarvikkeet2 = [...document.querySelectorAll('#t2-tarvikkeet .rivi-lisays')].map(div => ({
    tarvike_id: div.querySelector('.tarv-id').value,
    maara: div.querySelector('.tarv-maara').value,
    alennus: div.querySelector('.tarv-ale').value,
  }));
  const data = {
    tyokohde_id: document.getElementById('t2-tyokohde').value,
    pvm: document.getElementById('t2-pvm').value || new Date().toISOString().split('T')[0],
    kuvaus: document.getElementById('t2-kuvaus').value,
    tuntityot, tarvikkeet: tarvikkeet2,
  };
  const r = await api('POST', '/t2/tyosuorite', data);
  if (r.error) return msg('t2-msg', r.error, 'error');
  msg('t2-msg', `Työsuorite tallennettu! ID: ${r.tyosuorite_id}`);
  document.getElementById('t2-tuntityot').innerHTML = '';
  document.getElementById('t2-tarvikkeet').innerHTML = '';
}

// ── T3 ────────────────────────────────────────────────
async function luoMuistutuslaskut() {
  const r = await api('POST', '/t3/muistutus');
  if (r.error) return;
  document.getElementById('t3-tulos').innerHTML = r.luodut_laskut === 0
    ? '<div class="alert alert-info">Ei muistutuslaskuja luotavana.</div>'
    : `<div class="alert alert-success">Luotu ${r.luodut_laskut} muistutuslasku(a).</div>
       <table><thead><tr><th>#</th><th>Kohde</th><th>Summa</th><th>Eräpäivä</th></tr></thead>
       <tbody>${r.laskut.map(l => `<tr><td>#${l.id}</td><td>${l.tyokohde_id}</td><td>${fmt(l.summa)}</td><td>${l.erapvm.split('T')[0]}</td></tr>`).join('')}</tbody></table>`;
  lataLaskut();
}

// ── T5 ────────────────────────────────────────────────
async function paivitaXml() {
  const xml = document.getElementById('t5-xml').value;
  const r = await api('POST', '/t5/xml', { xml });
  document.getElementById('t5-tulos').innerHTML = r.error
    ? `<div class="alert alert-error">${r.error}</div>`
    : `<div class="alert alert-success">Hinnasto päivitetty! Toimittaja: ${r.toimittaja}, päivitetty ${r.paivitetty} tarviketta, poistettu ${r.poistettu || 0} vanhaa tarviketta.</div>`;
}

// ── R1 ────────────────────────────────────────────────
async function laskeHintaArvio() {
  const tarvArvio = [...document.querySelectorAll('#r1-tarvikkeet .rivi-lisays')].map(div => ({
    tarvike_id: div.querySelector('.tarv-id').value,
    maara: div.querySelector('.tarv-maara').value,
  }));
  const r = await api('POST', '/r1/hinta-arvio', {
    suunnittelu: document.getElementById('r1-suunnittelu').value,
    tyo: document.getElementById('r1-tyo').value,
    aputyo: document.getElementById('r1-aputyo').value,
    tarvikkeet: tarvArvio,
  });
  document.getElementById('r1-tulos').innerHTML = `
    <div class="lasku-box">
      <h2>Hinta-arvio</h2>
      <table><thead><tr><th>Kuvaus</th><th>Määrä</th><th>Yksikköhinta</th><th>Alv %</th><th class="text-right">Yhteensä</th></tr></thead>
      <tbody>${r.rivit.map(rv => `<tr>
        <td>${rv.kuvaus}</td><td>${rv.maara}</td>
        <td>${fmt(rv.yksikkohinta)}</td><td>${rv.alv}%</td>
        <td class="text-right">${fmt(rv.brutto)}</td>
      </tr>`).join('')}</tbody></table>
      <hr class="divider">
      <div class="lasku-total">Yhteensä: ${fmt(r.yhteensa)}</div>
      <div style="text-align:right;color:#666;font-size:13px">Kotitalousvähennyskelpoinen: ${fmt(r.kotitalousvahennys)}</div>
    </div>`;
}

// ── R2 ────────────────────────────────────────────────
async function luoTuntityolasku() {
  const valitut = [...document.querySelectorAll('#r2-tyosuoritteet input[name="ts"]:checked')].map(c => c.value);
  if (!valitut.length) return alert('Valitse vähintään yksi työsuorite');
  const r = await api('POST', '/r2/tuntityolasku', {
    tyokohde_id: document.getElementById('r2-tyokohde').value,
    tyosuorite_idt: valitut,
    erapvm: document.getElementById('r2-erapvm').value,
  });
  if (r.error) return;
  naytaLaskuTulos('r2-tulos', r);
}

function naytaLaskuTulos(containerId, r) {
  document.getElementById(containerId).innerHTML = `
    <div class="lasku-box">
      <div class="lasku-header">
        <div><strong>Laskutusjarjestelma</strong></div>
        <div style="text-align:right">
          <strong>Lasku #${r.lasku_id}</strong><br>
          Asiakas: ${r.asiakas.asiakas_nimi}<br>
          Kohde: ${r.asiakas.osoite}<br>
          ${r.asiakas.email || ''}
        </div>
      </div>
      <table>
        <thead><tr><th>Kuvaus</th><th>Määrä</th><th>Yksikköhinta</th><th>Ale%</th><th>Alv%</th><th>Netto</th><th class="text-right">Brutto</th><th>KV</th></tr></thead>
        <tbody>${r.rivit.map(rv => `<tr>
          <td>${rv.kuvaus}</td>
          <td>${rv.maara}</td>
          <td>${fmt(rv.yh)}</td>
          <td>${rv.ale}%</td>
          <td>${rv.alv}%</td>
          <td>${fmt(rv.netto)}</td>
          <td class="text-right">${fmt(rv.netto + rv.alvSumma)}</td>
          <td>${rv.kotivah ? '✓' : ''}</td>
        </tr>`).join('')}</tbody>
      </table>
      <hr class="divider">
      <div class="lasku-total">Yhteensä: ${fmt(r.summa)}</div>
      <div style="text-align:right;color:#666;font-size:13px">Kotitalousvähennyskelpoinen: ${fmt(r.kotitalous_vahennys)}</div>
    </div>`;
}

// ── R3 ────────────────────────────────────────────────
async function haeLasku() {
  const id = document.getElementById('r3-lasku-id').value;
  const r = await api('GET', `/lasku/${id}`);
  if (!r.lasku) return document.getElementById('r3-tulos').innerHTML = '<div class="alert alert-error">Laskua ei löydy</div>';
  const l = r.lasku;
  const rivit = r.rivit;
  const summa = rivit.reduce((s, rv) => {
    const netto = rv.yksikkohinta * rv.maara * (1 - rv.alennus_prosentti / 100);
    return s + netto * (1 + rv.alv_prosentti / 100);
  }, 0);
  const kotivah = rivit.filter(rv => rv.kotitalousvahennys_kelpoinen).reduce((s, rv) => {
    const netto = rv.yksikkohinta * rv.maara * (1 - rv.alennus_prosentti / 100);
    return s + netto * (1 + rv.alv_prosentti / 100);
  }, 0);
  document.getElementById('r3-tulos').innerHTML = `
    <div class="lasku-box">
      <div class="lasku-header">
        <div><strong>${l.asiakas_nimi}</strong><br>${l.asiakas_osoite || ''}<br>${l.email || ''}</div>
        <div style="text-align:right"><strong>Lasku #${l.id}</strong><br>Pvm: ${l.pvm.split('T')[0]}<br>Eräpäivä: ${l.erapvm.split('T')[0]}<br>${badgeTila(l.tila)}</div>
      </div>
      <p><strong>Kohde:</strong> ${l.kohde_osoite}</p>
      <table>
        <thead><tr><th>Kuvaus</th><th>Määrä</th><th>Yksikköhinta</th><th>Alennus</th><th>Alv%</th><th class="text-right">Yhteensä (sis. alv)</th></tr></thead>
        <tbody>${rivit.map(rv => {
          const netto = +(rv.yksikkohinta * rv.maara * (1 - rv.alennus_prosentti / 100)).toFixed(2);
          const brutto = +(netto * (1 + rv.alv_prosentti / 100)).toFixed(2);
          return `<tr>
            <td>${rv.kuvaus}</td><td>${rv.maara}</td>
            <td>${fmt(rv.yksikkohinta)}</td>
            <td>${rv.alennus_prosentti > 0 ? rv.alennus_prosentti + '%' : '-'}</td>
            <td>${rv.alv_prosentti}%</td>
            <td class="text-right">${fmt(brutto)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <hr class="divider">
      <div class="lasku-total">Yhteensä: ${fmt(summa)}</div>
      ${l.laskutuslisa > 0 ? `<div style="text-align:right;color:#888">+ Laskutuslisä: ${fmt(l.laskutuslisa)}</div>` : ''}
      ${l.viivastyskorko > 0 ? `<div style="text-align:right;color:#888">+ Viivästyskorko: ${fmt(l.viivastyskorko)}</div>` : ''}
      <div style="text-align:right;color:#666;font-size:13px;margin-top:8px">Kotitalousvähennyskelpoinen: ${fmt(kotivah)}</div>
    </div>`;
}

// ── R4 ────────────────────────────────────────────────
async function luoUrakkatarjous() {
  const tarvLista = [...document.querySelectorAll('#r4-tarvikkeet .rivi-lisays')].map(div => ({
    tarvike_id: div.querySelector('.tarv-id').value,
    maara: div.querySelector('.tarv-maara').value,
    yksikkohinta: tarvikkeet.find(t => t.id == div.querySelector('.tarv-id').value)?.myyntihinta || 0,
  }));
  const r = await api('POST', '/r4/urakkatarjous', {
    tyokohde_id: document.getElementById('r4-tyokohde').value,
    tyo_osuus: document.getElementById('r4-tyo').value,
    tarvike_osuus: document.getElementById('r4-tarvike').value,
    alennus: document.getElementById('r4-alennus').value,
    tarvikkeet: tarvLista,
  });
  if (r.error) return msg('r4-msg', r.error, 'error');
  const ut = r.urakkatarjous;
  const tyoNetto = +(ut.tyo_osuus * (1 - ut.alennus / 100)).toFixed(2);
  const tarvNetto = +(ut.tarvike_osuus * (1 - ut.alennus / 100)).toFixed(2);
  const tyoAlv = +(tyoNetto * ut.alv / 100).toFixed(2);
  const tarvAlv = +(tarvNetto * ut.alv / 100).toFixed(2);
  const kokonaissumma = +(tyoNetto + tarvNetto + tyoAlv + tarvAlv).toFixed(2);
  document.getElementById('r4-tulos').innerHTML = `
    <div class="lasku-box">
      <h2>Urakkatarjous #${ut.id}</h2>
      <p><strong>Asiakas:</strong> ${r.asiakas.asiakas_nimi} | <strong>Kohde:</strong> ${r.asiakas.osoite}</p>
      ${ut.korotus > 0 ? `<div class="alert alert-error">Hinnankorotus ${ut.korotus}% asiakkaan maksutietojen perusteella</div>` : ''}
      <table>
        <thead><tr><th>Erä</th><th>Netto</th><th>Alennus</th><th>Alv (${ut.alv}%)</th><th class="text-right">Brutto</th></tr></thead>
        <tbody>
          <tr><td>Työn osuus</td><td>${fmt(ut.tyo_osuus)}</td><td>${ut.alennus}%</td><td>${fmt(tyoAlv)}</td><td class="text-right">${fmt(tyoNetto + tyoAlv)}</td></tr>
          <tr><td>Tarvikkeiden osuus</td><td>${fmt(ut.tarvike_osuus)}</td><td>${ut.alennus}%</td><td>${fmt(tarvAlv)}</td><td class="text-right">${fmt(tarvNetto + tarvAlv)}</td></tr>
        </tbody>
      </table>
      <hr class="divider">
      <div class="lasku-total">Kokonaissumma: ${fmt(kokonaissumma)}</div>
      <h2 style="margin-top:16px">Tarvikeluettelo</h2>
      <table><thead><tr><th>Tarvike</th><th>Määrä</th><th>Yksikköhinta</th></tr></thead>
      <tbody>${r.tarvikkeet.map(t => `<tr><td>${t.nimi}</td><td>${t.maara}</td><td>${fmt(t.yksikkohinta)}</td></tr>`).join('')}</tbody></table>
    </div>`;
}

// ── R5 ────────────────────────────────────────────────
async function hyvaksyUrakka() {
  const id = document.getElementById('r5-urakka').value;
  if (!id) return;
  const r = await api('POST', '/r5/hyvaksy', { urakkatarjous_id: id });
  document.getElementById('r5-tulos').innerHTML = r.error
    ? `<div class="alert alert-error">${r.error}</div>`
    : `<div class="alert alert-success">
        Urakka hyväksytty! Luotu 2 laskua:<br>
        Lasku #${r.lasku1} — heti (${fmt(r.summa_per_lasku)})<br>
        Lasku #${r.lasku2} — ensi vuoden tammikuu (${fmt(r.summa_per_lasku)})
      </div>`;
  lataLaskut();
}

// ── R6 ────────────────────────────────────────────────
async function haeTurvallisuusRaportti() {
  const nimi = document.getElementById('r6-toimittaja').value;
  const r = await api('GET', `/r6/turvallisuus?toimittaja_nimi=${encodeURIComponent(nimi)}`);
  document.getElementById('r6-tulos').innerHTML = `
    <div class="lasku-box">
      <div class="alert alert-error">⚠ Turvallisuusraportti — Toimittaja: ${r.toimittaja}</div>
      ${r.rivit.length === 0 ? '<p>Ei toimituksia löydetty.</p>' : `
      <table>
        <thead><tr><th>Asiakas</th><th>Kohde</th><th>Tarvike</th><th>Määrä</th><th>Pvm</th></tr></thead>
        <tbody>${r.rivit.map(rv => `<tr>
          <td>${rv.asiakas}</td><td>${rv.kohde}</td>
          <td>${rv.tarvike}</td><td>${rv.maara}</td>
          <td>${rv.pvm.split('T')[0]}</td>
        </tr>`).join('')}</tbody>
      </table>`}
    </div>`;
}
