-- ============================================================
-- AINOVA Database Schema
-- SQL Server / LocalDB kompatibilis
-- Verzió: 1.0.0
-- ============================================================

USE master;
GO

-- AINOVA_DEV adatbázis létrehozása (ha még nincs)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AINOVA_DEV')
BEGIN
    CREATE DATABASE AINOVA_DEV;
END
GO

USE AINOVA_DEV;
GO

-- ============================================================
-- Tábla: dbo.Users
-- Cél: Felhasználói fiókok tárolása (vezetők, adminok, dolgozók)
-- Biztonság: Jelszavak bcrypt hash formában tárolva (12 rounds)
-- ============================================================
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    DROP TABLE dbo.Users;
GO

CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(200) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'User' CHECK (Role IN ('User', 'Leader', 'Admin')),
    FirstLogin BIT NOT NULL DEFAULT 1,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE NONCLUSTERED INDEX IX_Users_Username ON dbo.Users(Username);
GO

-- ============================================================
-- Tábla: dbo.Sessions
-- Cél: Aktív session-ök tárolása (HTTP-only cookie alapú auth)
-- Lejárat: ExpiresAt alapján automatikus cleanup
-- ============================================================
IF OBJECT_ID('dbo.Sessions', 'U') IS NOT NULL
    DROP TABLE dbo.Sessions;
GO

CREATE TABLE dbo.Sessions (
    SessionId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ExpiresAt DATETIME2 NOT NULL,
    CONSTRAINT FK_Sessions_Users FOREIGN KEY (UserId) 
        REFERENCES dbo.Users(UserId) ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX IX_Sessions_ExpiresAt ON dbo.Sessions(ExpiresAt);
GO

CREATE NONCLUSTERED INDEX IX_Sessions_UserId ON dbo.Sessions(UserId);
GO

-- ============================================================
-- Tábla: dbo.LoginHistory
-- Cél: Audit trail - minden login kísérlet naplózása
-- Biztonság: Sikeres/sikertelen próbálkozások nyomon követése
-- ============================================================
IF OBJECT_ID('dbo.LoginHistory', 'U') IS NOT NULL
    DROP TABLE dbo.LoginHistory;
GO

CREATE TABLE dbo.LoginHistory (
    LoginId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    SessionId UNIQUEIDENTIFIER NULL,
    LoginTime DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IPAddress NVARCHAR(50) NULL,
    Success BIT NOT NULL,
    FailureReason NVARCHAR(200) NULL,
    CONSTRAINT FK_LoginHistory_Users FOREIGN KEY (UserId) 
        REFERENCES dbo.Users(UserId)
);
GO

CREATE NONCLUSTERED INDEX IX_LoginHistory_UserId ON dbo.LoginHistory(UserId);
GO

CREATE NONCLUSTERED INDEX IX_LoginHistory_LoginTime ON dbo.LoginHistory(LoginTime DESC);
GO

-- ============================================================
-- Seed adat: Demo user
-- Username: demo
-- Password: demo123 (bcrypt hash: 12 rounds)
-- ============================================================
INSERT INTO dbo.Users (Username, PasswordHash, FullName, Role, FirstLogin, IsActive)
VALUES (
    'demo',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi',
    'Demo Felhasználó',
    'Admin',
    0,
    1
);
GO

-- ============================================================
-- Tábla: dbo.ainova_napi_perces
-- Cél: Napi percek kimutatás - Lehívás vs Leadás vs Cél
-- Forrás: napi perces YYYY.xlsx Excel fájl
-- ============================================================
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
END
GO

-- ============================================================
-- Tábla: dbo.ainova_napi_perces_import_status
-- Cél: Import státusz nyomon követése
-- ============================================================
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
END
GO

-- ============================================================
-- Ellenőrzés: Táblák és seed adat
-- ============================================================
SELECT 'Users tábla létrehozva' AS Status, COUNT(*) AS UserCount FROM dbo.Users;
SELECT 'Sessions tábla létrehozva' AS Status, COUNT(*) AS SessionCount FROM dbo.Sessions;
SELECT 'LoginHistory tábla létrehozva' AS Status, COUNT(*) AS HistoryCount FROM dbo.LoginHistory;
GO
