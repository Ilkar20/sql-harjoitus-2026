const express = require('express');
const router = express.Router();
const c = require('../controllers');

// Apudata
router.get('/asiakkaat', c.getAsiakkaat);
router.get('/tyokohteet', c.getTyokohteet);
router.get('/tarvikkeet', c.getTarvikkeet);
router.get('/tuntihinnoittelu', c.getTuntihinnoittelu);
router.get('/laskut', c.getLaskut);
router.get('/urakkatarjoukset', c.getUrakkatarjoukset);
router.get('/tyosuoritteet', c.getTyosuoritteet);
router.get('/lasku/:id', c.getLaskunTiedot);

// Tapahtumat
router.post('/t1/tyokohde', c.lisaaTyokohde);
router.post('/t2/tyosuorite', c.lisaaTyosuorite);
router.post('/t3/muistutus', c.luoMuistutuslaskut);
router.post('/t5/xml', c.paivitaXmlHinnasto);

// Raportit
router.post('/r1/hinta-arvio', c.hintaArvio);
router.post('/r2/tuntityolasku', c.luoTuntityolasku);
router.post('/r4/urakkatarjous', c.luoUrakkatarjous);
router.post('/r5/hyvaksy', c.hyvaksyUrakka);
router.get('/r6/turvallisuus', c.turvallisuusRaportti);
router.patch('/lasku/:id/maksettu', c.merkkaaMaksetuksi);

module.exports = router;
