-- Tmi Sähkötärsky — Tietokanta
-- PostgreSQL luontilauseet

DROP TABLE IF EXISTS UrakkaLasku CASCADE;
DROP TABLE IF EXISTS UrakkatarjousTarvike CASCADE;
DROP TABLE IF EXISTS Urakkatarjous CASCADE;
DROP TABLE IF EXISTS Laskurivi CASCADE;
DROP TABLE IF EXISTS Lasku CASCADE;
DROP TABLE IF EXISTS TyosuoriteTarvike CASCADE;
DROP TABLE IF EXISTS Tuntityo CASCADE;
DROP TABLE IF EXISTS Tyosuorite CASCADE;
DROP TABLE IF EXISTS Tyokohde CASCADE;
DROP TABLE IF EXISTS TarvikeHistoria CASCADE;
DROP TABLE IF EXISTS Tarvike CASCADE;
DROP TABLE IF EXISTS Toimittaja CASCADE;
DROP TABLE IF EXISTS Tuntihinnoittelu CASCADE;
DROP TABLE IF EXISTS Asiakas CASCADE;

-- 1. Asiakas
CREATE TABLE Asiakas (
    id      SERIAL PRIMARY KEY,
    nimi    TEXT NOT NULL,
    osoite  TEXT,
    email   TEXT,
    puhelin TEXT
);

-- 2. Toimittaja
CREATE TABLE Toimittaja (
    id      SERIAL PRIMARY KEY,
    nimi    TEXT NOT NULL,
    osoite  TEXT
);

-- 3. Tuntihinnoittelu
CREATE TABLE Tuntihinnoittelu (
    id          SERIAL PRIMARY KEY,
    tyyppi      TEXT NOT NULL CHECK (tyyppi IN ('suunnittelu','tyo','aputyo')),
    bruttohinta NUMERIC(10,2) NOT NULL CHECK (bruttohinta > 0),
    alv         NUMERIC(5,2) NOT NULL DEFAULT 24
);

-- 4. Tarvike
CREATE TABLE Tarvike (
    id           SERIAL PRIMARY KEY,
    toimittaja_id INTEGER NOT NULL REFERENCES Toimittaja(id),
    nimi         TEXT NOT NULL,
    merkki       TEXT,
    ostohinta    NUMERIC(10,2) NOT NULL CHECK (ostohinta > 0),
    yksikko      TEXT NOT NULL CHECK (yksikko IN ('kpl','metri')),
    varastomaara NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (varastomaara >= 0),
    myyntihinta  NUMERIC(10,2) NOT NULL CHECK (myyntihinta > 0),
    alv          NUMERIC(5,2) NOT NULL DEFAULT 24
);

-- 5. TarvikeHistoria
CREATE TABLE TarvikeHistoria (
    id             SERIAL PRIMARY KEY,
    tarvike_id     INTEGER NOT NULL REFERENCES Tarvike(id),
    nimi           TEXT NOT NULL,
    merkki         TEXT,
    ostohinta      NUMERIC(10,2) NOT NULL,
    myyntihinta    NUMERIC(10,2) NOT NULL,
    alv            NUMERIC(5,2) NOT NULL,
    pvm_alku       DATE NOT NULL,
    pvm_loppu      DATE NOT NULL,
    CHECK (pvm_loppu > pvm_alku)
);

-- 6. Tyokohde
CREATE TABLE Tyokohde (
    id         SERIAL PRIMARY KEY,
    asiakas_id INTEGER NOT NULL REFERENCES Asiakas(id),
    osoite     TEXT NOT NULL,
    kuvaus     TEXT
);

-- 7. Tyosuorite
CREATE TABLE Tyosuorite (
    id          SERIAL PRIMARY KEY,
    tyokohde_id INTEGER NOT NULL REFERENCES Tyokohde(id),
    pvm         DATE NOT NULL,
    kuvaus      TEXT
);

-- 8. Tuntityo
CREATE TABLE Tuntityo (
    id                  SERIAL PRIMARY KEY,
    tyosuorite_id       INTEGER NOT NULL REFERENCES Tyosuorite(id),
    tuntihinnoittelu_id INTEGER NOT NULL REFERENCES Tuntihinnoittelu(id),
    tunnit              NUMERIC(5,2) NOT NULL CHECK (tunnit > 0),
    yksikkohinta        NUMERIC(10,2) NOT NULL CHECK (yksikkohinta > 0),
    alennus             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (alennus BETWEEN 0 AND 100)
);

-- 9. TyosuoriteTarvike
CREATE TABLE TyosuoriteTarvike (
    tyosuorite_id INTEGER NOT NULL REFERENCES Tyosuorite(id),
    tarvike_id    INTEGER NOT NULL REFERENCES Tarvike(id),
    maara         NUMERIC(10,2) NOT NULL CHECK (maara > 0),
    alennus       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (alennus BETWEEN 0 AND 100),
    PRIMARY KEY (tyosuorite_id, tarvike_id)
);

-- 10. Lasku
CREATE TABLE Lasku (
    id                    SERIAL PRIMARY KEY,
    tyokohde_id           INTEGER NOT NULL REFERENCES Tyokohde(id),
    alkuperainen_lasku_id INTEGER REFERENCES Lasku(id),
    pvm                   DATE NOT NULL,
    erapvm                DATE NOT NULL,
    maksettu_pvm          DATE,
    tila                  TEXT NOT NULL DEFAULT 'avoin'
                          CHECK (tila IN ('avoin','maksettu','myohassa','peruutettu')),
    tyyppi                TEXT NOT NULL DEFAULT 'normaali'
                          CHECK (tyyppi IN ('normaali','muistutus','karhu')),
    lasku_numero          INTEGER NOT NULL DEFAULT 1 CHECK (lasku_numero > 0),
    laskutuslisa          NUMERIC(10,2) NOT NULL DEFAULT 0,
    viivastyskorko        NUMERIC(10,2) NOT NULL DEFAULT 0,
    kotitalous_vahennys   NUMERIC(10,2) NOT NULL DEFAULT 0,
    summa                 NUMERIC(10,2) NOT NULL CHECK (summa >= 0),
    CHECK (erapvm >= pvm),
    CHECK (alkuperainen_lasku_id != id)
);

-- 11. Laskurivi
CREATE TABLE Laskurivi (
    id                           SERIAL PRIMARY KEY,
    lasku_id                     INTEGER NOT NULL REFERENCES Lasku(id),
    kuvaus                       TEXT NOT NULL,
    maara                        NUMERIC(10,2) NOT NULL CHECK (maara > 0),
    yksikkohinta                 NUMERIC(10,2) NOT NULL CHECK (yksikkohinta > 0),
    alennus_prosentti            NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (alennus_prosentti BETWEEN 0 AND 100),
    alv_prosentti                NUMERIC(5,2) NOT NULL DEFAULT 24,
    rivityyppi                   TEXT NOT NULL CHECK (rivityyppi IN ('tuntityo','tarvike','urakka_tyo','urakka_tarvike')),
    kotitalousvahennys_kelpoinen BOOLEAN NOT NULL DEFAULT FALSE
);

-- 12. Urakkatarjous
CREATE TABLE Urakkatarjous (
    id            SERIAL PRIMARY KEY,
    tyokohde_id   INTEGER NOT NULL REFERENCES Tyokohde(id),
    tyo_osuus     NUMERIC(10,2) NOT NULL CHECK (tyo_osuus > 0),
    tarvike_osuus NUMERIC(10,2) NOT NULL CHECK (tarvike_osuus > 0),
    alennus       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (alennus BETWEEN 0 AND 100),
    alv           NUMERIC(5,2) NOT NULL DEFAULT 24,
    korotus       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (korotus IN (0,10,30)),
    pvm           DATE NOT NULL,
    hyvaksytty    BOOLEAN NOT NULL DEFAULT FALSE
);

-- 13. UrakkatarjousTarvike
CREATE TABLE UrakkatarjousTarvike (
    urakkatarjous_id INTEGER NOT NULL REFERENCES Urakkatarjous(id),
    tarvike_id       INTEGER NOT NULL REFERENCES Tarvike(id),
    maara            NUMERIC(10,2) NOT NULL CHECK (maara > 0),
    yksikkohinta     NUMERIC(10,2) NOT NULL CHECK (yksikkohinta > 0),
    PRIMARY KEY (urakkatarjous_id, tarvike_id)
);

-- 14. UrakkaLasku
CREATE TABLE UrakkaLasku (
    id               SERIAL PRIMARY KEY,
    urakkatarjous_id INTEGER NOT NULL REFERENCES Urakkatarjous(id),
    lasku_id         INTEGER NOT NULL REFERENCES Lasku(id),
    UNIQUE (urakkatarjous_id, lasku_id)
);

-- Triggeri T4: Tarkistaa asiakkaan luotettavuuden urakkatarjousta tallennettaessa
CREATE OR REPLACE FUNCTION tarkista_asiakas_luotettavuus()
RETURNS TRIGGER AS $$
DECLARE
    v_asiakas_id INTEGER;
    eraantynyt INTEGER;
    karhu_2v   INTEGER;
    korotus    NUMERIC := 0;
BEGIN
    SELECT tk.asiakas_id INTO v_asiakas_id
    FROM Tyokohde tk WHERE tk.id = NEW.tyokohde_id;

    -- Tarkista erääntyneet maksamattomat laskut
    SELECT COUNT(*) INTO eraantynyt
    FROM Lasku l
    JOIN Tyokohde tk ON tk.id = l.tyokohde_id
    WHERE tk.asiakas_id = v_asiakas_id
    AND l.tila IN ('avoin', 'myohassa')
    AND l.erapvm < CURRENT_DATE;

    IF eraantynyt > 0 THEN
        korotus := 30;
    ELSE
        -- Tarkista karhutut laskut viimeisen 2 vuoden aikana
        SELECT COUNT(*) INTO karhu_2v
        FROM Lasku l
        JOIN Tyokohde tk ON tk.id = l.tyokohde_id
        WHERE tk.asiakas_id = v_asiakas_id
        AND l.tyyppi = 'karhu'
        AND l.pvm >= CURRENT_DATE - INTERVAL '2 years';

        IF karhu_2v > 0 THEN
            korotus := 10;
        END IF;
    END IF;

    NEW.korotus := korotus;
    NEW.tyo_osuus := NEW.tyo_osuus * (1 + korotus / 100);
    NEW.tarvike_osuus := NEW.tarvike_osuus * (1 + korotus / 100);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_urakka_luotettavuus
BEFORE INSERT ON Urakkatarjous
FOR EACH ROW EXECUTE FUNCTION tarkista_asiakas_luotettavuus();

-- Perusdata
INSERT INTO Tuntihinnoittelu (tyyppi, bruttohinta, alv) VALUES
    ('suunnittelu', 55.00, 24),
    ('tyo', 45.00, 24),
    ('aputyo', 35.00, 24);
