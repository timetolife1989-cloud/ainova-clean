-- =====================================================
-- AINOVA - Import Status tábla
-- =====================================================
-- Célja: Import állapot követése, lock mechanizmus
-- Több párhuzamos felhasználó kezelése
-- =====================================================

USE LaC_BasicDatas_TEST;
GO

-- Import státusz tábla
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_import_status')
BEGIN
    CREATE TABLE ainova_import_status (
        id INT IDENTITY(1,1) PRIMARY KEY,
        import_type NVARCHAR(50) NOT NULL DEFAULT 'teljesitmeny',
        last_import_at DATETIME2 NULL,
        last_import_by NVARCHAR(50) NULL,
        is_importing BIT NOT NULL DEFAULT 0,
        import_started_at DATETIME2 NULL,
        records_imported INT NULL,
        last_check_at DATETIME2 NULL,
        excel_last_modified DATETIME2 NULL,
        CONSTRAINT UQ_import_type UNIQUE (import_type)
    );

    -- Alapértelmezett sor
    INSERT INTO ainova_import_status (import_type, is_importing)
    VALUES ('teljesitmeny', 0);

    PRINT 'ainova_import_status tábla létrehozva';
END
ELSE
BEGIN
    PRINT 'ainova_import_status tábla már létezik';
END
GO

-- Ellenőrzés
SELECT * FROM ainova_import_status;
GO
