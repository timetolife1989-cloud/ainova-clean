-- =====================================================
-- AINOVA - Plain Text Password Migration Script
-- =====================================================
-- Purpose: Identify users with plain text passwords
-- Date: 2026-01-08
-- 
-- IMPORTANT: This script only IDENTIFIES users that need password reset.
-- Actual password hashing must be done through the application
-- because bcrypt hashing requires Node.js/JavaScript.
-- =====================================================

-- Step 1: Find all users with plain text passwords (non-bcrypt)
-- Bcrypt hashes always start with $2a$ or $2b$
SELECT 
    UserId,
    Username,
    FullName,
    Role,
    IsActive,
    'PLAIN TEXT - NEEDS RESET' as PasswordStatus,
    CreatedAt
FROM dbo.AinovaUsers
WHERE PasswordHash NOT LIKE '$2a$%' 
  AND PasswordHash NOT LIKE '$2b$%'
ORDER BY Role, Username;

-- Step 2: Count affected users
SELECT 
    COUNT(*) as PlainTextUsers,
    (SELECT COUNT(*) FROM dbo.AinovaUsers WHERE PasswordHash LIKE '$2a$%' OR PasswordHash LIKE '$2b$%') as HashedUsers
FROM dbo.AinovaUsers
WHERE PasswordHash NOT LIKE '$2a$%' 
  AND PasswordHash NOT LIKE '$2b$%';

-- =====================================================
-- MIGRATION OPTIONS:
-- =====================================================
-- 
-- Option A: Reset to default password (recommended for first login)
-- -----------------------------------------------------------------
-- Run generate-password-hash.js to get bcrypt hash, then:
-- 
-- UPDATE dbo.AinovaUsers
-- SET PasswordHash = '$2b$12$YOUR_GENERATED_HASH_HERE',
--     FirstLogin = 1,  -- Force password change
--     UpdatedAt = SYSDATETIME()
-- WHERE PasswordHash NOT LIKE '$2a$%' 
--   AND PasswordHash NOT LIKE '$2b$%';
--
-- 
-- Option B: Use the Node.js migration script (bulk migration)
-- -----------------------------------------------------------
-- Run: node scripts/migrate-passwords.js
-- (This script needs to be created if bulk migration is needed)
--
-- =====================================================

-- Step 3: After migration, verify all passwords are hashed
-- SELECT Username, Role,
--     CASE 
--         WHEN PasswordHash LIKE '$2a$%' OR PasswordHash LIKE '$2b$%' THEN 'HASHED ✓'
--         ELSE 'PLAIN TEXT ✗'
--     END as PasswordStatus
-- FROM dbo.AinovaUsers
-- ORDER BY PasswordStatus DESC, Username;
