-- ============================================================
-- AINOVA Users és Műszakforgatás Setup
-- Dátum: 2026.01.01
-- Adatbázis: LaC_BasicDatas_TEST
-- ============================================================

USE [LaC_BasicDatas_TEST];
GO

-- ============================================================
-- 1. RÉGI USEREK TÖRLÉSE
-- ============================================================
DELETE FROM dbo.AinovaUsers WHERE Username IN ('dev', 'admin');
GO

PRINT 'Régi test userek törölve (dev, admin)';
GO

-- ============================================================
-- 2. SHIFT MEZŐ HOZZÁADÁSA (ha még nincs)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AinovaUsers') AND name = 'Shift')
BEGIN
    ALTER TABLE dbo.AinovaUsers ADD Shift NVARCHAR(10) NULL;
    PRINT 'Shift mező hozzáadva az AinovaUsers táblához';
END
ELSE
BEGIN
    PRINT 'Shift mező már létezik';
END
GO

-- ============================================================
-- 3. ROLE CHECK CONSTRAINT MÓDOSÍTÁSA
-- ============================================================
-- Először töröljük a régi constraint-et
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('dbo.AinovaUsers') 
  AND definition LIKE '%Role%';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.AinovaUsers DROP CONSTRAINT ' + @constraintName);
    PRINT 'Régi Role constraint törölve: ' + @constraintName;
END
GO

-- Új constraint minden szerepkörrel
ALTER TABLE dbo.AinovaUsers ADD CONSTRAINT CK_AinovaUsers_Role 
    CHECK (Role IN ('Admin', 'Műszakvezető', 'Műszakvezető helyettes', 'NPI Technikus', 'Operátor'));
GO

PRINT 'Új Role constraint létrehozva';
GO

-- ============================================================
-- 4. USEREK LÉTREHOZÁSA
-- ============================================================
-- Jelszó mindenkinek: Ainova2026! (bcrypt hash)
-- FirstLogin = 1, tehát első belépéskor jelszót kell változtatni!

-- Először töröljük ha már léteznek (clean insert)
DELETE FROM dbo.AinovaUsers 
WHERE Username IN ('30008047', '30004721', '30013088', '30011002', '30007362', '30009737', '30009736');
GO

-- Admin - Svasznik Tibor
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30008047',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Svasznik Tibor',
    'Admin',
    'tibor.svasznik@tdk.com',
    NULL,  -- Admin-nak nincs fix műszakja
    1, 1
);
PRINT 'User létrehozva: 30008047 - Svasznik Tibor (Admin)';
GO

-- NPI Technikus - Török Sándor
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30004721',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Török Sándor',
    'NPI Technikus',
    'sandor.torok@tdk.com',
    NULL,  -- NPI Technikus bármelyik műszakra rögzíthet
    1, 1
);
PRINT 'User létrehozva: 30004721 - Török Sándor (NPI Technikus)';
GO

-- A műszak - Műszakvezető - Domanics Gábor
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30013088',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Domanics Gábor',
    'Műszakvezető',
    'gabor.domnanics@tdk.com',
    'A',
    1, 1
);
PRINT 'User létrehozva: 30013088 - Domanics Gábor (A műszak, Műszakvezető)';
GO

-- A műszak - Műszakvezető helyettes - Szabó Mátyás
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30011002',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Szabó Mátyás',
    'Műszakvezető helyettes',
    'matyas.szabo@tdk.com',
    'A',
    1, 1
);
PRINT 'User létrehozva: 30011002 - Szabó Mátyás (A műszak, Műszakvezető helyettes)';
GO

-- B műszak - Műszakvezető - Kopácsi Máté
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30007362',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Kopácsi Máté',
    'Műszakvezető',
    'mate.kopacsi@tdk.com',
    'B',
    1, 1
);
PRINT 'User létrehozva: 30007362 - Kopácsi Máté (B műszak, Műszakvezető)';
GO

-- B műszak - Műszakvezető helyettes - Németh József
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30009737',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Németh József',
    'Műszakvezető helyettes',
    'Jozsef.Nemeth2@tdk.com',
    'B',
    1, 1
);
PRINT 'User létrehozva: 30009737 - Németh József (B műszak, Műszakvezető helyettes)';
GO

-- C műszak - Műszakvezető helyettes - Németh Imre
-- MEGJEGYZÉS: C műszaknak nincs főnök, csak helyettes!
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30009736',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Németh Imre',
    'Műszakvezető helyettes',
    'imre.nemeth@tdk.com',
    'C',
    1, 1
);
PRINT 'User létrehozva: 30009736 - Németh Imre (C műszak, Műszakvezető helyettes)';
GO

-- ============================================================
-- 5. MŰSZAKFORGATÁS TÁBLA (AinovaShiftSchedule)
-- ============================================================
-- Ez mondja meg, hogy adott héten melyik műszak (A/B/C) 
-- melyik időszakban dolgozik (morning/afternoon/night)

IF OBJECT_ID('dbo.AinovaShiftSchedule', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AinovaShiftSchedule (
        ScheduleId INT IDENTITY(1,1) PRIMARY KEY,
        WeekNumber INT NOT NULL,               -- Év hete (1-53)
        Year INT NOT NULL,                     -- Év
        MorningShift NVARCHAR(1) NOT NULL,     -- 'A', 'B', vagy 'C' (05:45-13:45)
        AfternoonShift NVARCHAR(1) NOT NULL,   -- 'A', 'B', vagy 'C' (13:45-21:45)
        NightShift NVARCHAR(1) NOT NULL,       -- 'A', 'B', vagy 'C' (21:45-05:45)
        CreatedBy INT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT UQ_ShiftSchedule_Week UNIQUE (Year, WeekNumber),
        CONSTRAINT CK_MorningShift CHECK (MorningShift IN ('A', 'B', 'C')),
        CONSTRAINT CK_AfternoonShift CHECK (AfternoonShift IN ('A', 'B', 'C')),
        CONSTRAINT CK_NightShift CHECK (NightShift IN ('A', 'B', 'C'))
    );
    
    CREATE INDEX IX_ShiftSchedule_YearWeek ON dbo.AinovaShiftSchedule(Year, WeekNumber);
    
    PRINT 'AinovaShiftSchedule tábla létrehozva (heti bontás)';
END
ELSE
BEGIN
    PRINT 'AinovaShiftSchedule tábla már létezik';
END
GO

-- ============================================================
-- 6. 2026 ELSŐ NÉHÁNY HETÉNEK MŰSZAKBEOSZTÁSA (PÉLDA)
-- ============================================================
-- MÓDOSÍTSD a valós forgatás szerint!
-- Alapértelmezett minta: A→DE, B→DU, C→ÉJ, aztán forog

-- Töröljük a régit ha van
DELETE FROM dbo.AinovaShiftSchedule WHERE Year = 2026;
GO

-- 2026. 1. hét (Jan 1 körül) - Beállítsd a valós beosztás szerint!
INSERT INTO dbo.AinovaShiftSchedule (Year, WeekNumber, MorningShift, AfternoonShift, NightShift)
VALUES 
    (2026, 1, 'A', 'B', 'C'),   -- 1. hét: A=DE, B=DU, C=ÉJ
    (2026, 2, 'C', 'A', 'B'),   -- 2. hét: forgatás
    (2026, 3, 'B', 'C', 'A'),   -- 3. hét: forgatás
    (2026, 4, 'A', 'B', 'C'),   -- 4. hét: vissza
    (2026, 5, 'C', 'A', 'B'),
    (2026, 6, 'B', 'C', 'A'),
    (2026, 7, 'A', 'B', 'C'),
    (2026, 8, 'C', 'A', 'B');

PRINT '2026 első 8 hetének műszakbeosztása létrehozva (ELLENŐRIZD!)';
GO

-- ============================================================
-- 7. ELLENŐRZÉS
-- ============================================================
PRINT '';
PRINT '========== ELLENŐRZÉS ==========';
PRINT '';

PRINT '--- AinovaUsers tábla ---';
SELECT 
    UserId,
    Username,
    FullName,
    Role,
    Shift,
    Email,
    IsActive,
    FirstLogin
FROM dbo.AinovaUsers
ORDER BY 
    CASE Role 
        WHEN 'Admin' THEN 1 
        WHEN 'NPI Technikus' THEN 2 
        WHEN 'Műszakvezető' THEN 3 
        WHEN 'Műszakvezető helyettes' THEN 4 
        ELSE 5 
    END,
    Shift;
GO

PRINT '';
PRINT '--- AinovaShiftSchedule tábla (2026) ---';
SELECT 
    Year,
    WeekNumber AS Hét,
    MorningShift AS [Délelőtt (05:45-13:45)],
    AfternoonShift AS [Délután (13:45-21:45)],
    NightShift AS [Éjszaka (21:45-05:45)]
FROM dbo.AinovaShiftSchedule
WHERE Year = 2026
ORDER BY WeekNumber;
GO

PRINT '';
PRINT '==========================================';
PRINT 'KÉSZ! Minden user jelszava: Ainova2026!';
PRINT 'Első belépéskor jelszóváltás kötelező!';
PRINT '';
PRINT 'FONTOS: Ellenőrizd a műszakforgatást!';
PRINT 'Ha nem jó a sorrend, módosítsd a 6. részben.';
PRINT '==========================================';
GO
