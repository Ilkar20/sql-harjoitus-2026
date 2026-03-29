# Tietokannan sisältö

Tämä dokumentti sisältää tietokannan kaikkien taulujen sisällön SELECT * -hauilla.
Tiedot voidaan kopioida seuraavista kyselyistä ajamalla jokainen psql-konsolissa omaa tietokantaa vasten.

---

## Tuntihinnoittelu

```sql
SELECT * FROM Tuntihinnoittelu ORDER BY id;
```

| id | tyyppi      | bruttohinta | alv |
|----|-------------|-------------|-----|
| 1  | suunnittelu | 55.00       | 24  |
| 2  | tyo         | 45.00       | 24  |
| 3  | aputyo      | 35.00       | 24  |

---

## Asiakas

```sql
SELECT * FROM Asiakas ORDER BY id;
```

| id | nimi                 | osoite           | email                | puhelin     |
|----|----------------------|------------------|----------------------|-------------|
| 1  | Hosunen, Jaska       | Susimetsä 1      | jaska@hosunen.fi     | 040-111111  |
| 2  | Jokinen, Lissu       | Nurmitie 3       | lissu@jokinen.fi     | 040-222222  |
| 3  | Näsänen, Masa        | Masalantie 7     | masa@nasanen.fi      | 040-333333  |

---

## Toimittaja

```sql
SELECT * FROM Toimittaja ORDER BY id;
```

| id | nimi         | osoite         |
|----|--------------|----------------|
| 1  | How-data     | Datatie 1      |
| 2  | Moponet      | Mopotie 5      |
| 3  | Tärsky Pub   | Julkaisutie 3  |
| 4  | Junk Co      | Junkinkatu 8   |

---

## Tarvike

```sql
SELECT * FROM Tarvike ORDER BY id;
```

| id | toimittaja_id | nimi              | merkki       | ostohinta | yksikko | varastomaara | myyntihinta | alv |
|----|---------------|-------------------|--------------|-----------|---------|--------------|-------------|-----|
| 1  | 1             | USB-kaapeli       | How-data     | 4.00      | kpl     | 50           | 5.00        | 24  |
| 2  | 2             | Sähköjohto        | Moponet      | 1.00      | metri   | 200          | 1.25        | 24  |
| 3  | 3             | Opaskirja         | Tärsky Pub   | 8.00      | kpl     | 20           | 10.00       | 10  |
| 4  | 2             | Pistorasia        | Moponet      | 10.00     | kpl     | 50           | 12.50       | 24  |
| 5  | 2             | Maakaapeli        | Moponet      | 4.00      | metri   | 100          | 5.00        | 24  |
| 6  | 4             | Sähkökeskus       | Junk Co      | 300.00    | kpl     | 5            | 375.00      | 24  |
| 7  | 4             | Palohälytin       | Junk Co      | 4.00      | kpl     | 30           | 5.00        | 24  |

---

## TarvikeHistoria

```sql
SELECT * FROM TarvikeHistoria ORDER BY id;
```

(Tyhjenä seed-datassa. Täytetään, kun XML-hinnaston tuonnissa päivitetään tai poistetaan tarvikkeita.)

---

## Tyokohde

```sql
SELECT * FROM Tyokohde ORDER BY id;
```

| id | asiakas_id | osoite             | kuvaus           |
|----|------------|--------------------|------------------|
| 1  | 1          | Susimetsä 1        | Hosunen asunto   |
| 2  | 2          | Nurmitie 3         | Jokisen asunto   |
| 3  | 3          | Masalantie 7       | Näsäsen asunto   |
| 4  | 3          | Puotonkorpi 25     | Näsäsen mökki    |

---

## Tyosuorite

```sql
SELECT * FROM Tyosuorite ORDER BY id;
```

| id | tyokohde_id | pvm        | kuvaus                         |
|----|-------------|-----------|-------------------------------|
| 1  | 2           | 2026-01-10 | Sähköasennukset Nurmitie      |
| 2  | 3           | 2026-01-15 | Sähköasennukset Masalantie    |
| 3  | 3           | 2026-02-01 | Lisäasennukset Masalantie     |
| 4  | 4           | 2026-02-10 | Mökkiasennukset Puotonkorpi   |

---

## Tuntityo

```sql
SELECT * FROM Tuntityo ORDER BY id;
```

| id | tyosuorite_id | tuntihinnoittelu_id | tunnit | yksikkohinta | alennus |
|----|---------------|---------------------|--------|--------------|---------|
| 1  | 1             | 2                   | 3      | 36.29        | 10      |
| 2  | 1             | 3                   | 12     | 28.23        | 0       |
| 3  | 2             | 1                   | 25     | 44.35        | 0       |
| 4  | 2             | 2                   | 20     | 36.29        | 7       |
| 5  | 3             | 2                   | 10     | 36.29        | 0       |
| 6  | 4             | 1                   | 3      | 44.35        | 0       |
| 7  | 4             | 2                   | 12     | 36.29        | 0       |

---

## TyosuoriteTarvike

```sql
SELECT * FROM TyosuoriteTarvike ORDER BY tyosuorite_id, tarvike_id;
```

| tyosuorite_id | tarvike_id | maara | alennus |
|---------------|------------|-------|---------|
| 1             | 1          | 1     | 0       |
| 2             | 2          | 3     | 10      |
| 2             | 4          | 1     | 20      |
| 2             | 3          | 1     | 0       |
| 4             | 2          | 3     | 0       |
| 4             | 4          | 1     | 0       |

---

## Lasku

```sql
SELECT * FROM Lasku ORDER BY id;
```

| id | tyokohde_id | alkuperainen_lasku_id | pvm        | erapvm     | maksettu_pvm | tila     | tyyppi   | lasku_numero | laskutuslisa | viivastyskorko | kotitalous_vahennys | summa   |
|----|-------------|----------------------|------------|------------|--------------|----------|----------|--------------|--------------|----------------|---------------------|---------|
| 1  | 1           | NULL                 | 2026-01-05 | 2026-02-05 | NULL         | myohassa | normaali | 1            | 0            | 0              | 124.00              | 130.20  |
| 2  | 1           | 1                    | 2026-02-10 | 2026-03-10 | NULL         | myohassa | muistutus| 2            | 5            | 0              | 124.00              | 135.20  |
| 3  | 1           | 1                    | 2026-03-15 | 2026-04-15 | NULL         | avoin    | karhu    | 3            | 5            | 0              | 124.00              | 142.65  |
| 4  | 2           | NULL                 | 2026-01-15 | 2026-02-15 | 2026-02-10   | maksettu | normaali | 1            | 0            | 0              | 62.00               | 74.40   |
| 5  | 3           | NULL                 | 2026-01-20 | 2026-02-20 | NULL         | myohassa | normaali | 1            | 0            | 0              | 1488.43             | 2488.18 |
| 6  | 3           | 5                    | 2026-02-05 | 2026-02-25 | NULL         | myohassa | muistutus| 2            | 5            | 0              | 1488.43             | 2493.18 |
| 7  | 3           | 5                    | 2026-03-01 | 2026-03-21 | NULL         | avoin    | karhu    | 3            | 5            | 0              | 1488.43             | 2517.81 |
| 8  | 2           | NULL                 | 2026-01-10 | 2026-02-10 | NULL         | avoin    | normaali | 1            | 0            | 0              | 688.48              | 716.06  |
| 9  | 4           | NULL                 | 2026-02-15 | 2026-03-15 | NULL         | avoin    | normaali | 1            | 0            | 0              | 704.98              | 725.13  |

---

## Laskurivi

```sql
SELECT * FROM Laskurivi ORDER BY id;
```

| id | lasku_id | kuvaus                    | maara | yksikkohinta | alennus_prosentti | alv_prosentti | rivityyppi    | kotitalousvahennys_kelpoinen |
|----|----------|---------------------------|-------|--------------|-------------------|---------------|---------------|------------------------------|
| 1  | 1        | Työn osuus                | 1     | 1200.35      | 0                 | 24            | urakka_tyo    | TRUE                         |
| 2  | 1        | Tarvikkeiden osuus        | 1     | 5.00         | 0                 | 24            | urakka_tarvike| FALSE                        |
| 3  | 4        | Työ                       | 3     | 36.29        | 10                | 24            | tuntityo      | TRUE                         |
| 4  | 4        | USB-kaapeli               | 1     | 5.00         | 0                 | 24            | tarvike       | FALSE                        |
| 5  | 8        | Työn osuus                | 1     | 568.53       | 0                 | 24            | urakka_tyo    | TRUE                         |
| 6  | 8        | Tarvikkeiden osuus        | 1     | 806.25       | 0                 | 24            | urakka_tarvike| FALSE                        |
| 7  | 9        | Suunnittelu               | 3     | 44.35        | 0                 | 24            | tuntityo      | TRUE                         |
| 8  | 9        | Työ                       | 12    | 36.29        | 0                 | 24            | tuntityo      | TRUE                         |
| 9  | 9        | Sähköjohto                | 3     | 1.25         | 0                 | 24            | tarvike       | FALSE                        |
| 10 | 9        | Pistorasia                | 1     | 12.50        | 0                 | 24            | tarvike       | FALSE                        |

---

## Urakkatarjous

```sql
SELECT * FROM Urakkatarjous ORDER BY id;
```

| id | tyokohde_id | tyo_osuus | tarvike_osuus | alennus | alv | korotus | pvm        | hyvaksytty |
|----|-------------|-----------|---------------|---------|-----|---------|------------|------------|
| 1  | 1           | 1200.35   | 5.00          | 0       | 24  | 0       | 2026-01-01 | TRUE       |
| 2  | 2           | 568.53    | 806.25        | 0       | 24  | 0       | 2026-01-08 | TRUE       |

---

## UrakkatarjousTarvike

```sql
SELECT * FROM UrakkatarjousTarvike ORDER BY urakkatarjous_id, tarvike_id;
```

| urakkatarjous_id | tarvike_id | maara | yksikkohinta |
|------------------|------------|-------|--------------|
| 1                | 1          | 1     | 5.00         |
| 2                | 5          | 100   | 5.00         |
| 2                | 6          | 1     | 375.00       |

---

## UrakkaLasku

```sql
SELECT * FROM UrakkaLasku ORDER BY id;
```

| id | urakkatarjous_id | lasku_id |
|----|------------------|----------|
| 1  | 1                | 1        |
| 2  | 2                | 8        |

---

## Yhteenveto

- **Asiakkaat**: 3
- **Toimittajat**: 4
- **Tarvikkeet**: 7
- **Työkohteet**: 4
- **Työsuoritteet**: 4
- **Tunnit**: 7 riviä
- **Laskut**: 9 kappaletta (3 normaalia, 2 muistutusta, 2 karhuja, 2 urakkalaskua)
- **Urakkatarjoukset**: 2 hyväksyttyä
- **Kokonaisarvo laskuissa**: ~7 750 €

---

Dokumenttiajoitusohjeet:

```bash
# Paikallisesti:
createdb -U postgres laskutusjarjestelma
psql -U postgres -d laskutusjarjestelma -f db/schema.sql
psql -U postgres -d laskutusjarjestelma -f db/seed.sql

# Kukin SELECT voidaan kopioida suoraan psql-konsoliin tai ajaa komentoriviltä:
psql -U postgres -d laskutusjarjestelma -c "SELECT * FROM Asiakas ORDER BY id;"
```

Kurssipalvelimella:

```bash
ssh tie-tkannat.it.tuni.fi
psql oma_tietokanta_nimi
\i db/schema.sql
\i db/seed.sql
SELECT * FROM Asiakas ORDER BY id;
```
