-- ============================================================
-- AINOVA - Napi Perces táblák létrehozása
-- Futtatás: SQL Server Management Studio-ban
-- FONTOS: Válaszd ki a megfelelő adatbázist!
-- ============================================================

-- Először válaszd ki a megfelelő adatbázist:
-- USE AINOVA_DEV;  -- vagy a te adatbázisod neve
-- GO

-- Tábla: ainova_napi_perces
IF OBJECT_ID('dbo.ainova_napi_perces', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ainova_napi_perces (
        id INT IDENTITY(1,1) PRIMARY KEY,
        datum DATE NOT NULL,
        cel_perc INT NOT NULL DEFAULT 0,           -- M oszlop: napi cél
        lehivott_siemens_dc INT NOT NULL DEFAULT 0, -- N oszlop
        lehivott_no_siemens INT NOT NULL DEFAULT 0, -- O oszlop
        lehivott_ossz INT NOT NULL DEFAULT 0,       -- P oszlop (N+O)
        leadott_siemens_dc INT NOT NULL DEFAULT 0,  -- U oszlop
        leadott_no_siemens INT NOT NULL DEFAULT 0,  -- V oszlop
        leadott_kaco INT NOT NULL DEFAULT 0,        -- W oszlop
        leadott_ossz INT NOT NULL DEFAULT 0,        -- (U+V+W)
        imported_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_ainova_napi_perces_datum UNIQUE (datum)
    );
    
    CREATE NONCLUSTERED INDEX IX_ainova_napi_perces_datum ON dbo.ainova_napi_perces(datum DESC);
    
    PRINT 'ainova_napi_perces tábla létrehozva';
END
ELSE
    PRINT 'ainova_napi_perces tábla már létezik';
GO

-- Tábla: ainova_napi_perces_import_status
IF OBJECT_ID('dbo.ainova_napi_perces_import_status', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ainova_napi_perces_import_status (
        id INT IDENTITY(1,1) PRIMARY KEY,
        import_type NVARCHAR(50) NOT NULL DEFAULT 'napi_perces',
        is_importing BIT NOT NULL DEFAULT 0,
        import_started_at DATETIME2 NULL,
        last_import_at DATETIME2 NULL,
        last_import_by NVARCHAR(100) NULL,
        records_imported INT NULL DEFAULT 0,
        CONSTRAINT UQ_ainova_napi_perces_import_type UNIQUE (import_type)
    );
    
    -- Kezdő rekord
    INSERT INTO dbo.ainova_napi_perces_import_status (import_type)
    VALUES ('napi_perces');
    
    PRINT 'ainova_napi_perces_import_status tábla létrehozva';
END
ELSE
    PRINT 'ainova_napi_perces_import_status tábla már létezik';
GO

-- Ellenőrzés
SELECT 'ainova_napi_perces' AS tabla, COUNT(*) AS rekordok FROM ainova_napi_perces;
SELECT 'ainova_napi_perces_import_status' AS tabla, * FROM ainova_napi_perces_import_status;
