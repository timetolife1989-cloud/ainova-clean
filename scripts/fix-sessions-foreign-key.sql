-- =====================================================================
-- AINOVA - Fix Sessions Foreign Key for AinovaUsers
-- =====================================================================
-- Purpose: Update Sessions table to reference AinovaUsers instead of Users
-- Server: SVEEA0160.tdk-prod.net
-- Database: LaC_BasicDatas_TEST
-- =====================================================================

USE [LaC_BasicDatas_TEST];
GO

-- =====================================================================
-- Step 1: Drop existing foreign key constraint
-- =====================================================================
IF EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_Sessions_Users' 
    AND parent_object_id = OBJECT_ID('dbo.Sessions')
)
BEGIN
    ALTER TABLE dbo.Sessions
    DROP CONSTRAINT FK_Sessions_Users;
    PRINT '✅ Dropped old FK_Sessions_Users constraint';
END
ELSE
BEGIN
    PRINT '⚠️  FK_Sessions_Users constraint does not exist';
END
GO

-- =====================================================================
-- Step 2: Create new foreign key constraint to AinovaUsers
-- =====================================================================
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_Sessions_AinovaUsers' 
    AND parent_object_id = OBJECT_ID('dbo.Sessions')
)
BEGIN
    ALTER TABLE dbo.Sessions
    ADD CONSTRAINT FK_Sessions_AinovaUsers
    FOREIGN KEY (UserId) REFERENCES dbo.AinovaUsers(UserId)
    ON DELETE CASCADE;
    PRINT '✅ Created new FK_Sessions_AinovaUsers constraint';
END
ELSE
BEGIN
    PRINT '⚠️  FK_Sessions_AinovaUsers constraint already exists';
END
GO

-- =====================================================================
-- Step 3: Cleanup invalid sessions (sessions pointing to non-existent users)
-- =====================================================================
DELETE FROM dbo.Sessions
WHERE UserId NOT IN (SELECT UserId FROM dbo.AinovaUsers);

DECLARE @deletedCount INT = @@ROWCOUNT;
PRINT '🗑️  Deleted ' + CAST(@deletedCount AS NVARCHAR(10)) + ' invalid session(s)';
GO

-- =====================================================================
-- Verification
-- =====================================================================
SELECT 
    'Foreign Key Check' AS TestName,
    fk.name AS ConstraintName,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc 
    ON fk.object_id = fkc.constraint_object_id
WHERE fk.parent_object_id = OBJECT_ID('dbo.Sessions');

SELECT 
    'Session Count' AS Info,
    COUNT(*) AS TotalSessions,
    COUNT(DISTINCT UserId) AS UniqueUsers
FROM dbo.Sessions;
GO

PRINT '✅ Migration complete!';
GO
