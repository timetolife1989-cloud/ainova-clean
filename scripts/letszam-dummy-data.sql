-- ============================================================
-- AINOVA - Létszám Dummy Adatok (3 hét visszamenőleg)
-- Futtatás előtt: Backup készítése ajánlott!
-- ============================================================

USE LaC_BasicDatas_TEST;
GO

-- ============================================================
-- 1. LÉPÉS: Meglévő adatok törlése
-- ============================================================
PRINT 'Meglévő adatok törlése...';

DELETE FROM ainova_letszam;
DELETE FROM ainova_letszam_audit_log;

PRINT 'Törlés kész.';

-- ============================================================
-- 2. LÉPÉS: Dummy adatok generálása (3 hét = 21 nap)
-- ============================================================
PRINT 'Dummy adatok generálása...';

-- Változók
DECLARE @StartDate DATE = DATEADD(DAY, -21, CAST(GETDATE() AS DATE));
DECLARE @EndDate DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE)); -- Tegnapig
DECLARE @CurrentDate DATE = @StartDate;
DECLARE @Muszak CHAR(1);
DECLARE @Pozicio NVARCHAR(50);
DECLARE @PozicioTipus NVARCHAR(20);
DECLARE @IsKritikus BIT;
DECLARE @Megjelent INT;
DECLARE @Tappenz INT;
DECLARE @Szabadsag INT;
DECLARE @LeadasiCel INT;
DECLARE @BaseCount INT;

-- Pozíciók tábla (ideiglenes)
CREATE TABLE #Poziciok (
    Pozicio NVARCHAR(50),
    PozicioTipus NVARCHAR(20),
    IsKritikus BIT,
    AtlagLetszam INT  -- Átlagos létszám ehhez a pozícióhoz
);

-- Produktív pozíciók (realisztikus átlag létszámokkal)
INSERT INTO #Poziciok VALUES ('Előkészítő', 'operativ', 0, 4);
INSERT INTO #Poziciok VALUES ('Huzalos tekercselő', 'operativ', 0, 6);
INSERT INTO #Poziciok VALUES ('Fóliás tekercselő', 'operativ', 0, 5);
INSERT INTO #Poziciok VALUES ('Maró-ónozó', 'operativ', 0, 3);
INSERT INTO #Poziciok VALUES ('LaC szerelő', 'operativ', 0, 8);
INSERT INTO #Poziciok VALUES ('Kis DC szerelő', 'operativ', 0, 4);
INSERT INTO #Poziciok VALUES ('Nagy DC szerelő', 'operativ', 0, 3);
INSERT INTO #Poziciok VALUES ('Mérő', 'operativ', 1, 2);  -- Kritikus!
INSERT INTO #Poziciok VALUES ('Impregnáló', 'operativ', 0, 2);
INSERT INTO #Poziciok VALUES ('Végszerelő', 'operativ', 0, 5);
INSERT INTO #Poziciok VALUES ('Csomagoló', 'operativ', 1, 3);  -- Kritikus!

-- Nem produktív pozíciók
INSERT INTO #Poziciok VALUES ('Gyártásszervező', 'nem_operativ', 0, 1);
INSERT INTO #Poziciok VALUES ('Műszakvezető', 'nem_operativ', 0, 1);
-- MEÓ - átlag 1.5, de random 0-3 (néha nincs MEÓ!)
INSERT INTO #Poziciok VALUES ('Minőségellenőr', 'nem_operativ', 1, 2);

-- Loop minden napon
WHILE @CurrentDate <= @EndDate
BEGIN
    -- Loop minden műszakon (A, B, C)
    DECLARE @MuszakIndex INT = 1;
    WHILE @MuszakIndex <= 3
    BEGIN
        SET @Muszak = CASE @MuszakIndex WHEN 1 THEN 'A' WHEN 2 THEN 'B' ELSE 'C' END;
        
        -- Loop minden pozíción
        DECLARE pozicio_cursor CURSOR FOR
            SELECT Pozicio, PozicioTipus, IsKritikus, AtlagLetszam FROM #Poziciok;
        
        OPEN pozicio_cursor;
        FETCH NEXT FROM pozicio_cursor INTO @Pozicio, @PozicioTipus, @IsKritikus, @BaseCount;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Random variáció (-2 to +2, de minimum 0)
            SET @Megjelent = @BaseCount + (ABS(CHECKSUM(NEWID())) % 5) - 2;
            IF @Megjelent < 0 SET @Megjelent = 0;
            
            -- MEÓ: 20% eséllyel nincs senki (hogy lássuk a hatást)
            IF @Pozicio = 'Minőségellenőr' AND ABS(CHECKSUM(NEWID())) % 5 = 0
                SET @Megjelent = 0;
            
            -- Hétvégén kevesebb ember (szombat=7, vasárnap=1)
            IF DATEPART(WEEKDAY, @CurrentDate) IN (1, 7)
                SET @Megjelent = @Megjelent - 1;
            IF @Megjelent < 0 SET @Megjelent = 0;
            
            -- Táppénz (0-2 fő random, ritkábban)
            SET @Tappenz = CASE WHEN ABS(CHECKSUM(NEWID())) % 10 < 3 THEN ABS(CHECKSUM(NEWID())) % 2 ELSE 0 END;
            
            -- Szabadság (0-1 fő random)
            SET @Szabadsag = CASE WHEN ABS(CHECKSUM(NEWID())) % 10 < 2 THEN 1 ELSE 0 END;
            
            -- Leadási cél (csak operatív pozícióknak)
            SET @LeadasiCel = CASE WHEN @PozicioTipus = 'operativ' THEN @Megjelent * 480 ELSE NULL END;
            
            -- Insert
            INSERT INTO ainova_letszam (
                datum, muszak, pozicio, pozicio_tipus, is_kritikus,
                megjelent, tappenz, szabadsag, leadasi_cel_perc,
                rogzitette_user, rogzitette_datum
            ) VALUES (
                @CurrentDate, @Muszak, @Pozicio, @PozicioTipus, @IsKritikus,
                @Megjelent, @Tappenz, @Szabadsag, @LeadasiCel,
                '30008047', DATEADD(HOUR, 8, CAST(@CurrentDate AS DATETIME))  -- Reggel 8-kor "rögzítve"
            );
            
            FETCH NEXT FROM pozicio_cursor INTO @Pozicio, @PozicioTipus, @IsKritikus, @BaseCount;
        END
        
        CLOSE pozicio_cursor;
        DEALLOCATE pozicio_cursor;
        
        SET @MuszakIndex = @MuszakIndex + 1;
    END
    
    SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
END

-- Cleanup
DROP TABLE #Poziciok;

-- ============================================================
-- 3. LÉPÉS: Eredmény ellenőrzése
-- ============================================================
PRINT 'Generálás kész!';
PRINT '';

-- Összesítés
SELECT 
    'Összesen' AS Info,
    COUNT(*) AS Sorok,
    COUNT(DISTINCT datum) AS Napok,
    MIN(datum) AS ElsoNap,
    MAX(datum) AS UtolsoNap
FROM ainova_letszam;

-- Napi összesítés (produktív)
SELECT TOP 10
    datum,
    muszak,
    SUM(megjelent) AS Megjelent,
    SUM(tappenz) AS Tappenz,
    SUM(szabadsag) AS Szabadsag,
    SUM(megjelent) + SUM(tappenz) + SUM(szabadsag) AS Brutto,
    SUM(CASE WHEN pozicio_tipus = 'operativ' THEN megjelent ELSE 0 END) AS ProdMegjelent,
    SUM(CASE WHEN pozicio_tipus = 'operativ' THEN megjelent * 480 ELSE 0 END) AS BecsultLeadasPerc
FROM ainova_letszam
GROUP BY datum, muszak
ORDER BY datum DESC, muszak;

PRINT '';
PRINT '✅ Dummy adatok sikeresen feltöltve!';
