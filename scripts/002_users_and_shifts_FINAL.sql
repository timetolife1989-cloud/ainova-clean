-- ============================================================
-- AINOVA Users és Műszakforgatás Setup - VÉGLEGES
-- Dátum: 2026.01.01
-- Adatbázis: LaC_BasicDatas_TEST
-- ============================================================
-- JELSZÓ: 12345 (minden user)
-- Első belépéskor jelszóváltás kötelező!
-- Új jelszó követelmény: kis betű + nagy betű + speciális karakter
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

ALTER TABLE dbo.AinovaUsers ADD CONSTRAINT CK_AinovaUsers_Role 
    CHECK (Role IN ('Admin', 'Műszakvezető', 'Műszakvezető helyettes', 'NPI Technikus', 'Operátor'));
GO

PRINT 'Új Role constraint létrehozva';
GO

-- ============================================================
-- 4. USEREK LÉTREHOZÁSA
-- ============================================================
-- Jelszó: 12345
-- bcrypt hash (12 rounds): $2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq
-- FirstLogin = 1 → első belépéskor jelszót KELL változtatni!

-- Először töröljük ha már léteznek
DELETE FROM dbo.AinovaUsers 
WHERE Username IN ('30008047', '30004721', '30013088', '30011002', '30007362', '30009737', '30009736');
GO

-- ============================================================
-- Admin - Svasznik Tibor
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30008047',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Svasznik Tibor',
    'Admin',
    'tibor.svasznik@tdk.com',
    NULL,
    1, 1
);
PRINT 'User: 30008047 - Svasznik Tibor (Admin)';
GO

-- ============================================================
-- NPI Technikus - Török Sándor
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30004721',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Török Sándor',
    'NPI Technikus',
    'sandor.torok@tdk.com',
    NULL,
    1, 1
);
PRINT 'User: 30004721 - Török Sándor (NPI Technikus)';
GO

-- ============================================================
-- A műszak - Műszakvezető - Domanics Gábor
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30013088',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Domanics Gábor',
    'Műszakvezető',
    'gabor.domnanics@tdk.com',
    'A',
    1, 1
);
PRINT 'User: 30013088 - Domanics Gábor (A műszak, Műszakvezető)';
GO

-- ============================================================
-- A műszak - Műszakvezető helyettes - Szabó Mátyás
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30011002',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Szabó Mátyás',
    'Műszakvezető helyettes',
    'matyas.szabo@tdk.com',
    'A',
    1, 1
);
PRINT 'User: 30011002 - Szabó Mátyás (A műszak, Műszakvezető helyettes)';
GO

-- ============================================================
-- B műszak - Műszakvezető - Kopácsi Máté
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30007362',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Kopácsi Máté',
    'Műszakvezető',
    'mate.kopacsi@tdk.com',
    'B',
    1, 1
);
PRINT 'User: 30007362 - Kopácsi Máté (B műszak, Műszakvezető)';
GO

-- ============================================================
-- B műszak - Műszakvezető helyettes - Németh József
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30009737',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Németh József',
    'Műszakvezető helyettes',
    'Jozsef.Nemeth2@tdk.com',
    'B',
    1, 1
);
PRINT 'User: 30009737 - Németh József (B műszak, Műszakvezető helyettes)';
GO

-- ============================================================
-- C műszak - Műszakvezető helyettes - Németh Imre
-- (Nincs műszakvezető, csak helyettes!)
-- ============================================================
INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, Shift, IsActive, FirstLogin)
VALUES (
    '30009736',
    '$2b$12$KxypjhYYSZBHUOLOYLD1fOK2NvBUMTNB.hxX/TNVKuua/YBLmJ9Qq',  -- 12345
    'Németh Imre',
    'Műszakvezető helyettes',
    'imre.nemeth@tdk.com',
    'C',
    1, 1
);
PRINT 'User: 30009736 - Németh Imre (C műszak, Műszakvezető helyettes)';
GO

-- ============================================================
-- 5. MŰSZAKFORGATÁS TÁBLA
-- ============================================================
-- 3 hetes forgatási ciklus
-- Forgatás iránya: ÉJ → DU → DE → ÉJ...
-- 
-- Referencia: 2025.12.15 (51. hét)
--   A = Délelőtt (Domanics)
--   C = Délután
--   B = Éjszaka (Kopácsi)

IF OBJECT_ID('dbo.AinovaShiftSchedule', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.AinovaShiftSchedule;
    PRINT 'Régi AinovaShiftSchedule tábla törölve';
END
GO

CREATE TABLE dbo.AinovaShiftSchedule (
    ScheduleId INT IDENTITY(1,1) PRIMARY KEY,
    Year INT NOT NULL,
    WeekNumber INT NOT NULL,
    MorningShift NVARCHAR(1) NOT NULL,     -- Délelőtt 05:45-13:45
    AfternoonShift NVARCHAR(1) NOT NULL,   -- Délután 13:45-21:45
    NightShift NVARCHAR(1) NOT NULL,       -- Éjszaka 21:45-05:45
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT UQ_ShiftSchedule_Week UNIQUE (Year, WeekNumber),
    CONSTRAINT CK_Morning CHECK (MorningShift IN ('A', 'B', 'C')),
    CONSTRAINT CK_Afternoon CHECK (AfternoonShift IN ('A', 'B', 'C')),
    CONSTRAINT CK_Night CHECK (NightShift IN ('A', 'B', 'C'))
);
GO

CREATE INDEX IX_ShiftSchedule_YearWeek ON dbo.AinovaShiftSchedule(Year, WeekNumber);
GO

PRINT 'AinovaShiftSchedule tábla létrehozva';
GO

-- ============================================================
-- 6. MŰSZAKFORGATÁS ADATOK (2025 vége + 2026 első 52 hét)
-- ============================================================
-- Referencia: 51. hét 2025 → A=DE, C=DU, B=ÉJ
-- 3 hetes ciklus ismétlődik

-- 2025 utolsó hetei
INSERT INTO dbo.AinovaShiftSchedule (Year, WeekNumber, MorningShift, AfternoonShift, NightShift) VALUES
    (2025, 51, 'A', 'C', 'B'),   -- Dec 15 hete - Referencia!
    (2025, 52, 'C', 'B', 'A');   -- Dec 22 hete
GO

-- 2026 összes hete (1-52) - 3 hetes ciklus folytatása
-- 51. hét: A-C-B (ciklus pozíció 0)
-- 52. hét: C-B-A (ciklus pozíció 1)
-- 1. hét:  B-A-C (ciklus pozíció 2)
-- 2. hét:  A-C-B (ciklus pozíció 0) - ismétlődik

INSERT INTO dbo.AinovaShiftSchedule (Year, WeekNumber, MorningShift, AfternoonShift, NightShift) VALUES
    -- Ciklus pozíció: (hét + 1) mod 3
    -- 0 → A-C-B, 1 → C-B-A, 2 → B-A-C
    (2026, 1, 'B', 'A', 'C'),    -- Ciklus 2
    (2026, 2, 'A', 'C', 'B'),    -- Ciklus 0
    (2026, 3, 'C', 'B', 'A'),    -- Ciklus 1
    (2026, 4, 'B', 'A', 'C'),    -- Ciklus 2
    (2026, 5, 'A', 'C', 'B'),    -- Ciklus 0
    (2026, 6, 'C', 'B', 'A'),    -- Ciklus 1
    (2026, 7, 'B', 'A', 'C'),    -- Ciklus 2
    (2026, 8, 'A', 'C', 'B'),    -- Ciklus 0
    (2026, 9, 'C', 'B', 'A'),    -- Ciklus 1
    (2026, 10, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 11, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 12, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 13, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 14, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 15, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 16, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 17, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 18, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 19, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 20, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 21, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 22, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 23, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 24, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 25, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 26, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 27, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 28, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 29, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 30, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 31, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 32, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 33, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 34, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 35, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 36, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 37, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 38, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 39, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 40, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 41, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 42, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 43, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 44, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 45, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 46, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 47, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 48, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 49, 'B', 'A', 'C'),   -- Ciklus 2
    (2026, 50, 'A', 'C', 'B'),   -- Ciklus 0
    (2026, 51, 'C', 'B', 'A'),   -- Ciklus 1
    (2026, 52, 'B', 'A', 'C');   -- Ciklus 2
GO

PRINT '2025 vége + 2026 teljes év műszakbeosztása létrehozva';
GO

-- ============================================================
-- 7. ELLENŐRZÉS
-- ============================================================
PRINT '';
PRINT '==========================================';
PRINT '       ELLENŐRZÉS - USEREK';
PRINT '==========================================';

SELECT 
    UserId,
    Username AS Törzsszám,
    FullName AS Név,
    Role AS Szerepkör,
    ISNULL(Shift, '-') AS Műszak,
    Email,
    CASE WHEN IsActive = 1 THEN 'Igen' ELSE 'Nem' END AS Aktív,
    CASE WHEN FirstLogin = 1 THEN 'Igen' ELSE 'Nem' END AS [Jelszó változtatás kell]
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
PRINT '==========================================';
PRINT '       ELLENŐRZÉS - MŰSZAKFORGATÁS';
PRINT '==========================================';
PRINT 'Referencia: 2025.51. hét - A=DE, C=DU, B=ÉJ';
PRINT '';

SELECT 
    Year AS Év,
    WeekNumber AS Hét,
    MorningShift AS [Délelőtt (05:45-13:45)],
    AfternoonShift AS [Délután (13:45-21:45)],
    NightShift AS [Éjszaka (21:45-05:45)]
FROM dbo.AinovaShiftSchedule
WHERE Year = 2025 OR (Year = 2026 AND WeekNumber <= 6)
ORDER BY Year, WeekNumber;
GO

PRINT '';
PRINT '==========================================';
PRINT '              ÖSSZEFOGLALÓ';
PRINT '==========================================';
PRINT '';
PRINT 'Minden user jelszava: 12345';
PRINT 'Első belépéskor jelszóváltás KÖTELEZŐ!';
PRINT '';
PRINT 'Új jelszó követelmények:';
PRINT '  - Legalább 8 karakter';
PRINT '  - Kis betű (a-z)';
PRINT '  - Nagy betű (A-Z)';
PRINT '  - Speciális karakter (!@#$%^&*...)';
PRINT '';
PRINT 'Műszakforgatás: 3 hetes ciklus';
PRINT '  ÉJ → DU → DE → ÉJ...';
PRINT '';
PRINT '==========================================';
GO
