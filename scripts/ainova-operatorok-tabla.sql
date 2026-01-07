-- =====================================================
-- AINOVA - Operátorok tábla
-- =====================================================
-- Törzsszám, név, műszak, pozíció (admin állítja be)
-- Az Excel importból automatikusan szinkronizálódik
-- =====================================================

-- 1. Tábla létrehozása
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_operatorok')
BEGIN
    CREATE TABLE ainova_operatorok (
        id INT IDENTITY(1,1) PRIMARY KEY,
        torzsszam NVARCHAR(50) NOT NULL UNIQUE,
        nev NVARCHAR(100) NOT NULL,
        muszak NVARCHAR(10) NOT NULL,          -- A, B, C
        pozicio NVARCHAR(100) DEFAULT 'Admin adja meg',  -- Admin állítja be
        aktiv BIT DEFAULT 1,                   -- Aktív-e az operátor
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );

    -- Index a gyakori keresésekhez
    CREATE INDEX IX_ainova_operatorok_muszak ON ainova_operatorok(muszak);
    CREATE INDEX IX_ainova_operatorok_pozicio ON ainova_operatorok(pozicio);
    CREATE INDEX IX_ainova_operatorok_aktiv ON ainova_operatorok(aktiv);

    PRINT 'ainova_operatorok tábla létrehozva';
END
ELSE
BEGIN
    PRINT 'ainova_operatorok tábla már létezik';
END
GO

-- 2. Pozíciók referencia tábla (opcionális, admin dropdownhoz)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_poziciok')
BEGIN
    CREATE TABLE ainova_poziciok (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nev NVARCHAR(100) NOT NULL UNIQUE,
        kategoria NVARCHAR(50),  -- Produktív / Nem produktív
        sorrend INT DEFAULT 999
    );

    -- Alapértelmezett pozíciók beszúrása
    INSERT INTO ainova_poziciok (nev, kategoria, sorrend) VALUES
    -- Produktív pozíciók
    ('Előkészítő', 'Produktív', 1),
    ('Huzalos tekercselő', 'Produktív', 2),
    ('Fóliás tekercselő', 'Produktív', 3),
    ('Maró-ónozó', 'Produktív', 4),
    ('LaC szerelő', 'Produktív', 5),
    ('Kis DC szerelő', 'Produktív', 6),
    ('Nagy DC szerelő', 'Produktív', 7),
    ('Mérő', 'Produktív', 8),
    ('Impregnáló', 'Produktív', 9),
    ('Végszerelő', 'Produktív', 10),
    ('Csomagoló', 'Produktív', 11),
    -- Nem produktív pozíciók
    ('Gyártásszervező', 'Nem produktív', 20),
    ('Műszakvezető', 'Nem produktív', 21),
    ('Minőségellenőr', 'Nem produktív', 22),
    -- Alapértelmezett
    ('Admin adja meg', NULL, 999);

    PRINT 'ainova_poziciok tábla létrehozva és feltöltve';
END
ELSE
BEGIN
    PRINT 'ainova_poziciok tábla már létezik';
END
GO

-- 3. Operátorok szinkronizálása a meglévő teljesítmény adatokból
-- (Csak ha már van teljesítmény adat)
IF EXISTS (SELECT 1 FROM ainova_teljesitmeny)
BEGIN
    INSERT INTO ainova_operatorok (torzsszam, nev, muszak, pozicio, aktiv)
    SELECT DISTINCT 
        t.torzsszam,
        t.nev,
        t.muszak,
        'Admin adja meg',
        1
    FROM ainova_teljesitmeny t
    WHERE NOT EXISTS (
        SELECT 1 FROM ainova_operatorok o WHERE o.torzsszam = t.torzsszam
    );

    PRINT 'Operátorok szinkronizálva a teljesítmény táblából';
END
GO

-- 4. Ellenőrzés
SELECT 
    'Operátorok' as tabla,
    COUNT(*) as darab,
    COUNT(DISTINCT muszak) as muszakok,
    COUNT(CASE WHEN pozicio = 'Admin adja meg' THEN 1 END) as admin_adja_meg
FROM ainova_operatorok;

SELECT 
    'Pozíciók' as tabla,
    COUNT(*) as darab
FROM ainova_poziciok;
GO
