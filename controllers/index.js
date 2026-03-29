const db = require('../db');
const xml2js = require('xml2js');

// ── ASIAKKAAT ──────────────────────────────────────────
exports.getAsiakkaat = async (req, res) => {
  const result = await db.query('SELECT * FROM Asiakas ORDER BY nimi');
  res.json(result.rows);
};

exports.getTyokohteet = async (req, res) => {
  const result = await db.query(
    `SELECT tk.*, a.nimi as asiakas_nimi FROM Tyokohde tk
     JOIN Asiakas a ON a.id = tk.asiakas_id ORDER BY a.nimi`
  );
  res.json(result.rows);
};

// ── T1: Uusi työkohde ─────────────────────────────────
exports.lisaaTyokohde = async (req, res) => {
  try {
    const { asiakas_id, osoite, kuvaus } = req.body;
    const asiakasId = Number(asiakas_id);

    if (!Number.isInteger(asiakasId) || !osoite || !osoite.trim()) {
      return res.status(400).json({ error: 'Puuttuvia tai virheellisia kenttia' });
    }

    const asiakas = await db.query('SELECT id FROM Asiakas WHERE id = $1', [asiakasId]);
    if (asiakas.rows.length === 0) {
      return res.status(400).json({ error: 'Asiakasta ei loydy' });
    }

    const result = await db.query(
      'INSERT INTO Tyokohde (asiakas_id, osoite, kuvaus) VALUES ($1, $2, $3) RETURNING *',
      [asiakasId, osoite.trim(), kuvaus || null]
    );

    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── T2: Tuntityöt ja tarvikkeet ──────────────────────
exports.lisaaTyosuorite = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { tyokohde_id, pvm, kuvaus, tuntityot, tarvikkeet } = req.body;

    const ts = await client.query(
      'INSERT INTO Tyosuorite (tyokohde_id, pvm, kuvaus) VALUES ($1, $2, $3) RETURNING id',
      [tyokohde_id, pvm, kuvaus]
    );
    const tsId = ts.rows[0].id;

    for (const tt of (tuntityot || [])) {
      const h = await client.query(
        'SELECT bruttohinta, alv FROM Tuntihinnoittelu WHERE id = $1',
        [tt.tuntihinnoittelu_id]
      );
      const netto = h.rows[0].bruttohinta / (1 + h.rows[0].alv / 100);
      await client.query(
        'INSERT INTO Tuntityo (tyosuorite_id, tuntihinnoittelu_id, tunnit, yksikkohinta, alennus) VALUES ($1,$2,$3,$4,$5)',
        [tsId, tt.tuntihinnoittelu_id, tt.tunnit, netto.toFixed(2), tt.alennus || 0]
      );
    }

    for (const t of (tarvikkeet || [])) {
      await client.query(
        'INSERT INTO TyosuoriteTarvike (tyosuorite_id, tarvike_id, maara, alennus) VALUES ($1,$2,$3,$4)',
        [tsId, t.tarvike_id, t.maara, t.alennus || 0]
      );
      await client.query(
        'UPDATE Tarvike SET varastomaara = varastomaara - $1 WHERE id = $2',
        [t.maara, t.tarvike_id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, tyosuorite_id: tsId });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// ── T3: Muistutuslasku ────────────────────────────────
exports.luoMuistutuslaskut = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const eraantyneet = await client.query(
      `SELECT l.* FROM Lasku l
       WHERE l.tila = 'avoin'
       AND l.erapvm < CURRENT_DATE
       AND l.tyyppi = 'normaali'
       AND NOT EXISTS (
         SELECT 1 FROM Lasku m WHERE m.alkuperainen_lasku_id = l.id
       )`
    );

    const luodut = [];
    for (const lasku of eraantyneet.rows) {
      const paivat = Math.floor((new Date() - new Date(lasku.erapvm)) / (1000 * 60 * 60 * 24));
      const viivkorko = +(lasku.summa * 0.16 * paivat / 365).toFixed(2);
      const laskutuslisa = 5.00;
      const uusiSumma = +(lasku.summa + viivkorko + laskutuslisa).toFixed(2);
      const erapvm = new Date();
      erapvm.setDate(erapvm.getDate() + 14);

      const uusi = await client.query(
        `INSERT INTO Lasku (tyokohde_id, alkuperainen_lasku_id, pvm, erapvm, tila, tyyppi,
          lasku_numero, laskutuslisa, viivastyskorko, kotitalous_vahennys, summa)
         VALUES ($1,$2,CURRENT_DATE,$3,'avoin','muistutus',2,$4,$5,$6,$7) RETURNING *`,
        [lasku.tyokohde_id, lasku.id, erapvm.toISOString().split('T')[0],
         laskutuslisa, viivkorko, lasku.kotitalous_vahennys, uusiSumma]
      );

      await client.query(
        `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi)
         SELECT $1, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi
         FROM Laskurivi WHERE lasku_id = $2`,
        [uusi.rows[0].id, lasku.id]
      );

      await client.query('UPDATE Lasku SET tila = $1 WHERE id = $2', ['myohassa', lasku.id]);
      luodut.push(uusi.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ luodut_laskut: luodut.length, laskut: luodut });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// ── T5: XML-hinnasto ──────────────────────────────────
exports.paivitaXmlHinnasto = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const xmlData = req.body.xml;
    const parsed = await xml2js.parseStringPromise(xmlData);
    const toimittajaNimi = parsed.tarvikkeet.toimittaja[0].toim_nimi[0];

    let toimittaja = await client.query('SELECT id FROM Toimittaja WHERE nimi = $1', [toimittajaNimi]);
    let toimittajaId;
    if (toimittaja.rows.length === 0) {
      const t = await client.query('INSERT INTO Toimittaja (nimi) VALUES ($1) RETURNING id', [toimittajaNimi]);
      toimittajaId = t.rows[0].id;
    } else {
      toimittajaId = toimittaja.rows[0].id;
    }

    const tarvikkeet = parsed.tarvikkeet.tarvike || [];
    for (const t of tarvikkeet) {
      const ttiedot = t.ttiedot[0];
      const nimi = ttiedot.nimi[0];
      const merkki = ttiedot.merkki[0];
      const hinta = parseFloat(ttiedot.hinta[0]);
      const yksikko = ttiedot.yksikko[0];

      const olemassa = await client.query(
        'SELECT * FROM Tarvike WHERE nimi = $1 AND toimittaja_id = $2',
        [nimi, toimittajaId]
      );

      if (olemassa.rows.length > 0) {
        const vanha = olemassa.rows[0];
        await client.query(
          `INSERT INTO TarvikeHistoria (tarvike_id, nimi, merkki, ostohinta, myyntihinta, alv, pvm_alku, pvm_loppu)
           VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE)`,
          [vanha.id, vanha.nimi, vanha.merkki, vanha.ostohinta, vanha.myyntihinta, vanha.alv,
           new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]]
        );
        await client.query(
          'UPDATE Tarvike SET ostohinta=$1, myyntihinta=$2, merkki=$3 WHERE id=$4',
          [hinta, +(hinta * 1.25).toFixed(2), merkki, vanha.id]
        );
      } else {
        await client.query(
          `INSERT INTO Tarvike (toimittaja_id, nimi, merkki, ostohinta, yksikko, varastomaara, myyntihinta, alv)
           VALUES ($1,$2,$3,$4,$5,0,$6,24)`,
          [toimittajaId, nimi, merkki, hinta, yksikko.includes('m') ? 'metri' : 'kpl',
           +(hinta * 1.25).toFixed(2)]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, toimittaja: toimittajaNimi, paivitetty: tarvikkeet.length });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// ── R1: Hinta-arvio ───────────────────────────────────
exports.hintaArvio = async (req, res) => {
  const { suunnittelu, tyo, aputyo, tarvikkeet } = req.body;
  const hinnat = await db.query('SELECT * FROM Tuntihinnoittelu');
  const h = {};
  hinnat.rows.forEach(r => h[r.tyyppi] = { brutto: +r.bruttohinta, alv: +r.alv });

  const netto = (brutto, alv) => brutto / (1 + alv / 100);
  const rivit = [];

  if (+suunnittelu > 0) {
    const yh = netto(h.suunnittelu.brutto, h.suunnittelu.alv);
    rivit.push({ kuvaus: 'Suunnittelu', maara: +suunnittelu, yksikkohinta: yh,
      alv: h.suunnittelu.alv, netto: yh * suunnittelu,
      brutto: h.suunnittelu.brutto * suunnittelu, kotivah: true });
  }
  if (+tyo > 0) {
    const yh = netto(h.tyo.brutto, h.tyo.alv);
    rivit.push({ kuvaus: 'Työ', maara: +tyo, yksikkohinta: yh,
      alv: h.tyo.alv, netto: yh * tyo,
      brutto: h.tyo.brutto * tyo, kotivah: true });
  }
  if (+aputyo > 0) {
    const yh = netto(h.aputyo.brutto, h.aputyo.alv);
    rivit.push({ kuvaus: 'Aputyö', maara: +aputyo, yksikkohinta: yh,
      alv: h.aputyo.alv, netto: yh * aputyo,
      brutto: h.aputyo.brutto * aputyo, kotivah: true });
  }

  for (const t of (tarvikkeet || [])) {
    const tr = await db.query('SELECT * FROM Tarvike WHERE id = $1', [t.tarvike_id]);
    if (tr.rows.length === 0) continue;
    const tarv = tr.rows[0];
    const alvKerroin = 1 + tarv.alv / 100;
    rivit.push({ kuvaus: tarv.nimi, maara: +t.maara, yksikkohinta: +tarv.myyntihinta,
      alv: +tarv.alv, netto: tarv.myyntihinta * t.maara,
      brutto: tarv.myyntihinta * alvKerroin * t.maara, kotivah: false });
  }

  const yhteensa = rivit.reduce((s, r) => s + r.brutto, 0);
  const kotivah = rivit.filter(r => r.kotivah).reduce((s, r) => s + r.brutto, 0);
  res.json({ rivit, yhteensa: +yhteensa.toFixed(2), kotitalousvahennys: +kotivah.toFixed(2) });
};

// ── R2: Tuntityölasku ─────────────────────────────────
exports.luoTuntityolasku = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { tyokohde_id, tyosuorite_idt, erapvm } = req.body;

    const tk = await client.query(
      `SELECT tk.*, a.nimi as asiakas_nimi, a.osoite as asiakas_osoite, a.email, a.puhelin
       FROM Tyokohde tk JOIN Asiakas a ON a.id = tk.asiakas_id WHERE tk.id = $1`, [tyokohde_id]);

    const lasku = await client.query(
      `INSERT INTO Lasku (tyokohde_id, pvm, erapvm, tila, tyyppi, lasku_numero, summa, kotitalous_vahennys)
       VALUES ($1, CURRENT_DATE, $2, 'avoin', 'normaali', 1, 0, 0) RETURNING id`,
      [tyokohde_id, erapvm]
    );
    const laskuId = lasku.rows[0].id;
    const rivit = [];

    for (const tsId of tyosuorite_idt) {
      const tuntityot = await client.query(
        `SELECT tt.*, th.tyyppi, th.bruttohinta, th.alv
         FROM Tuntityo tt JOIN Tuntihinnoittelu th ON th.id = tt.tuntihinnoittelu_id
         WHERE tt.tyosuorite_id = $1`, [tsId]);

      for (const tt of tuntityot.rows) {
        const netto = +(tt.yksikkohinta * tt.tunnit * (1 - tt.alennus / 100)).toFixed(2);
        const alvSumma = +(netto * tt.alv / 100).toFixed(2);
        await client.query(
          `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
           VALUES ($1,$2,$3,$4,$5,$6,'tuntityo',TRUE)`,
          [laskuId, tt.tyyppi, tt.tunnit, tt.yksikkohinta, tt.alennus, tt.alv]
        );
        rivit.push({ kuvaus: tt.tyyppi, maara: tt.tunnit, yh: tt.yksikkohinta,
          ale: tt.alennus, alv: tt.alv, netto, alvSumma, kotivah: true });
      }

      const tarvikkeet = await client.query(
        `SELECT tst.*, t.nimi, t.myyntihinta, t.alv
         FROM TyosuoriteTarvike tst JOIN Tarvike t ON t.id = tst.tarvike_id
         WHERE tst.tyosuorite_id = $1`, [tsId]);

      for (const t of tarvikkeet.rows) {
        const netto = +(t.myyntihinta * t.maara * (1 - t.alennus / 100)).toFixed(2);
        const alvSumma = +(netto * t.alv / 100).toFixed(2);
        await client.query(
          `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
           VALUES ($1,$2,$3,$4,$5,$6,'tarvike',FALSE)`,
          [laskuId, t.nimi, t.maara, t.myyntihinta, t.alennus, t.alv]
        );
        rivit.push({ kuvaus: t.nimi, maara: t.maara, yh: t.myyntihinta,
          ale: t.alennus, alv: t.alv, netto, alvSumma, kotivah: false });
      }
    }

    const summa = rivit.reduce((s, r) => s + r.netto + r.alvSumma, 0);
    const kotivah = rivit.filter(r => r.kotivah).reduce((s, r) => s + r.netto + r.alvSumma, 0);
    await client.query('UPDATE Lasku SET summa=$1, kotitalous_vahennys=$2 WHERE id=$3',
      [+summa.toFixed(2), +kotivah.toFixed(2), laskuId]);
    await client.query('COMMIT');

    res.json({ lasku_id: laskuId, asiakas: tk.rows[0], rivit,
      summa: +summa.toFixed(2), kotitalous_vahennys: +kotivah.toFixed(2) });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// ── R3: Lasku alennuksilla ────────────────────────────
exports.getLaskunTiedot = async (req, res) => {
  const { id } = req.params;
  const lasku = await db.query(
    `SELECT l.*, tk.osoite as kohde_osoite, a.nimi as asiakas_nimi,
            a.osoite as asiakas_osoite, a.email, a.puhelin
     FROM Lasku l
     JOIN Tyokohde tk ON tk.id = l.tyokohde_id
     JOIN Asiakas a ON a.id = tk.asiakas_id
     WHERE l.id = $1`, [id]);
  const rivit = await db.query('SELECT * FROM Laskurivi WHERE lasku_id = $1 ORDER BY id', [id]);
  res.json({ lasku: lasku.rows[0], rivit: rivit.rows });
};

// ── R4: Urakkatarjous ─────────────────────────────────
exports.luoUrakkatarjous = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { tyokohde_id, tyo_osuus, tarvike_osuus, alennus, tarvikkeet } = req.body;

    const ut = await client.query(
      `INSERT INTO Urakkatarjous (tyokohde_id, tyo_osuus, tarvike_osuus, alennus, alv, pvm)
       VALUES ($1,$2,$3,$4,24,CURRENT_DATE) RETURNING *`,
      [tyokohde_id, tyo_osuus, tarvike_osuus, alennus || 0]
    );
    const utId = ut.rows[0].id;

    for (const t of (tarvikkeet || [])) {
      await client.query(
        'INSERT INTO UrakkatarjousTarvike (urakkatarjous_id, tarvike_id, maara, yksikkohinta) VALUES ($1,$2,$3,$4)',
        [utId, t.tarvike_id, t.maara, t.yksikkohinta]
      );
    }

    const tk = await client.query(
      `SELECT tk.*, a.nimi as asiakas_nimi, a.osoite as asiakas_osoite
       FROM Tyokohde tk JOIN Asiakas a ON a.id = tk.asiakas_id WHERE tk.id = $1`, [tyokohde_id]);
    const tarv = await client.query(
      `SELECT utt.*, t.nimi FROM UrakkatarjousTarvike utt JOIN Tarvike t ON t.id = utt.tarvike_id
       WHERE utt.urakkatarjous_id = $1`, [utId]);

    await client.query('COMMIT');
    res.json({ urakkatarjous: ut.rows[0], asiakas: tk.rows[0], tarvikkeet: tarv.rows });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// ── R5: Hyväksy urakka ────────────────────────────────
exports.hyvaksyUrakka = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { urakkatarjous_id } = req.body;

    const ut = await client.query('SELECT * FROM Urakkatarjous WHERE id = $1', [urakkatarjous_id]);
    if (!ut.rows.length) throw new Error('Urakkatarjousta ei löydy');
    const u = ut.rows[0];

    const tyoNetto = +(u.tyo_osuus * (1 - u.alennus / 100)).toFixed(2);
    const tarvNetto = +(u.tarvike_osuus * (1 - u.alennus / 100)).toFixed(2);
    const alvSumma = +((tyoNetto + tarvNetto) * u.alv / 100).toFixed(2);
    const kokonaissumma = +(tyoNetto + tarvNetto + alvSumma).toFixed(2);
    const eraLasku = +(kokonaissumma / 2).toFixed(2);

    const erapvm1 = new Date();
    erapvm1.setDate(erapvm1.getDate() + 30);

    const l1 = await client.query(
      `INSERT INTO Lasku (tyokohde_id, pvm, erapvm, tila, tyyppi, lasku_numero, summa, kotitalous_vahennys)
       VALUES ($1, CURRENT_DATE, $2, 'avoin', 'normaali', 1, $3, $4) RETURNING id`,
      [u.tyokohde_id, erapvm1.toISOString().split('T')[0], eraLasku,
       +((tyoNetto + tyoNetto * u.alv / 100) / 2).toFixed(2)]
    );
    await client.query('INSERT INTO UrakkaLasku (urakkatarjous_id, lasku_id) VALUES ($1,$2)',
      [urakkatarjous_id, l1.rows[0].id]);
    await client.query(
      `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
       VALUES ($1,'Työn osuus (1/2)',1,$2,$3,24,'urakka_tyo',TRUE)`,
      [l1.rows[0].id, +(tyoNetto / 2).toFixed(2), u.alennus]
    );
    await client.query(
      `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
       VALUES ($1,'Tarvikkeiden osuus (1/2)',1,$2,$3,24,'urakka_tarvike',FALSE)`,
      [l1.rows[0].id, +(tarvNetto / 2).toFixed(2), u.alennus]
    );

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    nextYear.setMonth(0); nextYear.setDate(1);
    const erapvm2 = new Date(nextYear);
    erapvm2.setDate(erapvm2.getDate() + 30);

    const l2 = await client.query(
      `INSERT INTO Lasku (tyokohde_id, pvm, erapvm, tila, tyyppi, lasku_numero, summa, kotitalous_vahennys)
       VALUES ($1, $2, $3, 'avoin', 'normaali', 1, $4, $5) RETURNING id`,
      [u.tyokohde_id, nextYear.toISOString().split('T')[0],
       erapvm2.toISOString().split('T')[0], eraLasku,
       +((tyoNetto + tyoNetto * u.alv / 100) / 2).toFixed(2)]
    );
    await client.query('INSERT INTO UrakkaLasku (urakkatarjous_id, lasku_id) VALUES ($1,$2)',
      [urakkatarjous_id, l2.rows[0].id]);
    await client.query(
      `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
       VALUES ($1,'Työn osuus (2/2)',1,$2,$3,24,'urakka_tyo',TRUE)`,
      [l2.rows[0].id, +(tyoNetto / 2).toFixed(2), u.alennus]
    );
    await client.query(
      `INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
       VALUES ($1,'Tarvikkeiden osuus (2/2)',1,$2,$3,24,'urakka_tarvike',FALSE)`,
      [l2.rows[0].id, +(tarvNetto / 2).toFixed(2), u.alennus]
    );

    await client.query('UPDATE Urakkatarjous SET hyvaksytty=TRUE WHERE id=$1', [urakkatarjous_id]);
    await client.query('COMMIT');
    res.json({ success: true, lasku1: l1.rows[0].id, lasku2: l2.rows[0].id, summa_per_lasku: eraLasku });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// ── R6: Turvallisuusraportti ──────────────────────────
exports.turvallisuusRaportti = async (req, res) => {
  const { toimittaja_nimi } = req.query;
  const nimi = toimittaja_nimi || 'Junk Co';
  const result = await db.query(
    `SELECT a.nimi as asiakas, tk.osoite as kohde, t.nimi as tarvike,
            tst.maara, tm.nimi as toimittaja, ts.pvm
     FROM TyosuoriteTarvike tst
     JOIN Tarvike t ON t.id = tst.tarvike_id
     JOIN Toimittaja tm ON tm.id = t.toimittaja_id
     JOIN Tyosuorite ts ON ts.id = tst.tyosuorite_id
     JOIN Tyokohde tk ON tk.id = ts.tyokohde_id
     JOIN Asiakas a ON a.id = tk.asiakas_id
     WHERE tm.nimi = $1
     ORDER BY a.nimi, ts.pvm`, [nimi]
  );
  res.json({ toimittaja: nimi, rivit: result.rows });
};

// ── Tarvikkeet ja Tuntihinnoittelu ───────────────────────────────
exports.getTarvikkeet = async (req, res) => {
  const result = await db.query('SELECT t.*, tm.nimi as toimittaja FROM Tarvike t JOIN Toimittaja tm ON tm.id = t.toimittaja_id ORDER BY t.nimi');
  res.json(result.rows);
};

exports.getTuntihinnoittelu = async (req, res) => {
  const result = await db.query('SELECT * FROM Tuntihinnoittelu ORDER BY id');
  res.json(result.rows);
};

exports.getLaskut = async (req, res) => {
  const result = await db.query(
    `SELECT l.*, tk.osoite as kohde, a.nimi as asiakas
     FROM Lasku l JOIN Tyokohde tk ON tk.id = l.tyokohde_id
     JOIN Asiakas a ON a.id = tk.asiakas_id ORDER BY l.pvm DESC`
  );
  res.json(result.rows);
};

exports.getUrakkatarjoukset = async (req, res) => {
  const result = await db.query(
    `SELECT ut.*, tk.osoite as kohde, a.nimi as asiakas
     FROM Urakkatarjous ut JOIN Tyokohde tk ON tk.id = ut.tyokohde_id
     JOIN Asiakas a ON a.id = tk.asiakas_id ORDER BY ut.pvm DESC`
  );
  res.json(result.rows);
};

exports.getTyosuoritteet = async (req, res) => {
  const { tyokohde_id } = req.query;
  const result = await db.query(
    'SELECT * FROM Tyosuorite WHERE tyokohde_id = $1 ORDER BY pvm DESC',
    [tyokohde_id]
  );
  res.json(result.rows);
};

exports.merkkaaMaksetuksi = async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE Lasku SET tila='maksettu', maksettu_pvm=CURRENT_DATE WHERE id=$1", [id]
  );
  res.json({ success: true });
};
