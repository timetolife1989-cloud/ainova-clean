-- =====================================================================
-- AINOVA - Users Table Setup Script
-- =====================================================================
-- Purpose: Create AinovaUsers table for AINOVA project authentication
-- Server: SVEEA0160.tdk-prod.net
-- Database: LaC_BasicDatas_TEST
-- Note: Separate from existing dbo.Users table (used by other system)
-- =====================================================================

USE [LaC_BasicDatas_TEST];
GO

-- =====================================================================
-- Create AINOVA Users table (only if doesn't exist)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AinovaUsers' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.AinovaUsers (
        UserId INT PRIMARY KEY IDENTITY(1,1),
        Username NVARCHAR(50) UNIQUE NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        FullName NVARCHAR(100) NOT NULL,
        Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Admin', 'Műszakvezető', 'Operátor')),
        Email NVARCHAR(100) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        FirstLogin BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Table dbo.AinovaUsers created successfully.';
END
ELSE
BEGIN
    PRINT '⚠️  Table dbo.AinovaUsers already exists.';
END
GO

-- =====================================================================
-- Create index for faster username lookups
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AinovaUsers_Username' AND object_id = OBJECT_ID('dbo.AinovaUsers'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AinovaUsers_Username 
    ON dbo.AinovaUsers (Username);
    PRINT '✅ Index IX_AinovaUsers_Username created.';
END
GO

-- =====================================================================
-- Insert default AINOVA users (dev and admin) if not exists
-- =====================================================================
-- Dev user (plain text password for development)
IF NOT EXISTS (SELECT * FROM dbo.AinovaUsers WHERE Username = 'dev')
BEGIN
    INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, IsActive, FirstLogin)
    VALUES ('dev', 'dev', 'Kovács János', 'Admin', 'dev@ainova.com', 1, 1);
    PRINT '✅ User "dev" created (password: dev)';
END
ELSE
BEGIN
    PRINT '⚠️  User "dev" already exists.';
END

-- Admin user (plain text password for development)
IF NOT EXISTS (SELECT * FROM dbo.AinovaUsers WHERE Username = 'admin')
BEGIN
    INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Email, IsActive, FirstLogin)
    VALUES ('admin', 'admin123', 'Nagy Péter', 'Admin', 'admin@ainova.com', 1, 1);
    PRINT '✅ User "admin" created (password: admin123)';
END
ELSE
BEGIN
    PRINT '⚠️  User "admin" already exists.';
END
GO

-- =====================================================================
-- Verification - Show setup results
-- =====================================================================
SELECT 'AINOVA Users Setup Complete' AS Status, COUNT(*) AS UserCount FROM dbo.AinovaUsers;
SELECT UserId, Username, FullName, Role, Email, IsActive, FirstLogin, CreatedAt 
FROM dbo.AinovaUsers 
ORDER BY UserId;
GO

-- =====================================================================
-- NOTES FOR PRODUCTION:
-- =====================================================================
-- 1. Replace plain text passwords with bcrypt hashed passwords
-- 2. Update PasswordHash values using: bcrypt.hash(password, 10)
-- 3. Set FirstLogin = 0 after initial setup
-- 4. Consider adding more fields: LastLoginAt, PasswordChangedAt, etc.
-- =====================================================================
