# sql-harjoitus-2026

Laskutusjarjestelma (Node.js + PostgreSQL)

1. Vaatimukset
- Node.js 18+ ja npm
- PostgreSQL 14+ (server)

2. Asennus
- Avaa PowerShell projektikansioon.
- Aja komento: npm install

3. Tietokannan valmistelu
Sovellus käyttää näitä asetuksia tiedostossa db/index.js:
- host: localhost
- port: 5432
- database: laskutusjarjestelma
- user: ympäristömuuttuja DB_USER tai oletus postgres
- password: ympäristömuuttuja DB_PASS tai tyhjä

Luo tietokanta laskutusjarjestelma ja aja SQL-tiedostot tässä järjestyksessä:
- db/schema.sql
- db/seed.sql

Jos psql on käytössä, komennot ovat:
- createdb -U postgres laskutusjarjestelma
- psql -U postgres -d laskutusjarjestelma -f db/schema.sql
- psql -U postgres -d laskutusjarjestelma -f db/seed.sql

Jos psql ei ole PATH:ssa, käytä pgAdmin Query Toolia:
- Luo tietokanta nimellä laskutusjarjestelma.
- Aja db/schema.sql.
- Aja db/seed.sql.

4. Käynnistys
- Kehitystilassa: npm run dev
- Normaalisti: npm run start

Sovellus käynnistyy osoitteeseen:
- http://localhost:3000

4.2 Ohjelman käyttö
Avaa selaimessa:
- Paikallisesti: http://localhost:3000
- Kurssipalvelimella (jos julkaistu sinne): http://tie-tkannat.it.tuni.fi:<portti>

Navigointi tapahtuu päävalikon kautta:

| Sivu | URL | Toiminto |
| --- | --- | --- |
| Etusivu | / | Yleiskatsaus ja navigointi |
| Asiakkaat | /asiakkaat | Asiakasluettelo |
| Uusi työkohde (T1) | /tyokohde/uusi | Lisää uusi työkohde asiakkaalle |
| Tuntityöt (T2) | /tyosuorite/uusi | Tallenna päivän tuntityöt ja tarvikkeet |
| Muistutuslasku (T3) | /lasku/muistutus | Luo muistutuslaskut erääntyneistä |
| Hinta-arvio (R1) | /raportti/hinta-arvio | Laske hinta-arvio kohteelle |
| Tuntityölasku (R2) | /raportti/tuntityolasku | Tulosta tuntityölasku |
| Lasku alennuksilla (R3) | /raportti/alennus | Lasku alennuksilla |
| Urakkatarjous (R4) | /raportti/urakka | Luo urakkatarjous |
| Hyväksy urakka (R5) | /urakka/hyvaksy | Hyväksy urakka ja luo laskut |
| Turvallisuusraportti (R6) | /raportti/turvallisuus | Junk Co -raportti |
| XML-hinnasto (T5) | /tarvike/xml | Päivitä hinnasto XML-tiedostosta |

Huomio:
- Yllä olevat URL-polut ovat käyttöliittymän sivupolkuja.
- Varsinaiset datakyselyt kulkevat API-reitteihin `/api/...`.

5. Vianetsintä
- Jos saat virheen yhteydessä tietokantaan, tarkista DB_USER ja DB_PASS.
- Jos portti 3000 on varattu, aseta ympäristömuuttuja PORT ennen käynnistystä.
- Jos "Uusi työkohde"-kohdassa asiakaslista on tyhjä, PostgreSQL ei yleensä ole käynnissä tai seed-data puuttuu.

6. Tietokantajärjestelmät: SQL -kurssin palvelin (tie-tkannat.it.tuni.fi)
Alla tiivistetty toimintamalli kurssin ohjeen perusteella.

- Palvelin toimii yliopiston sisäverkossa. Kotona tarvitset yleensä VPN-yhteyden (EduVPN).
- Hae ensin omat tietokantatiedot palvelimella tiedostosta database.txt.

Yhteys palvelimelle ja psql-käyttö:
- Kirjaudu SSH:lla palvelimelle:
	- ssh tie-tkannat.it.tuni.fi
- Tarkista tietokantatiedot:
	- cat database.txt
- Avaa psql omaan tietokantaasi:
	- psql oma_tietokanta_nimi

Ajettava SQL tämän projektin tauluja varten:
- psql-istunnossa:
	- \i db/schema.sql
	- \i db/seed.sql
- vaihtoehtoisesti komentoriviltä:
	- psql oma_tietokanta_nimi -f db/schema.sql
	- psql oma_tietokanta_nimi -f db/seed.sql

Tärkeä huomio tästä projektista:
- Tämä projekti on Node.js/Express-sovellus.
- Kurssipalvelin on ensisijaisesti PHP-sivujen ajamiseen public_html-hakemistosta.
- Node-palvelun jatkuva ajo kurssipalvelimella ei yleensä kuulu perusasetukseen.

Suositeltu tapa yhdistää ohje ja tämä projekti:
- Käytä kurssipalvelinta SQL-harjoitusten psql-ajoon.
- Aja tämä Node-sovellus omalla koneella komennolla npm run start.
- Jos haluat käyttää kurssipalvelimen kantaa tästä sovelluksesta, tarvitset verkkoyhteyden (VPN) ja toimivat yhteysparametrit, jotka kurssi sallii.
