-- =====================================================
-- AINOVA - Teljesítmény tábla létrehozása
-- =====================================================
-- Ez a script létrehozza a teljesítmény adatokat tároló táblát
-- Az Excel importból töltjük fel az adatokat
-- =====================================================

USE LaC_BasicDatas_TEST;
GO

-- Teljesítmény tábla (napi perc adatok operátoronként)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_teljesitmeny')
BEGIN
    CREATE TABLE dbo.ainova_teljesitmeny (
        id INT IDENTITY(1,1) PRIMARY KEY,
        datum DATE NOT NULL,                    -- Nap
        muszak NVARCHAR(10) NOT NULL,           -- A, B, C
        torzsszam NVARCHAR(20) NOT NULL,        -- Operátor törzsszáma (VSZ)
        nev NVARCHAR(100) NOT NULL,             -- Operátor neve
        leadott_perc INT NOT NULL DEFAULT 0,    -- Leadott percek
        szazalek AS CAST(CAST(leadott_perc AS DECIMAL(8,2)) / 480.0 * 100 AS DECIMAL(6,2)) PERSISTED, -- 480 = 100%
        imported_at DATETIME DEFAULT GETDATE(), -- Import időpontja
        
        CONSTRAINT UQ_teljesitmeny_datum_muszak_torzsszam 
            UNIQUE (datum, muszak, torzsszam)   -- Egy ember egy nap egy műszakban egyszer
    );

    CREATE INDEX IX_teljesitmeny_datum ON dbo.ainova_teljesitmeny(datum);
    CREATE INDEX IX_teljesitmeny_muszak ON dbo.ainova_teljesitmeny(muszak);
    CREATE INDEX IX_teljesitmeny_torzsszam ON dbo.ainova_teljesitmeny(torzsszam);

    PRINT 'ainova_teljesitmeny tábla létrehozva.';
END
ELSE
BEGIN
    PRINT 'ainova_teljesitmeny tábla már létezik.';
END
GO

-- =====================================================
-- Hasznos view-k a statisztikákhoz
-- =====================================================

-- Napi műszak összesítés
IF EXISTS (SELECT * FROM sys.views WHERE name = 'v_muszak_teljesitmeny_napi')
    DROP VIEW dbo.v_muszak_teljesitmeny_napi;
GO

CREATE VIEW dbo.v_muszak_teljesitmeny_napi AS
SELECT 
    datum,
    muszak,
    COUNT(*) AS letszam,
    SUM(leadott_perc) AS ossz_perc,
    AVG(CAST(leadott_perc AS FLOAT)) AS atlag_perc,
    AVG(szazalek) AS atlag_szazalek,
    MIN(szazalek) AS min_szazalek,
    MAX(szazalek) AS max_szazalek,
    -- Műszak teljesítmény: össz perc / (létszám * 480) * 100
    CAST(SUM(leadott_perc) AS FLOAT) / (COUNT(*) * 480) * 100 AS muszak_szazalek
FROM dbo.ainova_teljesitmeny
GROUP BY datum, muszak;
GO

PRINT 'v_muszak_teljesitmeny_napi view létrehozva.';
GO

-- Heti összesítés műszakonként
IF EXISTS (SELECT * FROM sys.views WHERE name = 'v_muszak_teljesitmeny_heti')
    DROP VIEW dbo.v_muszak_teljesitmeny_heti;
GO

CREATE VIEW dbo.v_muszak_teljesitmeny_heti AS
SELECT 
    DATEPART(YEAR, datum) AS ev,
    DATEPART(ISO_WEEK, datum) AS het,
    muszak,
    COUNT(DISTINCT datum) AS munkanapok,
    COUNT(*) AS ossz_muszak_ember,
    SUM(leadott_perc) AS ossz_perc,
    AVG(CAST(leadott_perc AS FLOAT)) AS atlag_perc_per_fo,
    AVG(szazalek) AS atlag_szazalek
FROM dbo.ainova_teljesitmeny
GROUP BY DATEPART(YEAR, datum), DATEPART(ISO_WEEK, datum), muszak;
GO

PRINT 'v_muszak_teljesitmeny_heti view létrehozva.';
GO

-- Egyéni teljesítmény összesítés (operátoronként)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'v_operator_teljesitmeny')
    DROP VIEW dbo.v_operator_teljesitmeny;
GO

CREATE VIEW dbo.v_operator_teljesitmeny AS
SELECT 
    torzsszam,
    nev,
    muszak,
    COUNT(*) AS munkanapok,
    SUM(leadott_perc) AS ossz_perc,
    AVG(CAST(leadott_perc AS FLOAT)) AS atlag_perc,
    AVG(szazalek) AS atlag_szazalek,
    MIN(szazalek) AS min_szazalek,
    MAX(szazalek) AS max_szazalek,
    MIN(datum) AS elso_nap,
    MAX(datum) AS utolso_nap
FROM dbo.ainova_teljesitmeny
GROUP BY torzsszam, nev, muszak;
GO

PRINT 'v_operator_teljesitmeny view létrehozva.';
GO

PRINT '';
PRINT '=== Teljesítmény táblák és view-k sikeresen létrehozva! ===';
