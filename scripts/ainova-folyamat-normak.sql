-- =====================================================
-- AINOVA - Folyamat és Termék Normák Adatbázis
-- Verzió: 1.0
-- Dátum: 2026-01-12
-- =====================================================
-- Ez a script létrehozza a folyamat kategorizáláshoz és
-- termék normaidők számításához szükséges táblákat.
-- =====================================================

USE LaC_BasicDatas_TEST;
GO

-- =====================================================
-- 1. TÁBLA: ainova_folyamat_kategoriak
-- A 11 fő kategória referencia táblája
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_folyamat_kategoriak')
BEGIN
    CREATE TABLE dbo.ainova_folyamat_kategoriak (
        id INT IDENTITY(1,1) PRIMARY KEY,
        kod NVARCHAR(20) NOT NULL UNIQUE,      -- pl. 'MERES', 'ELOKESZITES'
        nev NVARCHAR(50) NOT NULL,             -- Magyar megjelenítési név
        sorrend INT NOT NULL DEFAULT 99,       -- Megjelenítési sorrend
        aktiv BIT NOT NULL DEFAULT 1,
        leiras NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );

    -- 11 fő kategória beszúrása
    INSERT INTO dbo.ainova_folyamat_kategoriak (kod, nev, sorrend, leiras) VALUES
    ('MERES', 'Mérés', 1, 'Előmérés, végmérés, induktivitás, nagyfeszültség teszt, RD mérés, stb.'),
    ('ELOKESZITES', 'Előkészítés', 2, 'Darabolás, vasmag előkészítés, lézervágás, hőkezelés 80°C'),
    ('SZERELES', 'Szerelés', 3, 'Tekercs szerelés, fedél szerelés, maszkolás, merítés'),
    ('VEGSZERELES', 'Végszerelés', 4, 'Festés, végszerelés, tömítések (PCM, TEROSON)'),
    ('IMPREGNALAS', 'Impregnálás', 5, 'Hőkezelés, impregnálás, zsírzás, zsír eltávolítás'),
    ('FILTER', 'Filter', 6, 'Filter-specifikus műveletek (cseppentés fedő, jelölő előkészítés, stb.)'),
    ('MARAS_ONOZAS', 'Marás-Ónozás', 7, 'Huzalmarás, ónozás, ultrahangos ónozás, UH hegesztés'),
    ('TEKERCSELÉS', 'Tekercselés', 8, 'Gépi tekercselés 1-3, darabolás-tekercselés'),
    ('CSOMAGOLAS', 'Csomagolás', 9, 'Csomagolás, címkézés'),
    ('AWI_HEGESZTES', 'AWI Hegesztés', 10, 'AWI hegesztés'),
    ('EL_TEKERCSELÉS', 'Él Tekercselés', 11, 'Gépi tekercselés - él tekercselő');

    PRINT 'ainova_folyamat_kategoriak tábla létrehozva és feltöltve (11 kategória)';
END
ELSE
BEGIN
    PRINT 'ainova_folyamat_kategoriak tábla már létezik';
END
GO

-- =====================================================
-- 2. TÁBLA: ainova_sap_folyamatok
-- A 92 SAP folyamat lépés referencia táblája
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_sap_folyamatok')
BEGIN
    CREATE TABLE dbo.ainova_sap_folyamatok (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sap_nev NVARCHAR(100) NOT NULL,              -- SAP művelet neve
        kategoria_kod NVARCHAR(20) NOT NULL,         -- FK -> ainova_folyamat_kategoriak.kod
        munkahely_kodok NVARCHAR(200) NULL,          -- Munkahely kódok vesszővel elválasztva
        kz_norma_oszlop_index INT NULL,              -- K.Z norma Excel oszlop index (2-93)
        eredeti_kategoria NVARCHAR(50) NULL,         -- Eredeti kategória az összevont folyamatokból
        megjegyzes NVARCHAR(200) NULL,               -- Átsorolás indoklása
        aktiv BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        
        CONSTRAINT FK_sap_folyamatok_kategoria 
            FOREIGN KEY (kategoria_kod) REFERENCES ainova_folyamat_kategoriak(kod)
    );

    CREATE INDEX IX_sap_folyamatok_kategoria ON dbo.ainova_sap_folyamatok(kategoria_kod);

    PRINT 'ainova_sap_folyamatok tábla létrehozva';
END
GO

-- SAP folyamatok beszúrása (92 db)
-- Először töröljük ha van adat
DELETE FROM dbo.ainova_sap_folyamatok;

-- =====================================================
-- MÉRÉS (27 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('DPG 10 előmérés', 'MERES', '64L81', 14),
('DPG 10 végmérés', 'MERES', '64L81', 15),
('Drossel előkészítés impregnálás 2', 'MERES', '64L70', 16),
('Ellenállás mérés', 'MERES', '64L80', 17),
('Előmérés', 'MERES', '64L40, 64L80', 22),
('Előmérés 2', 'MERES', '64L40', 23),
('Hőkapcsoló folytonosság vizsgálat', 'MERES', '64L40, 64L80', 31),
('Induktivitás mérés', 'MERES', '64L40', 40),
('Induktivitás mérés 2', 'MERES', '64L40', 41),
('Nagyfeszültség teszt 1', 'MERES', '6440', 54),
('Nagyfeszültség teszt 2', 'MERES', '6440', 55),
('Nagyfeszültség vizsgálat - Elabo', 'MERES', '64L41', 56),
('Nagyfeszültség vizsgálat 2 - Elabo', 'MERES', '64L41', 57),
('Nagyfeszültség vizsgálat 3 - Elabo', 'MERES', '64L41', 58),
('PD teszt 1', 'MERES', '6440', 61),
('RD mérés', 'MERES', '64L40, 64L82', 62),
('RD-L mérés', 'MERES', '64L82', 63),
('RD-L mérés 2', 'MERES', '64L82', 64),
('Szigetelési ellenállás mérés 1', 'MERES', '6440', 66),
('Szigetelési ellenállás mérés 2', 'MERES', '6440', 67),
('Szigetelési ellenállás mérés 3', 'MERES', '6440', 68),
('Szigetelési ellenállás mérés 4', 'MERES', '6440', 69),
('Szigetelő ellenállás mérés', 'MERES', '64L40, 64L80', 70),
('Védőföldelési ellenállás mérés', 'MERES', '64L80, 64L40', 83),
('Védőföldelési ellenállás mérés 2', 'MERES', '64L80', 84),
('Végmérés', 'MERES', '64L40, 64L80', 85),
('Végmérés 2', 'MERES', '64L80, 64L40', 86);

-- =====================================================
-- ELŐKÉSZÍTÉS (14 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('Darabolás', 'ELOKESZITES', '64L06', 9),
('Előkészítés', 'ELOKESZITES', '64L10', 18),
('Előkészítés 2', 'ELOKESZITES', '64L10', 19),
('Előkészítés 3', 'ELOKESZITES', '64L10', 20),
('Előkészítés 4', 'ELOKESZITES', '64L10', 21),
('Hőkezelés - vasmag', 'ELOKESZITES', '64L60', 33),
('Hőkezelés 2 80°C', 'ELOKESZITES', '64L16', 35),
('Hőkezelés 80°C', 'ELOKESZITES', '64L16', 36),
('Kivezető lyukasztás', 'ELOKESZITES', '64L34', 44),
('Lézervágás', 'ELOKESZITES', '64L12', 48),
('Tekercs előkészítés', 'ELOKESZITES', '64L35', 71),
('Vasmag előkészítés', 'ELOKESZITES', '64L10', 80),
('Vasmag előkészítés 2', 'ELOKESZITES', '64L10', 81),
('Vasmag előkészítés 3', 'ELOKESZITES', '64L10', 82);

-- =====================================================
-- SZERELÉS (13 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index, eredeti_kategoria, megjegyzes) VALUES
('Darabolás - Szerelés', 'SZERELES', '64L06', 10, NULL, NULL),
('Fedél szerelés', 'SZERELES', '64L35', 25, NULL, NULL),
('Kivezető lapítás', 'SZERELES', '64L34', 43, NULL, NULL),
('Kivezető pozícionáló eltávolítás', 'SZERELES', '64L65', 45, NULL, NULL),
('Kivezető pozícionáló felszerelés', 'SZERELES', '64L45', 46, NULL, NULL),
('Maszkolás', 'SZERELES', '64L55', 49, 'festés', 'Átsorolva festésből'),
('Maszkolás eltávolítás', 'SZERELES', '64L55', 50, 'festés', 'Átsorolva festésből'),
('Maszkolás etávolítás', 'SZERELES', '64L55', 51, 'festés', 'Átsorolva festésből'),
('Merítés', 'SZERELES', '6440', 52, 'festés', 'Átsorolva festésből'),
('Tekercs préselés', 'SZERELES', '64L29', 72, NULL, NULL),
('Tekercs szerelés', 'SZERELES', '64L35', 73, NULL, NULL),
('Tekercs szerelés 2', 'SZERELES', '64L35', 74, NULL, NULL),
('Vezeték előkészítés', 'SZERELES', '64L35', 89, NULL, NULL);

-- =====================================================
-- VÉGSZERELÉS (10 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index, eredeti_kategoria, megjegyzes) VALUES
('CSEPPENTÉS', 'VEGSZERELES', '6465', 3, NULL, NULL),
('Cseppentő furat készítés', 'VEGSZERELES', '64L70', 6, NULL, NULL),
('Darabolás - Végszerelés', 'VEGSZERELES', '64L06', 12, NULL, NULL),
('Festés', 'VEGSZERELES', '64L55', 26, 'festés', 'Átsorolva festésből'),
('Tömítés PCM-el', 'VEGSZERELES', '6459, 64L75', 75, 'cseppentés', 'Átsorolva cseppentésből'),
('Tömítés TEROSON-nal', 'VEGSZERELES', '64L75', 76, 'cseppentés', 'Átsorolva cseppentésből'),
('Tömítés TEROSON-nal 2', 'VEGSZERELES', '64L75', 77, 'cseppentés', 'Átsorolva cseppentésből'),
('Végszerelés', 'VEGSZERELES', '64L70', 87, NULL, NULL),
('Végszerelés 2', 'VEGSZERELES', '64L70', 88, NULL, NULL);

-- =====================================================
-- IMPREGNÁLÁS (8 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('Hőkezelés', 'IMPREGNALAS', '64L60', 32),
('Hőkezelés 2', 'IMPREGNALAS', '64L60', 34),
('Impregnálás', 'IMPREGNALAS', '64L50, 64L51', 38),
('Impregnálás 2', 'IMPREGNALAS', '64L50', 39),
('Zsír eltávolítás', 'IMPREGNALAS', '64L65', 90),
('Zsír eltávolítás 2', 'IMPREGNALAS', '64L65', 91),
('Zsírzás', 'IMPREGNALAS', '64L45', 92),
('Zsírzás 2', 'IMPREGNALAS', '64L45', 93);

-- =====================================================
-- FILTER (7 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('Cseppentés - fedő', 'FILTER', '6465', 4),
('Cseppentés 2', 'FILTER', '6465', 5),
('Fedél előkészítés', 'FILTER', '64L35', 24),
('JELÖLŐ ELŐKÉSZÍTÉS', 'FILTER', '6405', 42),
('Lézeres lakkeltávolítás', 'FILTER', '64L205', 47),
('Minőségellenőrzés', 'FILTER', '64L43, 64L83', 53),
('SORI SZERELÉS', 'FILTER', '6420', 65);

-- =====================================================
-- MARÁS-ÓNOZÁS (5 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index, eredeti_kategoria, megjegyzes) VALUES
('Huzalmarás', 'MARAS_ONOZAS', '64L30', 37, NULL, NULL),
('Ónozás', 'MARAS_ONOZAS', '64L32', 59, NULL, NULL),
('Ónozás 2', 'MARAS_ONOZAS', '64L32', 60, NULL, NULL),
('Ultrahangos ónozás', 'MARAS_ONOZAS', '64L33', 79, NULL, NULL),
('UH hegesztés', 'MARAS_ONOZAS', '64L72', 78, 'végszerelés', 'Átsorolva végszerelésből');

-- =====================================================
-- TEKERCSELÉS (4 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('Darabolás - Tekercselés', 'TEKERCSELÉS', '64L06', 11),
('Gépi tekercselés', 'TEKERCSELÉS', '64L25, 64L21, 64L22, 64L27, 64L26, 64L200', 27),
('Gépi tekercselés 2', 'TEKERCSELÉS', '64L25, 64L27', 29),
('Gépi tekercselés 3', 'TEKERCSELÉS', '64L25, 64L27', 30);

-- =====================================================
-- CSOMAGOLÁS (2 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('Csomagolás', 'CSOMAGOLAS', '64H80, 64L85', 7),
('Csomagolás, címkézés', 'CSOMAGOLAS', '64L85', 8);

-- =====================================================
-- AWI HEGESZTÉS (1 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index) VALUES
('AWI hegesztés', 'AWI_HEGESZTES', '64H71', 2);

-- =====================================================
-- ÉL TEKERCSELÉS (1 SAP lépés)
-- =====================================================
INSERT INTO dbo.ainova_sap_folyamatok (sap_nev, kategoria_kod, munkahely_kodok, kz_norma_oszlop_index, eredeti_kategoria, megjegyzes) VALUES
('Gépi tekercselés - él tekercselő', 'EL_TEKERCSELÉS', '64L28', 28, 'filter', 'Átsorolva filterből');

PRINT 'ainova_sap_folyamatok feltöltve (92 SAP lépés)';
GO

-- =====================================================
-- 3. TÁBLA: ainova_termek_normak
-- Termékenkénti összevont normaidők (számított)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_termek_normak')
BEGIN
    CREATE TABLE dbo.ainova_termek_normak (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tipus_kod NVARCHAR(50) NOT NULL UNIQUE,    -- Termék típus kód (pl. "B86101A 66L158")
        osszeg_normido_perc DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Összes normaidő percben
        
        -- Kategóriánkénti bontás (11 kategória)
        meres_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        elokeszites_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        szereles_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        vegszereles_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        impregnalas_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        filter_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        maras_onozas_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        tekercselés_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        csomagolas_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        awi_hegesztes_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        el_tekercselés_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Meta adatok
        utolso_import DATETIME2 NULL,
        forras_excel NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );

    CREATE INDEX IX_termek_normak_tipus ON dbo.ainova_termek_normak(tipus_kod);

    PRINT 'ainova_termek_normak tábla létrehozva';
END
ELSE
BEGIN
    PRINT 'ainova_termek_normak tábla már létezik';
END
GO

-- =====================================================
-- 4. TÁBLA: ainova_termek_sap_idok (opcionális - részletes)
-- Termékenkénti SAP lépésenkénti idők (nyers adatok)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_termek_sap_idok')
BEGIN
    CREATE TABLE dbo.ainova_termek_sap_idok (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tipus_kod NVARCHAR(50) NOT NULL,           -- Termék típus kód
        sap_folyamat_id INT NOT NULL,              -- FK -> ainova_sap_folyamatok.id
        normido_perc DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Normaidő percben
        
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        
        CONSTRAINT FK_termek_sap_idok_folyamat 
            FOREIGN KEY (sap_folyamat_id) REFERENCES ainova_sap_folyamatok(id),
        CONSTRAINT UQ_termek_sap UNIQUE (tipus_kod, sap_folyamat_id)
    );

    CREATE INDEX IX_termek_sap_idok_tipus ON dbo.ainova_termek_sap_idok(tipus_kod);
    CREATE INDEX IX_termek_sap_idok_folyamat ON dbo.ainova_termek_sap_idok(sap_folyamat_id);

    PRINT 'ainova_termek_sap_idok tábla létrehozva';
END
ELSE
BEGIN
    PRINT 'ainova_termek_sap_idok tábla már létezik';
END
GO

-- =====================================================
-- 5. TÁBLA: ainova_heti_terv
-- Excel-ből importált heti terv (napi fix ütemterv)
-- Forrás: CW sheetek bal oldali táblája
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_heti_terv')
BEGIN
    CREATE TABLE dbo.ainova_heti_terv (
        id INT IDENTITY(1,1) PRIMARY KEY,
        het_szam INT NOT NULL,                     -- CW hét száma (1-53)
        ev INT NOT NULL,                           -- Év (2026)
        tipus_kod NVARCHAR(50) NOT NULL,           -- Termék típus kód (B86... vagy C62330A...)
        termek_tipus NVARCHAR(10) NOT NULL DEFAULT 'FIX',  -- 'FIX' = fojtó, 'TEKERCS' = tekercs
        
        -- Napi tervezett darabszámok (H-P)
        hetfo_db INT NOT NULL DEFAULT 0,
        kedd_db INT NOT NULL DEFAULT 0,
        szerda_db INT NOT NULL DEFAULT 0,
        csutortok_db INT NOT NULL DEFAULT 0,
        pentek_db INT NOT NULL DEFAULT 0,
        
        -- Napi tervezett percek (számított, K.Z normából)
        hetfo_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        kedd_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        szerda_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        csutortok_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        pentek_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Összesítők
        heti_ossz_db INT NOT NULL DEFAULT 0,
        heti_ossz_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Dátumok (a hét napjai)
        het_kezdet DATE NOT NULL,                  -- Hétfő dátuma
        het_veg DATE NOT NULL,                     -- Péntek dátuma
        
        -- Meta
        forras_sheet NVARCHAR(100) NULL,           -- pl. "CW02", "CW03 ütemterv"
        utolso_szinkron DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        
        CONSTRAINT UQ_heti_terv UNIQUE (ev, het_szam, tipus_kod)
    );

    CREATE INDEX IX_heti_terv_het ON dbo.ainova_heti_terv(ev, het_szam);
    CREATE INDEX IX_heti_terv_tipus ON dbo.ainova_heti_terv(tipus_kod);
    CREATE INDEX IX_heti_terv_datumok ON dbo.ainova_heti_terv(het_kezdet, het_veg);

    PRINT 'ainova_heti_terv tábla létrehozva';
END
GO

-- =====================================================
-- 6. TÁBLA: ainova_napi_teljesules
-- Excel-ből importált napi teljesülés (felkövetés)
-- Forrás: CW sheetek alsó táblája + jobb oldali leadott
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_napi_teljesules')
BEGIN
    CREATE TABLE dbo.ainova_napi_teljesules (
        id INT IDENTITY(1,1) PRIMARY KEY,
        datum DATE NOT NULL,                       -- Konkrét nap
        het_szam INT NOT NULL,                     -- CW hét száma
        ev INT NOT NULL,                           -- Év
        tipus_kod NVARCHAR(50) NOT NULL,           -- Termék típus kód
        termek_tipus NVARCHAR(10) NOT NULL DEFAULT 'FIX',
        
        -- Tervezett (másolva a heti tervből az adott napra)
        tervezett_db INT NOT NULL DEFAULT 0,
        tervezett_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Teljesült (SAP-ból / Excel-ből)
        teljesult_db INT NOT NULL DEFAULT 0,
        teljesult_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Különbség (számított)
        kulonbseg_db AS (teljesult_db - tervezett_db) PERSISTED,
        kulonbseg_perc AS (teljesult_perc - tervezett_perc) PERSISTED,
        
        -- Lemaradás kezelés (előző napokról áthozott)
        athozott_lemaradas_db INT NOT NULL DEFAULT 0,
        athozott_tobblet_db INT NOT NULL DEFAULT 0,
        
        -- Korrigált terv (terv + áthozott lemaradás - áthozott többlet)
        korrigalt_terv_db AS (tervezett_db + athozott_lemaradas_db - athozott_tobblet_db) PERSISTED,
        
        -- Státusz
        statusz NVARCHAR(20) NOT NULL DEFAULT 'TERV',  -- 'TERV', 'FOLYAMATBAN', 'LEZART'
        
        -- Meta
        forras_sheet NVARCHAR(100) NULL,
        utolso_szinkron DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        
        CONSTRAINT UQ_napi_teljesules UNIQUE (datum, tipus_kod)
    );

    CREATE INDEX IX_napi_teljesules_datum ON dbo.ainova_napi_teljesules(datum);
    CREATE INDEX IX_napi_teljesules_het ON dbo.ainova_napi_teljesules(ev, het_szam);
    CREATE INDEX IX_napi_teljesules_tipus ON dbo.ainova_napi_teljesules(tipus_kod);
    CREATE INDEX IX_napi_teljesules_statusz ON dbo.ainova_napi_teljesules(statusz);

    PRINT 'ainova_napi_teljesules tábla létrehozva';
END
GO

-- =====================================================
-- 7. TÁBLA: ainova_szinkron_log
-- Excel szinkronizáció napló (2 óránként fut)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_szinkron_log')
BEGIN
    CREATE TABLE dbo.ainova_szinkron_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        szinkron_tipus NVARCHAR(20) NOT NULL,      -- 'HETI_TERV', 'NAPI_TELJESULES'
        het_szam INT NULL,
        ev INT NULL,
        
        -- Eredmény
        uj_rekordok INT NOT NULL DEFAULT 0,
        frissitett_rekordok INT NOT NULL DEFAULT 0,
        hibak INT NOT NULL DEFAULT 0,
        
        -- Státusz
        statusz NVARCHAR(20) NOT NULL,             -- 'SIKERES', 'HIBA', 'NINCS_VALTOZAS'
        hiba_uzenet NVARCHAR(MAX) NULL,
        
        -- Időpontok
        kezdet DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        veg DATETIME2 NULL,
        forras_fajl NVARCHAR(500) NULL
    );

    CREATE INDEX IX_szinkron_log_datum ON dbo.ainova_szinkron_log(kezdet);
    CREATE INDEX IX_szinkron_log_tipus ON dbo.ainova_szinkron_log(szinkron_tipus);

    PRINT 'ainova_szinkron_log tábla létrehozva';
END
GO

-- =====================================================
-- 8. TÁBLA: ainova_munkanap_config
-- Munkanapok és műszakok konfigurációja
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_munkanap_config')
BEGIN
    CREATE TABLE dbo.ainova_munkanap_config (
        id INT IDENTITY(1,1) PRIMARY KEY,
        config_nev NVARCHAR(50) NOT NULL UNIQUE,
        napi_munkaido_perc INT NOT NULL DEFAULT 480,      -- 8 óra = 480 perc
        heti_munkanapok INT NOT NULL DEFAULT 5,           -- Hétfő-Péntek
        havi_atlag_munkanapok DECIMAL(5,2) NOT NULL DEFAULT 21.5,
        muszak_szam INT NOT NULL DEFAULT 1,               -- Hány műszakban dolgoznak
        hatekonyság_szazalek INT NOT NULL DEFAULT 85,     -- 85% hatékonyság
        aktiv BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );

    -- Alapértelmezett konfiguráció
    INSERT INTO dbo.ainova_munkanap_config 
    (config_nev, napi_munkaido_perc, heti_munkanapok, havi_atlag_munkanapok, muszak_szam, hatekonyság_szazalek) VALUES
    ('ALAP', 480, 5, 21.5, 1, 85),
    ('KET_MUSZAK', 480, 5, 21.5, 2, 85),
    ('HAROM_MUSZAK', 480, 5, 21.5, 3, 85);

    PRINT 'ainova_munkanap_config tábla létrehozva';
END
GO

-- =====================================================
-- 9. NÉZET: vw_heti_terv_osszesito
-- FANCY TÁBLÁZAT #1: Heti terv összesítő
-- Típusonként napi db + perc, heti összesítő
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_heti_terv_osszesito')
    DROP VIEW dbo.vw_heti_terv_osszesito;
GO

CREATE VIEW dbo.vw_heti_terv_osszesito AS
SELECT 
    ht.ev,
    ht.het_szam,
    ht.het_kezdet,
    ht.het_veg,
    ht.tipus_kod,
    ht.termek_tipus,
    
    -- Normaidő per darab (K.Z normából)
    ISNULL(tn.osszeg_normido_perc, 0) AS norma_per_db,
    
    -- Hétfő
    ht.hetfo_db,
    ht.hetfo_db * ISNULL(tn.osszeg_normido_perc, 0) AS hetfo_perc,
    
    -- Kedd
    ht.kedd_db,
    ht.kedd_db * ISNULL(tn.osszeg_normido_perc, 0) AS kedd_perc,
    
    -- Szerda
    ht.szerda_db,
    ht.szerda_db * ISNULL(tn.osszeg_normido_perc, 0) AS szerda_perc,
    
    -- Csütörtök
    ht.csutortok_db,
    ht.csutortok_db * ISNULL(tn.osszeg_normido_perc, 0) AS csutortok_perc,
    
    -- Péntek
    ht.pentek_db,
    ht.pentek_db * ISNULL(tn.osszeg_normido_perc, 0) AS pentek_perc,
    
    -- Heti összesítő
    (ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) AS heti_ossz_db,
    (ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) 
        * ISNULL(tn.osszeg_normido_perc, 0) AS heti_ossz_perc,
    
    ht.utolso_szinkron

FROM ainova_heti_terv ht
LEFT JOIN ainova_termek_normak tn ON ht.tipus_kod = tn.tipus_kod;
GO

PRINT 'vw_heti_terv_osszesito nézet létrehozva';
GO

-- =====================================================
-- 10. NÉZET: vw_napi_osszesito
-- Napi összesítő sor (összes típus az adott napon)
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_napi_osszesito')
    DROP VIEW dbo.vw_napi_osszesito;
GO

CREATE VIEW dbo.vw_napi_osszesito AS
SELECT 
    ev,
    het_szam,
    het_kezdet,
    
    -- Hétfő összesen
    SUM(hetfo_db) AS hetfo_ossz_db,
    SUM(hetfo_db * ISNULL(tn.osszeg_normido_perc, 0)) AS hetfo_ossz_perc,
    
    -- Kedd összesen
    SUM(kedd_db) AS kedd_ossz_db,
    SUM(kedd_db * ISNULL(tn.osszeg_normido_perc, 0)) AS kedd_ossz_perc,
    
    -- Szerda összesen
    SUM(szerda_db) AS szerda_ossz_db,
    SUM(szerda_db * ISNULL(tn.osszeg_normido_perc, 0)) AS szerda_ossz_perc,
    
    -- Csütörtök összesen
    SUM(csutortok_db) AS csutortok_ossz_db,
    SUM(csutortok_db * ISNULL(tn.osszeg_normido_perc, 0)) AS csutortok_ossz_perc,
    
    -- Péntek összesen
    SUM(pentek_db) AS pentek_ossz_db,
    SUM(pentek_db * ISNULL(tn.osszeg_normido_perc, 0)) AS pentek_ossz_perc,
    
    -- Heti GRAND TOTAL
    SUM(hetfo_db + kedd_db + szerda_db + csutortok_db + pentek_db) AS heti_grand_total_db,
    SUM((hetfo_db + kedd_db + szerda_db + csutortok_db + pentek_db) 
        * ISNULL(tn.osszeg_normido_perc, 0)) AS heti_grand_total_perc

FROM ainova_heti_terv ht
LEFT JOIN ainova_termek_normak tn ON ht.tipus_kod = tn.tipus_kod
GROUP BY ev, het_szam, het_kezdet;
GO

PRINT 'vw_napi_osszesito nézet létrehozva';
GO

-- =====================================================
-- 11. NÉZET: vw_teljesules_felkovetes
-- FANCY TÁBLÁZAT #2: Napi teljesülés + lemaradás/többlet
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_teljesules_felkovetes')
    DROP VIEW dbo.vw_teljesules_felkovetes;
GO

CREATE VIEW dbo.vw_teljesules_felkovetes AS
SELECT 
    nt.datum,
    nt.het_szam,
    nt.ev,
    DATENAME(WEEKDAY, nt.datum) AS nap_nev,
    nt.tipus_kod,
    nt.termek_tipus,
    
    -- Eredeti terv
    nt.tervezett_db,
    nt.tervezett_perc,
    
    -- Áthozott előző napokról
    nt.athozott_lemaradas_db,
    nt.athozott_tobblet_db,
    
    -- Korrigált terv (amit ténylegesen el kell érni)
    nt.korrigalt_terv_db,
    nt.korrigalt_terv_db * ISNULL(tn.osszeg_normido_perc, 0) AS korrigalt_terv_perc,
    
    -- Teljesült
    nt.teljesult_db,
    nt.teljesult_perc,
    
    -- Különbség (+ = többlet, - = lemaradás)
    nt.kulonbseg_db,
    nt.kulonbseg_perc,
    
    -- Státusz jelzés
    CASE 
        WHEN nt.statusz = 'TERV' THEN '📋 Terv'
        WHEN nt.statusz = 'FOLYAMATBAN' THEN '🔄 Folyamatban'
        WHEN nt.kulonbseg_db >= 0 THEN '✅ Teljesült'
        WHEN nt.kulonbseg_db < 0 AND nt.kulonbseg_db > -5 THEN '⚠️ Kis lemaradás'
        ELSE '🔴 LEMARADÁS!'
    END AS statusz_jelzes,
    
    -- Következő napra átvihető
    CASE 
        WHEN nt.kulonbseg_db < 0 THEN ABS(nt.kulonbseg_db)
        ELSE 0
    END AS kovetkezo_napra_lemaradas,
    
    CASE 
        WHEN nt.kulonbseg_db > 0 THEN nt.kulonbseg_db
        ELSE 0
    END AS kovetkezo_napra_tobblet,
    
    nt.statusz,
    nt.utolso_szinkron

FROM ainova_napi_teljesules nt
LEFT JOIN ainova_termek_normak tn ON nt.tipus_kod = tn.tipus_kod;
GO

PRINT 'vw_teljesules_felkovetes nézet létrehozva';
GO

-- =====================================================
-- 12. NÉZET: vw_heti_teljesules_osszesito
-- Heti teljesülés összesítő típusonként
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_heti_teljesules_osszesito')
    DROP VIEW dbo.vw_heti_teljesules_osszesito;
GO

CREATE VIEW dbo.vw_heti_teljesules_osszesito AS
SELECT 
    ev,
    het_szam,
    tipus_kod,
    termek_tipus,
    
    -- Heti terv összesen
    SUM(tervezett_db) AS heti_tervezett_db,
    SUM(tervezett_perc) AS heti_tervezett_perc,
    
    -- Heti teljesült összesen
    SUM(teljesult_db) AS heti_teljesult_db,
    SUM(teljesult_perc) AS heti_teljesult_perc,
    
    -- Heti különbség
    SUM(kulonbseg_db) AS heti_kulonbseg_db,
    SUM(kulonbseg_perc) AS heti_kulonbseg_perc,
    
    -- Teljesítés %
    CASE 
        WHEN SUM(tervezett_db) = 0 THEN 100
        ELSE CAST(SUM(teljesult_db) * 100.0 / NULLIF(SUM(tervezett_db), 0) AS DECIMAL(5,1))
    END AS teljesites_szazalek,
    
    -- Státusz
    CASE 
        WHEN SUM(kulonbseg_db) >= 0 THEN '✅ OK'
        WHEN SUM(kulonbseg_db) >= -10 THEN '⚠️ Kis lemaradás'
        ELSE '🔴 LEMARADÁS'
    END AS heti_statusz

FROM ainova_napi_teljesules
GROUP BY ev, het_szam, tipus_kod, termek_tipus;
GO

PRINT 'vw_heti_teljesules_osszesito nézet létrehozva';
GO

-- =====================================================
-- 13. NÉZET: vw_termek_kategoria_normak
-- Terméktípusonként összesített normaidő kategóriánként
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_termek_kategoria_normak')
    DROP VIEW dbo.vw_termek_kategoria_normak;
GO

CREATE VIEW dbo.vw_termek_kategoria_normak AS
SELECT 
    tsi.tipus_kod,
    fk.kod AS kategoria_kod,
    fk.nev AS kategoria_nev,
    fk.sorrend,
    SUM(tsi.normido_perc) AS kategoria_ossz_perc
FROM ainova_termek_sap_idok tsi
INNER JOIN ainova_sap_folyamatok sf ON tsi.sap_folyamat_id = sf.id
INNER JOIN ainova_folyamat_kategoriak fk ON sf.kategoria_kod = fk.kod
GROUP BY tsi.tipus_kod, fk.kod, fk.nev, fk.sorrend;
GO

PRINT 'vw_termek_kategoria_normak nézet létrehozva';
GO

-- =====================================================
-- 14. TÁROLT ELJÁRÁS: sp_lemaradas_frissites
-- Frissíti az áthozott lemaradás/többlet értékeket
-- Minden reggel futtatandó (előző nap zárása után)
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_lemaradas_frissites')
    DROP PROCEDURE dbo.sp_lemaradas_frissites;
GO

CREATE PROCEDURE dbo.sp_lemaradas_frissites
    @datum DATE = NULL  -- Ha NULL, akkor mai nap
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @datum IS NULL
        SET @datum = CAST(GETDATE() AS DATE);
    
    DECLARE @elozo_nap DATE = DATEADD(DAY, -1, @datum);
    
    -- Előző nap lezárása (ha még nem volt)
    UPDATE ainova_napi_teljesules
    SET statusz = 'LEZART',
        updated_at = SYSDATETIME()
    WHERE datum = @elozo_nap
      AND statusz = 'FOLYAMATBAN';
    
    -- Mai napra átvitel az előző napi különbségből
    UPDATE mai
    SET 
        athozott_lemaradas_db = CASE 
            WHEN elozo.kulonbseg_db < 0 THEN ABS(elozo.kulonbseg_db) + elozo.athozott_lemaradas_db - elozo.athozott_tobblet_db
            ELSE 0
        END,
        athozott_tobblet_db = CASE 
            WHEN elozo.kulonbseg_db > 0 THEN elozo.kulonbseg_db
            ELSE 0
        END,
        updated_at = SYSDATETIME()
    FROM ainova_napi_teljesules mai
    INNER JOIN ainova_napi_teljesules elozo 
        ON mai.tipus_kod = elozo.tipus_kod 
        AND elozo.datum = @elozo_nap
    WHERE mai.datum = @datum;
    
    -- Mai nap státusz: FOLYAMATBAN
    UPDATE ainova_napi_teljesules
    SET statusz = 'FOLYAMATBAN',
        updated_at = SYSDATETIME()
    WHERE datum = @datum
      AND statusz = 'TERV';
    
    SELECT 
        'Lemaradás frissítve' AS uzenet,
        @elozo_nap AS elozo_nap_lezarva,
        @datum AS mai_nap_frissitve,
        COUNT(*) AS frissitett_sorok
    FROM ainova_napi_teljesules
    WHERE datum = @datum;
END
GO

PRINT 'sp_lemaradas_frissites tárolt eljárás létrehozva';
GO

-- =====================================================
-- 15. TÁROLT ELJÁRÁS: sp_heti_letszam_szamitas
-- Létszámigény számítása a heti tervből
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_heti_letszam_szamitas')
    DROP PROCEDURE dbo.sp_heti_letszam_szamitas;
GO

CREATE PROCEDURE dbo.sp_heti_letszam_szamitas
    @het_szam INT = NULL,
    @ev INT = NULL,
    @config_nev NVARCHAR(50) = 'ALAP'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Alapértelmezett: aktuális hét
    IF @ev IS NULL SET @ev = YEAR(GETDATE());
    IF @het_szam IS NULL SET @het_szam = DATEPART(WEEK, GETDATE());
    
    DECLARE @napi_perc INT, @hatekonyság INT, @muszak_szam INT;
    
    SELECT 
        @napi_perc = napi_munkaido_perc,
        @hatekonyság = hatekonyság_szazalek,
        @muszak_szam = muszak_szam
    FROM ainova_munkanap_config
    WHERE config_nev = @config_nev;
    
    DECLARE @kapacitas_per_fo_per_nap DECIMAL(10,2) = @napi_perc * @muszak_szam * (@hatekonyság / 100.0);
    
    -- Kategóriánkénti létszámigény naponta
    SELECT 
        fk.kod AS kategoria_kod,
        fk.nev AS kategoria_nev,
        fk.sorrend,
        
        -- Hétfő
        CEILING(SUM(ht.hetfo_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap) AS hetfo_letszam,
        SUM(ht.hetfo_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS hetfo_perc,
        
        -- Kedd
        CEILING(SUM(ht.kedd_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap) AS kedd_letszam,
        SUM(ht.kedd_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS kedd_perc,
        
        -- Szerda
        CEILING(SUM(ht.szerda_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap) AS szerda_letszam,
        SUM(ht.szerda_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS szerda_perc,
        
        -- Csütörtök
        CEILING(SUM(ht.csutortok_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap) AS csutortok_letszam,
        SUM(ht.csutortok_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS csutortok_perc,
        
        -- Péntek
        CEILING(SUM(ht.pentek_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap) AS pentek_letszam,
        SUM(ht.pentek_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS pentek_perc,
        
        -- Heti átlag létszám
        CEILING(
            SUM((ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) 
                * ISNULL(tkn.kategoria_ossz_perc, 0)) / (@kapacitas_per_fo_per_nap * 5)
        ) AS heti_atlag_letszam,
        
        -- Heti max létszám (legnagyobb napi igény)
        (SELECT MAX(v) FROM (VALUES 
            (CEILING(SUM(ht.hetfo_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap)),
            (CEILING(SUM(ht.kedd_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap)),
            (CEILING(SUM(ht.szerda_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap)),
            (CEILING(SUM(ht.csutortok_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap)),
            (CEILING(SUM(ht.pentek_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas_per_fo_per_nap))
        ) AS t(v)) AS heti_max_letszam

    FROM ainova_heti_terv ht
    LEFT JOIN vw_termek_kategoria_normak tkn ON ht.tipus_kod = tkn.tipus_kod
    INNER JOIN ainova_folyamat_kategoriak fk ON tkn.kategoria_kod = fk.kod
    WHERE ht.ev = @ev AND ht.het_szam = @het_szam
    GROUP BY fk.kod, fk.nev, fk.sorrend
    ORDER BY fk.sorrend;
    
    -- Összesítő
    SELECT 
        'ÖSSZESEN' AS kategoria,
        @het_szam AS het_szam,
        @ev AS ev,
        @kapacitas_per_fo_per_nap AS kapacitas_per_fo_nap,
        @config_nev AS config
    ;
END
GO

PRINT 'sp_heti_letszam_szamitas tárolt eljárás létrehozva';
GO

-- =====================================================
-- 16. TÁROLT ELJÁRÁS: sp_napi_teljesules_riport
-- Napi teljesülés riport lemaradásokkal
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_napi_teljesules_riport')
    DROP PROCEDURE dbo.sp_napi_teljesules_riport;
GO

CREATE PROCEDURE dbo.sp_napi_teljesules_riport
    @datum DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @datum IS NULL
        SET @datum = CAST(GETDATE() AS DATE);
    
    -- Típusonkénti részletes riport
    SELECT 
        tipus_kod,
        termek_tipus,
        
        -- Eredeti terv
        tervezett_db AS 'Terv (db)',
        
        -- Áthozott
        athozott_lemaradas_db AS 'Áthozott lemaradás',
        athozott_tobblet_db AS 'Áthozott többlet',
        
        -- Korrigált (amit tényleg el kell érni)
        korrigalt_terv_db AS 'MA KELL (db)',
        
        -- Teljesült
        teljesult_db AS 'Teljesült (db)',
        
        -- Különbség
        kulonbseg_db AS 'Különbség',
        
        -- Százalék
        CASE 
            WHEN korrigalt_terv_db = 0 THEN 100
            ELSE CAST(teljesult_db * 100.0 / NULLIF(korrigalt_terv_db, 0) AS DECIMAL(5,1))
        END AS 'Teljesítés %',
        
        -- Státusz emoji
        CASE 
            WHEN kulonbseg_db >= 0 THEN '✅'
            WHEN kulonbseg_db >= -5 THEN '⚠️'
            ELSE '🔴'
        END AS 'Státusz',
        
        -- Holnapra megy
        CASE WHEN kulonbseg_db < 0 THEN ABS(kulonbseg_db) ELSE 0 END AS 'Holnapra lemaradás',
        CASE WHEN kulonbseg_db > 0 THEN kulonbseg_db ELSE 0 END AS 'Holnapra többlet'
        
    FROM ainova_napi_teljesules
    WHERE datum = @datum
    ORDER BY 
        CASE WHEN kulonbseg_db < 0 THEN 0 ELSE 1 END,  -- Lemaradások elől
        kulonbseg_db ASC;
    
    -- Összesítő
    SELECT 
        @datum AS datum,
        COUNT(*) AS tipusok_szama,
        SUM(tervezett_db) AS ossz_tervezett,
        SUM(teljesult_db) AS ossz_teljesult,
        SUM(kulonbseg_db) AS ossz_kulonbseg,
        SUM(CASE WHEN kulonbseg_db < 0 THEN 1 ELSE 0 END) AS lemarado_tipusok,
        SUM(CASE WHEN kulonbseg_db >= 0 THEN 1 ELSE 0 END) AS teljesitett_tipusok
    FROM ainova_napi_teljesules
    WHERE datum = @datum;
END
GO

PRINT 'sp_napi_teljesules_riport tárolt eljárás létrehozva';
GO
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_letszam_szamitas')
    DROP PROCEDURE dbo.sp_letszam_szamitas;
GO

CREATE PROCEDURE dbo.sp_letszam_szamitas
    @idoszak_kezdet DATE = NULL,
    @idoszak_veg DATE = NULL,
    @config_nev NVARCHAR(50) = 'ALAP'
AS
BEGIN
    SET NOCOUNT ON;

    -- Ha nincs megadva, aktuális hét
    IF @idoszak_kezdet IS NULL
        SET @idoszak_kezdet = DATEADD(DAY, 1-DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE));
    IF @idoszak_veg IS NULL
        SET @idoszak_veg = DATEADD(DAY, 4, @idoszak_kezdet); -- Hétfő-Péntek

    DECLARE @munkanapok INT = DATEDIFF(DAY, @idoszak_kezdet, @idoszak_veg) + 1;
    DECLARE @napi_perc INT, @hatekonyság INT, @muszak_szam INT;

    SELECT 
        @napi_perc = napi_munkaido_perc,
        @hatekonyság = hatekonyság_szazalek,
        @muszak_szam = muszak_szam
    FROM ainova_munkanap_config
    WHERE config_nev = @config_nev;

    -- Effektív kapacitás per fő per nap (hatékonysággal)
    DECLARE @kapacitas_per_fo_per_nap DECIMAL(10,2) = @napi_perc * @muszak_szam * (@hatekonyság / 100.0);

    -- Eredmény tábla
    SELECT 
        fk.kod AS kategoria_kod,
        fk.nev AS kategoria_nev,
        fk.sorrend,
        
        -- Szükséges percek
        SUM(tkn.kategoria_ossz_perc * gi.tervezett_darab) AS ossz_szukseges_perc,
        
        -- Napi átlag (ha több napos az időszak)
        SUM(tkn.kategoria_ossz_perc * gi.tervezett_darab) / NULLIF(@munkanapok, 0) AS napi_atlag_perc,
        
        -- Szükséges létszám (kerekítve felfelé)
        CEILING(
            SUM(tkn.kategoria_ossz_perc * gi.tervezett_darab) / 
            NULLIF(@kapacitas_per_fo_per_nap * @munkanapok, 0)
        ) AS szukseges_letszam,
        
        -- Pontos létszám (tizedes)
        CAST(
            SUM(tkn.kategoria_ossz_perc * gi.tervezett_darab) / 
            NULLIF(@kapacitas_per_fo_per_nap * @munkanapok, 0) 
        AS DECIMAL(10,2)) AS letszam_pontos,
        
        -- Konfiguráció info
        @idoszak_kezdet AS idoszak_kezdet,
        @idoszak_veg AS idoszak_veg,
        @munkanapok AS munkanapok,
        @kapacitas_per_fo_per_nap AS kapacitas_per_fo_nap

    FROM ainova_gyartasi_igeny gi
    INNER JOIN vw_termek_kategoria_normak tkn ON gi.tipus_kod = tkn.tipus_kod
    INNER JOIN ainova_folyamat_kategoriak fk ON tkn.kategoria_kod = fk.kod
    WHERE gi.aktiv = 1
      AND (gi.idoszak_kezdet <= @idoszak_veg OR gi.idoszak_kezdet IS NULL)
      AND (gi.idoszak_veg >= @idoszak_kezdet OR gi.idoszak_veg IS NULL)
    GROUP BY fk.kod, fk.nev, fk.sorrend
    ORDER BY fk.sorrend;

    -- Összesítő sor
    SELECT 
        'ÖSSZESEN' AS kategoria,
        SUM(tkn.kategoria_ossz_perc * gi.tervezett_darab) AS ossz_szukseges_perc,
        CEILING(
            SUM(tkn.kategoria_ossz_perc * gi.tervezett_darab) / 
            NULLIF(@kapacitas_per_fo_per_nap * @munkanapok, 0)
        ) AS ossz_szukseges_letszam
    FROM ainova_gyartasi_igeny gi
    INNER JOIN vw_termek_kategoria_normak tkn ON gi.tipus_kod = tkn.tipus_kod
    WHERE gi.aktiv = 1;
END
GO

PRINT 'sp_letszam_szamitas tárolt eljárás létrehozva';
GO

-- =====================================================
-- 10. TÁROLT ELJÁRÁS: sp_reszletes_letszam
-- Részletes létszámigény típusonként és kategóriánként
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_reszletes_letszam')
    DROP PROCEDURE dbo.sp_reszletes_letszam;
GO

CREATE PROCEDURE dbo.sp_reszletes_letszam
    @idoszak_kezdet DATE = NULL,
    @idoszak_veg DATE = NULL,
    @config_nev NVARCHAR(50) = 'ALAP'
AS
BEGIN
    SET NOCOUNT ON;

    IF @idoszak_kezdet IS NULL
        SET @idoszak_kezdet = DATEADD(DAY, 1-DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE));
    IF @idoszak_veg IS NULL
        SET @idoszak_veg = DATEADD(DAY, 4, @idoszak_kezdet);

    DECLARE @munkanapok INT = DATEDIFF(DAY, @idoszak_kezdet, @idoszak_veg) + 1;
    DECLARE @napi_perc INT, @hatekonyság INT, @muszak_szam INT;

    SELECT 
        @napi_perc = napi_munkaido_perc,
        @hatekonyság = hatekonyság_szazalek,
        @muszak_szam = muszak_szam
    FROM ainova_munkanap_config
    WHERE config_nev = @config_nev;

    DECLARE @kapacitas_per_fo_per_nap DECIMAL(10,2) = @napi_perc * @muszak_szam * (@hatekonyság / 100.0);

    -- Részletes bontás típusonként
    SELECT 
        gi.tipus_kod,
        gi.tervezett_darab,
        fk.kod AS kategoria_kod,
        fk.nev AS kategoria_nev,
        
        -- 1 db normaideje
        tkn.kategoria_ossz_perc AS norma_per_db,
        
        -- Összes szükséges perc erre a típusra ebben a kategóriában
        tkn.kategoria_ossz_perc * gi.tervezett_darab AS ossz_perc,
        
        -- Napi átlag
        (tkn.kategoria_ossz_perc * gi.tervezett_darab) / NULLIF(@munkanapok, 0) AS napi_perc,
        
        -- Heti (teljes időszak)
        tkn.kategoria_ossz_perc * gi.tervezett_darab AS heti_perc,
        
        -- Havi (x4.3)
        tkn.kategoria_ossz_perc * gi.tervezett_darab * 4.3 AS havi_perc

    FROM ainova_gyartasi_igeny gi
    INNER JOIN vw_termek_kategoria_normak tkn ON gi.tipus_kod = tkn.tipus_kod
    INNER JOIN ainova_folyamat_kategoriak fk ON tkn.kategoria_kod = fk.kod
    WHERE gi.aktiv = 1
    ORDER BY gi.tipus_kod, fk.sorrend;
END
GO

PRINT 'sp_reszletes_letszam tárolt eljárás létrehozva';
GO

-- =====================================================
-- 11. TÁROLT ELJÁRÁS: sp_napi_heti_havi_letszam
-- Napi/Heti/Havi bontás egy nézetben
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_napi_heti_havi_letszam')
    DROP PROCEDURE dbo.sp_napi_heti_havi_letszam;
GO

CREATE PROCEDURE dbo.sp_napi_heti_havi_letszam
    @tervezett_darabok NVARCHAR(MAX),  -- JSON: [{"tipus":"B86101A","darab":5},...]
    @config_nev NVARCHAR(50) = 'ALAP'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @napi_perc INT, @hatekonyság INT, @muszak_szam INT, @heti_napok INT, @havi_napok DECIMAL(5,2);

    SELECT 
        @napi_perc = napi_munkaido_perc,
        @hatekonyság = hatekonyság_szazalek,
        @muszak_szam = muszak_szam,
        @heti_napok = heti_munkanapok,
        @havi_napok = havi_atlag_munkanapok
    FROM ainova_munkanap_config
    WHERE config_nev = @config_nev;

    DECLARE @kapacitas_per_fo_per_nap DECIMAL(10,2) = @napi_perc * @muszak_szam * (@hatekonyság / 100.0);

    -- Ideiglenes tábla a tervezett daraboknak
    CREATE TABLE #TervDarab (tipus_kod NVARCHAR(50), darab INT);

    -- JSON feldolgozása
    INSERT INTO #TervDarab (tipus_kod, darab)
    SELECT 
        JSON_VALUE(value, '$.tipus') AS tipus_kod,
        CAST(JSON_VALUE(value, '$.darab') AS INT) AS darab
    FROM OPENJSON(@tervezett_darabok);

    -- Eredmény
    SELECT 
        fk.kod AS kategoria_kod,
        fk.nev AS kategoria_nev,
        fk.sorrend,
        
        -- NAPI szükséges percek és létszám
        SUM(tkn.kategoria_ossz_perc * td.darab) AS napi_ossz_perc,
        CEILING(SUM(tkn.kategoria_ossz_perc * td.darab) / @kapacitas_per_fo_per_nap) AS napi_letszam,
        CAST(SUM(tkn.kategoria_ossz_perc * td.darab) / @kapacitas_per_fo_per_nap AS DECIMAL(10,2)) AS napi_letszam_pontos,
        
        -- HETI szükséges percek és létszám
        SUM(tkn.kategoria_ossz_perc * td.darab) * @heti_napok AS heti_ossz_perc,
        CEILING(SUM(tkn.kategoria_ossz_perc * td.darab) / @kapacitas_per_fo_per_nap) AS heti_letszam,
        
        -- HAVI szükséges percek és létszám
        SUM(tkn.kategoria_ossz_perc * td.darab) * @havi_napok AS havi_ossz_perc,
        CEILING(SUM(tkn.kategoria_ossz_perc * td.darab) / @kapacitas_per_fo_per_nap) AS havi_letszam,
        
        -- Konfig info
        @kapacitas_per_fo_per_nap AS kapacitas_perc_fo_nap

    FROM #TervDarab td
    INNER JOIN vw_termek_kategoria_normak tkn ON td.tipus_kod = tkn.tipus_kod
    INNER JOIN ainova_folyamat_kategoriak fk ON tkn.kategoria_kod = fk.kod
    GROUP BY fk.kod, fk.nev, fk.sorrend
    ORDER BY fk.sorrend;

    DROP TABLE #TervDarab;
END
GO

PRINT 'sp_napi_heti_havi_letszam tárolt eljárás létrehozva';
GO

-- =====================================================
-- ELLENŐRZŐ LEKÉRDEZÉSEK
-- =====================================================

-- Kategóriák összesítése
SELECT 
    k.kod,
    k.nev,
    k.sorrend,
    COUNT(f.id) AS sap_lepesek_szama
FROM ainova_folyamat_kategoriak k
LEFT JOIN ainova_sap_folyamatok f ON k.kod = f.kategoria_kod
GROUP BY k.kod, k.nev, k.sorrend
ORDER BY k.sorrend;

-- Összes SAP lépés
SELECT 
    'Összes SAP lépés' AS info,
    COUNT(*) AS darab
FROM ainova_sap_folyamatok;

-- Átsorolt műveletek listája
SELECT 
    sap_nev,
    kategoria_kod AS uj_kategoria,
    eredeti_kategoria,
    megjegyzes
FROM ainova_sap_folyamatok
WHERE eredeti_kategoria IS NOT NULL
ORDER BY kategoria_kod, sap_nev;

PRINT '';
PRINT '=== AINOVA Folyamat és Termék Normák - Telepítés kész! ===';
PRINT '';
PRINT 'Használat:';
PRINT '  1. Töltsd fel ainova_termek_sap_idok táblát az Excel K.Z norma adatokból';
PRINT '  2. Adj meg gyártási igényt: INSERT INTO ainova_gyartasi_igeny (tipus_kod, idoszak_tipus, idoszak_kezdet, tervezett_darab)';
PRINT '  3. Futtasd: EXEC sp_letszam_szamitas';
PRINT '  4. Vagy JSON-nal: EXEC sp_napi_heti_havi_letszam ''[{"tipus":"B86101A","darab":5},{"tipus":"B86102A","darab":7}]''';
PRINT '';
GO

-- =====================================================
-- PÉLDA HASZNÁLAT (kommentezve)
-- =====================================================
/*
-- 1. Gyártási igény megadása
INSERT INTO ainova_gyartasi_igeny (tipus_kod, idoszak_tipus, idoszak_kezdet, tervezett_darab) VALUES
('B86101A 66L158', 'HET', '2026-01-13', 50),
('B86102A 66L159', 'HET', '2026-01-13', 30),
('B86103A 66L160', 'HET', '2026-01-13', 25);

-- 2. Létszámigény lekérdezése
EXEC sp_letszam_szamitas @idoszak_kezdet = '2026-01-13', @idoszak_veg = '2026-01-17';

-- 3. Részletes bontás típusonként
EXEC sp_reszletes_letszam @idoszak_kezdet = '2026-01-13', @idoszak_veg = '2026-01-17';

-- 4. JSON alapú gyors számítás (napi igény)
EXEC sp_napi_heti_havi_letszam 
    @tervezett_darabok = '[{"tipus":"B86101A 66L158","darab":10},{"tipus":"B86102A 66L159","darab":6}]',
    @config_nev = 'ALAP';

-- Konfiguráció változtatása két műszakra
EXEC sp_napi_heti_havi_letszam 
    @tervezett_darabok = '[{"tipus":"B86101A 66L158","darab":10}]',
    @config_nev = 'KET_MUSZAK';
*/
