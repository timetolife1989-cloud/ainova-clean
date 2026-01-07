-- =====================================================
-- AINOVA Mock Adatok - Teljesítmény
-- Futtasd SSMS-ben a LaC_BasicDatas_TEST adatbázison
-- =====================================================

USE LaC_BasicDatas_TEST;
GO

-- Tábla létrehozása ha nem létezik
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_teljesitmeny')
BEGIN
    CREATE TABLE ainova_teljesitmeny (
        id INT IDENTITY(1,1) PRIMARY KEY,
        datum DATE NOT NULL,
        muszak NVARCHAR(10) NOT NULL,
        torzsszam NVARCHAR(50) NOT NULL,
        nev NVARCHAR(100),
        leadott_perc INT NOT NULL,
        szazalek AS (CAST(leadott_perc AS FLOAT) / 480 * 100),
        imported_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_teljesitmeny_datum_muszak_vsz UNIQUE (datum, muszak, torzsszam)
    );
    PRINT 'Tábla létrehozva: ainova_teljesitmeny';
END
GO

-- Régi adatok törlése
DELETE FROM ainova_teljesitmeny;
PRINT 'Régi adatok törölve';
GO

-- Mock adatok generálása
DECLARE @i INT = 0;
DECLARE @d DATE;
DECLARE @napok INT = 60; -- 60 nap visszamenőleg

WHILE @i < @napok
BEGIN
    SET @d = DATEADD(DAY, -@i, CAST(GETDATE() AS DATE));
    
    -- A műszak: 20-25 ember
    INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
    SELECT 
        @d, 
        'A', 
        'A' + RIGHT('00000' + CAST(n AS VARCHAR), 5), 
        'Operátor A-' + CAST(n AS VARCHAR), 
        350 + ABS(CHECKSUM(NEWID())) % 230  -- 350-580 perc között
    FROM (SELECT TOP (20 + ABS(CHECKSUM(NEWID())) % 6) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.objects) x;
    
    -- B műszak: 18-26 ember
    INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
    SELECT 
        @d, 
        'B', 
        'B' + RIGHT('00000' + CAST(n AS VARCHAR), 5), 
        'Operátor B-' + CAST(n AS VARCHAR), 
        350 + ABS(CHECKSUM(NEWID())) % 230
    FROM (SELECT TOP (18 + ABS(CHECKSUM(NEWID())) % 9) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.objects) x;
    
    -- C műszak: 15-22 ember
    INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
    SELECT 
        @d, 
        'C', 
        'C' + RIGHT('00000' + CAST(n AS VARCHAR), 5), 
        'Operátor C-' + CAST(n AS VARCHAR), 
        350 + ABS(CHECKSUM(NEWID())) % 230
    FROM (SELECT TOP (15 + ABS(CHECKSUM(NEWID())) % 8) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.objects) x;
    
    SET @i = @i + 1;
END

PRINT 'Mock adatok generálva: ' + CAST(@napok AS VARCHAR) + ' nap';
GO

-- Összesítés
SELECT 
    muszak,
    COUNT(DISTINCT datum) AS napok,
    COUNT(DISTINCT torzsszam) AS operatorok,
    COUNT(*) AS osszes_rekord,
    AVG(leadott_perc) AS atlag_perc
FROM ainova_teljesitmeny
GROUP BY muszak
ORDER BY muszak;

SELECT 'Összesen:' AS info, COUNT(*) AS rekordok FROM ainova_teljesitmeny;
