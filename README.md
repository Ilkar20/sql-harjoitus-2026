# Tietokantaohjelmointi – Harjoitustyö (Kevät 2026)

## 1. Työn kuvaus
Tämä projekti toteuttaa Tmi Sähkötärskyn laskutus- ja työseurantajärjestelmän.
Toteutus on tehty JavaScriptilla (Node.js) ja PostgreSQL-tietokannalla.

Kurssivaatimuksen mukaisesti:
- ohjelmointikieli: JavaScript (Node.js)
- tietokanta: PostgreSQL

## 2. Toteutetut toiminnot

### Tapahtumat
- T1: uuden työkohteen lisääminen asiakkaalle
- T2: tuntitöiden ja tarvikkeiden kirjaaminen
- T3: muistutuslaskujen muodostaminen erääntyneistä laskuista
- T5: XML-hinnaston tuonti (päivitykset, lisäykset, arkistointi historiaan)

### Raportit
- R1: hinta-arvio
- R2: tuntityölasku
- R3: lasku alennuksilla
- R4: urakkatarjous
- R5: urakkatarjouksen hyväksyntä ja laskujen muodostus
- R6: turvallisuusraportti (Junk Co)

### Triggeri
- T4: asiakkaan luotettavuuden tarkistus urakkatarjousta lisättäessä
  - 30 % korotus, jos asiakkaalla on erääntyneitä maksamattomia laskuja
  - 10 % korotus, jos asiakkaalla on karhulasku viimeisen 2 vuoden ajalta

## 3. Projektin rakenne
- [index.js](index.js) – sovelluksen käynnistys
- [routes/index.js](routes/index.js) – API-reitit
- [controllers/index.js](controllers/index.js) – liiketoimintalogiikka
- [db/index.js](db/index.js) – tietokantayhteys
- [db/schema.sql](db/schema.sql) – skeema, rajoitteet, triggeri
- [db/seed.sql](db/seed.sql) – esimerkkidata
- [public/index.html](public/index.html) – käyttöliittymä
- [public/js/app.js](public/js/app.js) – käyttöliittymälogiikka
- [DATABASE_SISALTO.md](DATABASE_SISALTO.md) – tietokannan sisältö (SELECT * jokaisesta taulusta)

## 4. Sovelluksen ajaminen

### 4.1 Paikallisesti
1. Asenna riippuvuudet:
   - `npm install`
2. Luo tietokanta ja tuo taulut sekä data:
   - `createdb -U postgres laskutusjarjestelma`
   - `psql -U postgres -d laskutusjarjestelma -f db/schema.sql`
   - `psql -U postgres -d laskutusjarjestelma -f db/seed.sql`
3. Käynnistä sovellus:
   - `npm run dev` (kehitystila)
   - tai `npm run start`
4. Avaa selaimessa:
   - `http://localhost:3000`

### 4.2 Kurssipalvelimella (tie-tkannat.it.tuni.fi)
1. Kirjaudu palvelimelle:
   - `ssh oma_tuni_tunnus@tie-tkannat.it.tuni.fi`
2. Tarkista tietokantatiedot:
   - `cat ~/database.txt`
3. Varmista, että projektitiedostot ovat palvelimella.
   - Jos kansiota ei löydy (`No such file or directory`), siirrä projekti ensin palvelimelle.
   - Vaihtoehto A (git): `git clone <repo-url> ~/sql-harjoitus-2026`
   - Vaihtoehto B (WinSCP): kopioi projektikansio kotihakemistoosi nimellä `sql-harjoitus-2026`
4. Siirry projektihakemistoon ja tarkista SQL-tiedostot:
   - `cd ~/sql-harjoitus-2026`
   - `ls db`
5. Aja SQL-tiedostot:
   - `psql oma_tietokanta_nimi -f db/schema.sql`
   - `psql oma_tietokanta_nimi -f db/seed.sql`
   - jos et ole projektihakemistossa, käytä absoluuttista polkua:
     - `psql oma_tietokanta_nimi -f ~/sql-harjoitus-2026/db/schema.sql`
     - `psql oma_tietokanta_nimi -f ~/sql-harjoitus-2026/db/seed.sql`
6. Aseta tarvittaessa ympäristömuuttujat:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `PORT`
7. Käynnistä sovellus:
   - `npm install`
   - `npm run start`

## 5. API-reitit (tiivistelmä)
Kaikki reitit alkavat polulla `/api`.

- `GET /api/asiakkaat`
- `POST /api/t1/tyokohde`
- `POST /api/t2/tyosuorite`
- `POST /api/t3/muistutus`
- `POST /api/t5/xml`
- `POST /api/r1/hinta-arvio`
- `POST /api/r2/tuntityolasku`
- `GET /api/lasku/:id`
- `POST /api/r4/urakkatarjous`
- `POST /api/r5/hyvaksy`
- `GET /api/r6/turvallisuus`

## 6. Käytetyt työkalut ja versiot
- Node.js: 16.13.2
- npm: Node.js:n mukana
- PostgreSQL: 14+
- express: ^4.18.2
- pg: ^8.11.0
- xml2js: ^0.6.2

Versiot voi tarkistaa:
- `node -v`
- `npm -v`
- `psql --version`


