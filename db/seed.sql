-- Esimerkkidata

-- Asiakkaat
INSERT INTO Asiakas (nimi, osoite, email, puhelin) VALUES
    ('Hosunen, Jaska', 'Susimetsä 1', 'jaska@hosunen.fi', '040-111111'),
    ('Jokinen, Lissu', 'Nurmitie 3', 'lissu@jokinen.fi', '040-222222'),
    ('Näsänen, Masa', 'Masalantie 7', 'masa@nasanen.fi', '040-333333');

-- Toimittajat
INSERT INTO Toimittaja (nimi, osoite) VALUES
    ('How-data', 'Datatie 1'),
    ('Moponet', 'Mopotie 5'),
    ('Tärsky Pub', 'Julkaisutie 3'),
    ('Junk Co', 'Junkinkatu 8');

-- Tarvikkeet
INSERT INTO Tarvike (toimittaja_id, nimi, merkki, ostohinta, yksikko, varastomaara, myyntihinta, alv) VALUES
    (1, 'USB-kaapeli', 'How-data', 4.00, 'kpl', 50, 5.00, 24),
    (2, 'Sähköjohto', 'Moponet', 1.00, 'metri', 200, 1.25, 24),
    (3, 'Opaskirja', 'Tärsky Pub', 8.00, 'kpl', 20, 10.00, 10),
    (2, 'Pistorasia', 'Moponet', 10.00, 'kpl', 50, 12.50, 24),
    (2, 'Maakaapeli', 'Moponet', 4.00, 'metri', 100, 5.00, 24),
    (4, 'Sähkökeskus', 'Junk Co', 300.00, 'kpl', 5, 375.00, 24),
    (4, 'Palohälytin', 'Junk Co', 4.00, 'kpl', 30, 5.00, 24);

-- Tyokohteet
INSERT INTO Tyokohde (asiakas_id, osoite, kuvaus) VALUES
    (1, 'Susimetsä 1', 'Hosusen asunto'),
    (2, 'Nurmitie 3', 'Jokisen asunto'),
    (3, 'Masalantie 7', 'Näsäsen asunto'),
    (3, 'Puotonkorpi 25', 'Näsäsen mökki');

-- Tyosuoritteet
INSERT INTO Tyosuorite (tyokohde_id, pvm, kuvaus) VALUES
    (2, '2026-01-10', 'Sähköasennukset Nurmitie'),
    (3, '2026-01-15', 'Sähköasennukset Masalantie'),
    (3, '2026-02-01', 'Lisäasennukset Masalantie'),
    (4, '2026-02-10', 'Mökkiasennukset Puotonkorpi');

-- Tuntityöt
INSERT INTO Tuntityo (tyosuorite_id, tuntihinnoittelu_id, tunnit, yksikkohinta, alennus) VALUES
    (1, 2, 3, 36.29, 10),   -- työ 3h ale 10% Nurmitie
    (1, 3, 12, 28.23, 0),   -- aputyö 12h Nurmitie
    (2, 1, 25, 44.35, 0),   -- suunnittelu 25h Masalantie
    (2, 2, 20, 36.29, 7),   -- työ 20h ale 7% Masalantie
    (3, 2, 10, 36.29, 0),   -- työ 10h Masalantie lisä
    (4, 1, 3, 44.35, 0),    -- suunnittelu 3h Puotonkorpi
    (4, 2, 12, 36.29, 0);   -- työ 12h Puotonkorpi

-- TyosuoriteTarvike
INSERT INTO TyosuoriteTarvike (tyosuorite_id, tarvike_id, maara, alennus) VALUES
    (1, 1, 1, 0),    -- USB-kaapeli 1kpl Nurmitie
    (2, 2, 3, 10),   -- Sähköjohto 3m ale 10% Masalantie
    (2, 4, 1, 20),   -- Pistorasia 1kpl ale 20% Masalantie
    (2, 3, 1, 0),    -- Opaskirja 1kpl Masalantie
    (4, 2, 3, 0),    -- Sähköjohto 3m Puotonkorpi
    (4, 4, 1, 0);    -- Pistorasia 1kpl Puotonkorpi

-- Laskut (tuntityölaskut)
INSERT INTO Lasku (tyokohde_id, pvm, erapvm, maksettu_pvm, tila, tyyppi, lasku_numero, summa, kotitalous_vahennys) VALUES
    (2, '2026-01-15', '2026-02-15', '2026-02-10', 'maksettu', 'normaali', 1, 74.40, 62.00),   -- lasku 4
    (3, '2026-01-20', '2026-02-20', NULL, 'myohassa', 'normaali', 1, 2488.18, 1488.43),         -- lasku 5
    (3, '2026-02-05', '2026-02-25', NULL, 'myohassa', 'muistutus', 2, 2493.18, 1488.43),        -- lasku 6
    (3, '2026-03-01', '2026-03-21', NULL, 'avoin', 'karhu', 3, 2517.81, 1488.43),               -- lasku 7
    (4, '2026-02-15', '2026-03-15', NULL, 'avoin', 'normaali', 1, 725.13, 704.98);              -- lasku 9

-- Päivitä alkuperäiset laskuviittaukset
UPDATE Lasku SET alkuperainen_lasku_id = (SELECT id FROM Lasku WHERE tyokohde_id=3 AND lasku_numero=1)
WHERE tyokohde_id=3 AND lasku_numero=2;
UPDATE Lasku SET alkuperainen_lasku_id = (SELECT id FROM Lasku WHERE tyokohde_id=3 AND lasku_numero=1)
WHERE tyokohde_id=3 AND lasku_numero=3;

-- Laskurivit lasku 4 (Jokinen, Nurmitie)
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Työ', 3, 36.29, 10, 24, 'tuntityo', TRUE FROM Lasku WHERE tyokohde_id=2 AND lasku_numero=1;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'USB-kaapeli', 1, 5.00, 0, 24, 'tarvike', FALSE FROM Lasku WHERE tyokohde_id=2 AND lasku_numero=1;

-- Laskurivit lasku 9 (Näsänen, Puotonkorpi)
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Suunnittelu', 3, 44.35, 0, 24, 'tuntityo', TRUE FROM Lasku WHERE tyokohde_id=4 AND lasku_numero=1;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Työ', 12, 36.29, 0, 24, 'tuntityo', TRUE FROM Lasku WHERE tyokohde_id=4 AND lasku_numero=1;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Sähköjohto', 3, 1.25, 0, 24, 'tarvike', FALSE FROM Lasku WHERE tyokohde_id=4 AND lasku_numero=1;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Pistorasia', 1, 12.50, 0, 24, 'tarvike', FALSE FROM Lasku WHERE tyokohde_id=4 AND lasku_numero=1;

-- Urakkatarjoukset (Hosunen)
INSERT INTO Urakkatarjous (tyokohde_id, tyo_osuus, tarvike_osuus, alennus, alv, korotus, pvm, hyvaksytty) VALUES
    (1, 1200.35, 5.00, 0, 24, 0, '2026-01-01', TRUE);

-- Urakan tarvikkeet
INSERT INTO UrakkatarjousTarvike (urakkatarjous_id, tarvike_id, maara, yksikkohinta) VALUES
    (1, 1, 1, 5.00);

-- Urakkalaskut (lasku 1,2,3 Hosunen)
INSERT INTO Lasku (tyokohde_id, pvm, erapvm, maksettu_pvm, tila, tyyppi, lasku_numero, summa, kotitalous_vahennys) VALUES
    (1, '2026-01-05', '2026-02-05', NULL, 'myohassa', 'normaali', 1, 130.20, 124.00),
    (1, '2026-02-10', '2026-03-10', NULL, 'myohassa', 'muistutus', 2, 135.20, 124.00),
    (1, '2026-03-15', '2026-04-15', NULL, 'avoin', 'karhu', 3, 142.65, 124.00);

UPDATE Lasku SET alkuperainen_lasku_id = (SELECT id FROM Lasku WHERE tyokohde_id=1 AND lasku_numero=1)
WHERE tyokohde_id=1 AND lasku_numero=2;
UPDATE Lasku SET alkuperainen_lasku_id = (SELECT id FROM Lasku WHERE tyokohde_id=1 AND lasku_numero=1)
WHERE tyokohde_id=1 AND lasku_numero=3;

INSERT INTO UrakkaLasku (urakkatarjous_id, lasku_id)
SELECT 1, id FROM Lasku WHERE tyokohde_id=1 AND lasku_numero=1;

-- Laskurivit urakkalaskuille
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Työn osuus', 1, 1200.35, 0, 24, 'urakka_tyo', TRUE FROM Lasku WHERE tyokohde_id=1 AND lasku_numero=1;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Tarvikkeiden osuus', 1, 5.00, 0, 24, 'urakka_tarvike', FALSE FROM Lasku WHERE tyokohde_id=1 AND lasku_numero=1;

-- Jokinen urakka (lasku 8)
INSERT INTO Urakkatarjous (tyokohde_id, tyo_osuus, tarvike_osuus, alennus, alv, korotus, pvm, hyvaksytty) VALUES
    (2, 568.53, 806.25, 0, 24, 0, '2026-01-08', TRUE);
INSERT INTO UrakkatarjousTarvike (urakkatarjous_id, tarvike_id, maara, yksikkohinta) VALUES
    (2, 5, 100, 5.00),
    (2, 6, 1, 375.00);
INSERT INTO Lasku (tyokohde_id, pvm, erapvm, tila, tyyppi, lasku_numero, summa, kotitalous_vahennys) VALUES
    (2, '2026-01-10', '2026-02-10', 'avoin', 'normaali', 1, 716.06, 688.48);
INSERT INTO UrakkaLasku (urakkatarjous_id, lasku_id)
SELECT 2, id FROM Lasku WHERE tyokohde_id=2 AND lasku_numero=1 AND tyyppi='normaali' AND summa=716.06;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Työn osuus', 1, 568.53, 0, 24, 'urakka_tyo', TRUE FROM Lasku WHERE tyokohde_id=2 AND lasku_numero=1 AND summa=716.06;
INSERT INTO Laskurivi (lasku_id, kuvaus, maara, yksikkohinta, alennus_prosentti, alv_prosentti, rivityyppi, kotitalousvahennys_kelpoinen)
SELECT id, 'Tarvikkeiden osuus', 1, 806.25, 0, 24, 'urakka_tarvike', FALSE FROM Lasku WHERE tyokohde_id=2 AND lasku_numero=1 AND summa=716.06;
