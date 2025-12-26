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
-- Ellenőrzés: Táblák és seed adat
-- ============================================================
SELECT 'Users tábla létrehozva' AS Status, COUNT(*) AS UserCount FROM dbo.Users;
SELECT 'Sessions tábla létrehozva' AS Status, COUNT(*) AS SessionCount FROM dbo.Sessions;
SELECT 'LoginHistory tábla létrehozva' AS Status, COUNT(*) AS HistoryCount FROM dbo.LoginHistory;
GO
