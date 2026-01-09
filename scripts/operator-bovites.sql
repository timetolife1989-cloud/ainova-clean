-- =====================================================
-- AINOVA - Operátor tábla bővítés
-- Új mezők: id, telefon, orvosi, jogosítványok
-- =====================================================

-- 0. ID oszlop hozzáadása (ha nincs)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'id')
BEGIN
    -- Először hozzáadjuk az oszlopot IDENTITY nélkül
    ALTER TABLE ainova_operatorok ADD id INT NULL;
    PRINT 'id oszlop hozzáadva (még NULL)';
END
GO

-- ID értékek feltöltése ha üresek
IF EXISTS (SELECT 1 FROM ainova_operatorok WHERE id IS NULL)
BEGIN
    DECLARE @cnt INT = 1;
    DECLARE @tsz NVARCHAR(50);
    DECLARE cur CURSOR FOR SELECT torzsszam FROM ainova_operatorok WHERE id IS NULL ORDER BY torzsszam;
    OPEN cur;
    FETCH NEXT FROM cur INTO @tsz;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        UPDATE ainova_operatorok SET id = (SELECT ISNULL(MAX(id), 0) + @cnt FROM ainova_operatorok WHERE id IS NOT NULL) WHERE torzsszam = @tsz;
        FETCH NEXT FROM cur INTO @tsz;
    END
    CLOSE cur;
    DEALLOCATE cur;
    PRINT 'id értékek feltöltve';
END
GO

-- ID NOT NULL és UNIQUE constraint
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'id' AND is_nullable = 1)
BEGIN
    -- Minden id-nek kell értéknek lennie
    UPDATE ainova_operatorok SET id = (SELECT ISNULL(MAX(id), 0) + 1 FROM ainova_operatorok) WHERE id IS NULL;
    
    ALTER TABLE ainova_operatorok ALTER COLUMN id INT NOT NULL;
    PRINT 'id NOT NULL beállítva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'UQ_operatorok_id')
BEGIN
    ALTER TABLE ainova_operatorok ADD CONSTRAINT UQ_operatorok_id UNIQUE (id);
    PRINT 'id UNIQUE constraint hozzáadva';
END
GO

-- 1. Alap mezők bővítése
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'telefon')
BEGIN
    ALTER TABLE ainova_operatorok ADD telefon NVARCHAR(20) NULL;
    PRINT 'telefon mező hozzáadva';
END
GO

-- Jogosítványok (specifikus gépek)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'jogsi_gyalog_targonca')
BEGIN
    ALTER TABLE ainova_operatorok ADD jogsi_gyalog_targonca BIT DEFAULT 0;
    PRINT 'jogsi_gyalog_targonca mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'jogsi_forgo_daru')
BEGIN
    ALTER TABLE ainova_operatorok ADD jogsi_forgo_daru BIT DEFAULT 0;
    PRINT 'jogsi_forgo_daru mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'jogsi_futo_daru')
BEGIN
    ALTER TABLE ainova_operatorok ADD jogsi_futo_daru BIT DEFAULT 0;
    PRINT 'jogsi_futo_daru mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'jogsi_newton_emelo')
BEGIN
    ALTER TABLE ainova_operatorok ADD jogsi_newton_emelo BIT DEFAULT 0;
    PRINT 'jogsi_newton_emelo mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ainova_operatorok') AND name = 'megjegyzes')
BEGIN
    ALTER TABLE ainova_operatorok ADD megjegyzes NVARCHAR(1000) NULL;
    PRINT 'megjegyzes mező hozzáadva';
END
GO

-- 2. Pozíciók tábla újratöltése (ha üres vagy frissítés kell)
-- Pozíciók beszúrása (MERGE - ha létezik frissít, ha nem beszúr)
MERGE INTO ainova_poziciok AS target
USING (VALUES 
    ('Műszakvezető', 'Vezetői', 1),
    ('Előmunkás', 'Vezetői', 2),
    ('Gyártásszervező', 'Vezetői', 3),
    ('Előkészítő', 'Produktív', 10),
    ('Gépítekercselő', 'Produktív', 11),
    ('Szerelő', 'Produktív', 12),
    ('Maró-ónozó', 'Produktív', 13),
    ('Mérő', 'Produktív', 14),
    ('Impregnáló', 'Produktív', 15),
    ('Univerzális', 'Produktív', 16),
    ('Csomagoló', 'Produktív', 17),
    ('NPI technikus', 'Támogató', 20),
    ('Javító műszerész', 'Támogató', 21)
) AS source (nev, kategoria, sorrend)
ON target.nev = source.nev
WHEN MATCHED THEN
    UPDATE SET kategoria = source.kategoria, sorrend = source.sorrend
WHEN NOT MATCHED THEN
    INSERT (nev, kategoria, sorrend) VALUES (source.nev, source.kategoria, source.sorrend);

PRINT 'Pozíciók frissítve (13 munkakör)';
GO

-- 3. Orvosi alkalmassági tábla (1 operátor - több pozíció)
-- FONTOS: A torzsszam típusa NVARCHAR(20) mindkét helyen!

-- Ha létezik rossz típussal, töröljük
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_operator_orvosi')
BEGIN
    -- Ellenőrizzük a típust
    DECLARE @curr_len INT;
    SELECT @curr_len = c.max_length 
    FROM sys.columns c 
    WHERE c.object_id = OBJECT_ID('ainova_operator_orvosi') AND c.name = 'operator_torzsszam';
    
    IF @curr_len != 40  -- NVARCHAR(20) = 40 byte
    BEGIN
        DROP TABLE ainova_operator_orvosi;
        PRINT 'Régi ainova_operator_orvosi törölve (rossz típus)';
    END
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_operator_orvosi')
BEGIN
    CREATE TABLE ainova_operator_orvosi (
        id INT IDENTITY(1,1) PRIMARY KEY,
        operator_torzsszam NVARCHAR(20) NOT NULL,  -- Megegyezik az ainova_operatorok.torzsszam típusával
        pozicio_id INT NOT NULL,
        pozicio_nev NVARCHAR(100) NOT NULL,
        kezdete DATE NOT NULL,
        lejarat DATE NOT NULL,
        megjegyzes NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'ainova_operator_orvosi tábla létrehozva NVARCHAR(20) típussal';
END
GO

-- FK constraint külön (ha a típusok egyeznek)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_orvosi_operator')
BEGIN
    BEGIN TRY
        ALTER TABLE ainova_operator_orvosi 
        ADD CONSTRAINT FK_orvosi_operator 
        FOREIGN KEY (operator_torzsszam) REFERENCES ainova_operatorok(torzsszam) ON DELETE CASCADE;
        PRINT 'FK_orvosi_operator constraint hozzáadva';
    END TRY
    BEGIN CATCH
        PRINT 'FK_orvosi_operator hiba: ' + ERROR_MESSAGE();
        PRINT 'Ellenőrizd a torzsszam típusát mindkét táblában!';
    END CATCH
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_orvosi_pozicio')
BEGIN
    BEGIN TRY
        ALTER TABLE ainova_operator_orvosi 
        ADD CONSTRAINT FK_orvosi_pozicio 
        FOREIGN KEY (pozicio_id) REFERENCES ainova_poziciok(id);
        PRINT 'FK_orvosi_pozicio constraint hozzáadva';
    END TRY
    BEGIN CATCH
        PRINT 'FK_orvosi_pozicio hiba: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- Indexek
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('ainova_operator_orvosi') AND name = 'IX_operator_orvosi_operator')
BEGIN
    CREATE INDEX IX_operator_orvosi_operator ON ainova_operator_orvosi(operator_torzsszam);
    CREATE INDEX IX_operator_orvosi_lejarat ON ainova_operator_orvosi(lejarat);
    PRINT 'Indexek létrehozva';
END
GO

-- 4. View a lejáró orvosikhoz (30 napon belül)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_orvosi_lejaro')
    DROP VIEW vw_orvosi_lejaro;
GO

CREATE VIEW vw_orvosi_lejaro AS
SELECT 
    o.torzsszam,
    o.nev,
    o.muszak,
    o.pozicio,
    orv.pozicio_nev as orvosi_pozicio,
    orv.lejarat,
    DATEDIFF(day, GETDATE(), orv.lejarat) as napok_hatra
FROM ainova_operatorok o
JOIN ainova_operator_orvosi orv ON o.torzsszam = orv.operator_torzsszam
WHERE orv.lejarat <= DATEADD(day, 30, GETDATE())
  AND orv.lejarat >= GETDATE()
  AND o.aktiv = 1;
GO

PRINT 'vw_orvosi_lejaro view létrehozva';

-- =====================================================
-- 6. USERS tábla bővítése (műszakvezetők, előmunkások stb.)
-- FONTOS: A tábla neve AinovaUsers (Pascal case)!
-- =====================================================
PRINT '';
PRINT '=== AinovaUsers tábla bővítése ===';

-- Telefon
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'telefon')
BEGIN
    ALTER TABLE AinovaUsers ADD telefon NVARCHAR(20) NULL;
    PRINT 'users: telefon mező hozzáadva';
END
GO

-- Törzsszám (opcionális - ha a user is operátor)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'torzsszam')
BEGIN
    ALTER TABLE AinovaUsers ADD torzsszam NVARCHAR(20) NULL;
    PRINT 'users: torzsszam mező hozzáadva';
END
GO

-- Jogosítványok
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'jogsi_gyalog_targonca')
BEGIN
    ALTER TABLE AinovaUsers ADD jogsi_gyalog_targonca BIT DEFAULT 0;
    PRINT 'users: jogsi_gyalog_targonca mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'jogsi_forgo_daru')
BEGIN
    ALTER TABLE AinovaUsers ADD jogsi_forgo_daru BIT DEFAULT 0;
    PRINT 'users: jogsi_forgo_daru mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'jogsi_futo_daru')
BEGIN
    ALTER TABLE AinovaUsers ADD jogsi_futo_daru BIT DEFAULT 0;
    PRINT 'users: jogsi_futo_daru mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'jogsi_newton_emelo')
BEGIN
    ALTER TABLE AinovaUsers ADD jogsi_newton_emelo BIT DEFAULT 0;
    PRINT 'users: jogsi_newton_emelo mező hozzáadva';
END
GO

-- Orvosi alkalmassági dátumok (user-eknek egyszerűbb: egy dátum)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'orvosi_kezdete')
BEGIN
    ALTER TABLE AinovaUsers ADD orvosi_kezdete DATE NULL;
    PRINT 'users: orvosi_kezdete mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'orvosi_lejarat')
BEGIN
    ALTER TABLE AinovaUsers ADD orvosi_lejarat DATE NULL;
    PRINT 'users: orvosi_lejarat mező hozzáadva';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AinovaUsers') AND name = 'orvosi_poziciok')
BEGIN
    ALTER TABLE AinovaUsers ADD orvosi_poziciok NVARCHAR(500) NULL;  -- Vesszővel elválasztva a pozíciók
    PRINT 'users: orvosi_poziciok mező hozzáadva';
END
GO

-- 7. Ellenőrzés
SELECT 'POZÍCIÓK:' as info;
SELECT id, nev, kategoria, sorrend FROM ainova_poziciok ORDER BY sorrend;

SELECT 'OPERÁTOR MEZŐK:' as info;
SELECT 
    c.name as mezo,
    t.name as tipus,
    c.max_length,
    c.is_nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('ainova_operatorok')
ORDER BY c.column_id;

SELECT 'USER MEZŐK:' as info;
SELECT 
    c.name as mezo,
    t.name as tipus,
    c.max_length,
    c.is_nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('AinovaUsers')
ORDER BY c.column_id;

-- =====================================================
-- 8. USER ORVOSI TÁBLA (profi megoldás - külön tábla)
-- Ugyanúgy mint ainova_operator_orvosi, de user-ekhez
-- =====================================================
PRINT '';
PRINT '=== User orvosi tábla létrehozása ===';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_user_orvosi')
BEGIN
    CREATE TABLE ainova_user_orvosi (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        pozicio_id INT NOT NULL,
        pozicio_nev NVARCHAR(100) NOT NULL,
        kezdete DATE NOT NULL,
        lejarat DATE NOT NULL,
        megjegyzes NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'ainova_user_orvosi tábla létrehozva';
END
GO

-- FK constraint a user-hez
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_user_orvosi_user')
BEGIN
    BEGIN TRY
        ALTER TABLE ainova_user_orvosi 
        ADD CONSTRAINT FK_user_orvosi_user 
        FOREIGN KEY (user_id) REFERENCES AinovaUsers(UserId) ON DELETE CASCADE;
        PRINT 'FK_user_orvosi_user constraint hozzáadva';
    END TRY
    BEGIN CATCH
        PRINT 'FK_user_orvosi_user hiba: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- FK constraint a pozícióhoz
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_user_orvosi_pozicio')
BEGIN
    BEGIN TRY
        ALTER TABLE ainova_user_orvosi 
        ADD CONSTRAINT FK_user_orvosi_pozicio 
        FOREIGN KEY (pozicio_id) REFERENCES ainova_poziciok(id);
        PRINT 'FK_user_orvosi_pozicio constraint hozzáadva';
    END TRY
    BEGIN CATCH
        PRINT 'FK_user_orvosi_pozicio hiba: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- Indexek
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('ainova_user_orvosi') AND name = 'IX_user_orvosi_user')
BEGIN
    CREATE INDEX IX_user_orvosi_user ON ainova_user_orvosi(user_id);
    CREATE INDEX IX_user_orvosi_lejarat ON ainova_user_orvosi(lejarat);
    PRINT 'User orvosi indexek létrehozva';
END
GO

-- View a lejáró user orvosikhoz (30 napon belül)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_user_orvosi_lejaro')
    DROP VIEW vw_user_orvosi_lejaro;
GO

CREATE VIEW vw_user_orvosi_lejaro AS
SELECT 
    u.UserId,
    u.Username as torzsszam,
    u.FullName as nev,
    u.Role as pozicio,
    u.Shift as muszak,
    orv.pozicio_nev as orvosi_pozicio,
    orv.lejarat,
    DATEDIFF(day, GETDATE(), orv.lejarat) as napok_hatra
FROM AinovaUsers u
JOIN ainova_user_orvosi orv ON u.UserId = orv.user_id
WHERE orv.lejarat <= DATEADD(day, 30, GETDATE())
  AND orv.lejarat >= GETDATE()
  AND u.IsActive = 1;
GO

PRINT 'vw_user_orvosi_lejaro view létrehozva';

-- Ellenőrzés
SELECT 'USER ORVOSI TÁBLA:' as info;
SELECT 
    c.name as mezo,
    t.name as tipus,
    c.max_length,
    c.is_nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('ainova_user_orvosi')
ORDER BY c.column_id;
