# 🎯 AINOVA - Database Setup Complete!

## ✅ Configuration Summary

All SQL Server configuration files have been created and configured for the AINOVA project.

### 📁 Files Created/Updated:

1. **`.env.local`** - SQL Server credentials and connection settings
2. **`lib/db.ts`** - Updated connection pool configuration
3. **`scripts/setup-ainova-users.sql`** - SQL migration script for AinovaUsers table
4. **`scripts/test-db-connection.js`** - Database connection test script
5. **`package.json`** - Added database management scripts
6. **`lib/auth.ts`** - Updated to use AinovaUsers table with hybrid password support

---

## 🚀 Quick Start Guide

### Step 1: Verify Environment Variables

Check that [.env.local](.env.local) contains:
```env
DB_SERVER=SVEEA0160.tdk-prod.net
DB_DATABASE=LaC_BasicDatas_TEST
DB_USER=Lac_BasicDatas_TEST_admin
DB_PASSWORD=Ad5-Ton~{pXkb{=
```

### Step 2: Create Database Tables

Open SQL Server Management Studio (SSMS) and run:
```bash
# File to execute
scripts/setup-ainova-users.sql
```

This will create:
- `dbo.AinovaUsers` table (if not exists)
- Default users: `dev` and `admin`
- Index for faster username lookups

### Step 3: Test Database Connection

```bash
npm run db:test
```

This will verify:
- ✅ SQL Server connection
- ✅ AinovaUsers table exists
- ✅ User count and list
- ✅ Sessions table status

### Step 4: Start Development Server

```bash
npm run dev
```

Navigate to: http://localhost:3000

---

## 🔐 Default Users (Development)

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `dev` | `dev` | Admin | Plain text password (dev mode) |
| `admin` | `admin123` | Admin | Plain text password (dev mode) |

⚠️ **Production Note**: These passwords should be replaced with bcrypt hashed passwords before deploying to production.

---

## 🛠️ Available NPM Scripts

```bash
# Start development server
npm run dev

# Test database connection
npm run db:test

# Show database setup instructions
npm run db:setup

# Build for production
npm run build

# Start production server
npm start
```

---

## 🏗️ Database Schema

### dbo.AinovaUsers Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `UserId` | INT | PRIMARY KEY, IDENTITY | Auto-increment user ID |
| `Username` | NVARCHAR(50) | UNIQUE, NOT NULL | Unique username |
| `PasswordHash` | NVARCHAR(255) | NOT NULL | Bcrypt hash or plain text (dev) |
| `FullName` | NVARCHAR(100) | NOT NULL | User's full name |
| `Role` | NVARCHAR(50) | NOT NULL | Admin, Műszakvezető, Operátor |
| `Email` | NVARCHAR(100) | NULL | User's email |
| `IsActive` | BIT | DEFAULT 1 | User account status |
| `FirstLogin` | BIT | DEFAULT 1 | Force password change flag |
| `CreatedAt` | DATETIME | DEFAULT GETDATE() | Account creation timestamp |
| `UpdatedAt` | DATETIME | DEFAULT GETDATE() | Last update timestamp |

---

## 🔧 Connection Configuration

### Encryption Settings
- **Encrypt**: `true` (TDK production server requires encryption)
- **Trust Server Certificate**: `true` (Self-signed certificates)

### Connection Pool
- **Min**: 2 connections
- **Max**: 10 connections
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 30 seconds
- **Request Timeout**: 30 seconds

### Password Handling
The authentication system supports **hybrid password verification**:

1. **Bcrypt Hashed Passwords** (Production)
   - Passwords starting with `$2a$` or `$2b$` are verified using bcrypt
   - Secure password storage with salt rounds

2. **Plain Text Passwords** (Development Only)
   - Used for `dev` and `admin` users during development
   - Direct string comparison
   - ⚠️ Warning logged if detected in production

---

## 🔍 Troubleshooting

### Connection Failed

If `npm run db:test` fails:

1. **Check network connectivity**
   ```bash
   ping SVEEA0160.tdk-prod.net
   ```

2. **Verify credentials**
   - Ensure `.env.local` has correct values
   - Check for typos in server name

3. **Firewall settings**
   - Ensure port 1433 (SQL Server) is not blocked
   - Check VPN connection if required

4. **Server availability**
   - Contact IT if server is down
   - Verify database `LaC_BasicDatas_TEST` exists

### Table Not Found

If AinovaUsers table doesn't exist:

```bash
# 1. Check instructions
npm run db:setup

# 2. Run SQL script in SSMS
# scripts/setup-ainova-users.sql
```

### Login Failed

1. **Check user exists**
   ```bash
   npm run db:test
   ```

2. **Verify username/password**
   - Default: `dev` / `dev`
   - Case sensitive

3. **Check IsActive flag**
   - User must have `IsActive = 1`

---

## 📊 Database Tables Overview

### Required Tables

1. **dbo.AinovaUsers** ✅ (Created by setup script)
   - Stores user accounts for AINOVA project
   - Separate from existing `dbo.Users` table (other system)

2. **dbo.Sessions** (Must exist for login)
   - Stores active user sessions
   - Links to AinovaUsers via UserId

3. **dbo.LoginHistory** (Optional - for audit trail)
   - Logs all login attempts
   - Used for rate limiting

---

## 🎯 Next Steps

1. ✅ Run setup script in SSMS: [scripts/setup-ainova-users.sql](scripts/setup-ainova-users.sql)
2. ✅ Test connection: `npm run db:test`
3. ✅ Start dev server: `npm run dev`
4. ✅ Login with dev/dev credentials
5. 📝 TODO: Hash passwords for production deployment

---

## 📝 Production Deployment Checklist

Before deploying to production:

- [ ] Replace plain text passwords with bcrypt hashed passwords
- [ ] Update `.env.local` to `.env.production`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (secure cookies)
- [ ] Review connection pool settings
- [ ] Test all authentication flows
- [ ] Verify session expiration (24h)
- [ ] Check audit logging (LoginHistory table)

---

## 🆘 Support

If you encounter any issues:

1. Check this README for troubleshooting steps
2. Run `npm run db:test` for diagnostics
3. Review console logs in terminal
4. Check [lib/db.ts](lib/db.ts) connection configuration
5. Contact IT support for server-related issues

---

**Last Updated**: December 26, 2025  
**AINOVA Project** - TDK Production Database Configuration
