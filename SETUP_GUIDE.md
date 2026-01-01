# 🎯 AINOVA SQL Server Setup - Complete Guide

## ✅ Current Status

- ✅ Environment variables configured (`.env.local`)
- ✅ SQL Server connection successful
- ⚠️ **Action Required**: Create `AinovaUsers` table in database

---

## 🚀 Quick Start (3 Steps)

### Step 1: Open SQL Server Management Studio (SSMS)

**Connection Details:**
```
Server:   SVEEA0160.tdk-prod.net
Database: LaC_BasicDatas_TEST
Login:    Lac_BasicDatas_TEST_admin
Password: Ad5-Ton~{pXkb{=
```

### Step 2: Run Setup Script

1. Open file: [`scripts/setup-ainova-users.sql`](scripts/setup-ainova-users.sql)
2. Copy entire content
3. Paste into SSMS query window
4. **Execute** (F5)

The script will create:
- ✅ `dbo.AinovaUsers` table
- ✅ Username index for performance
- ✅ Default users: `dev` and `admin`

### Step 3: Verify Setup

Run test command:
```powershell
npm run db:test
```

Expected output:
```
✅ Connection successful!
✅ Table dbo.AinovaUsers exists
✅ Total users: 2
🟢 dev    | Admin | Kovács János
🟢 admin  | Admin | Nagy Péter
```

---

## 🔐 Login Credentials

| Username | Password | Role | Email |
|----------|----------|------|-------|
| `dev` | `dev` | Admin | dev@ainova.com |
| `admin` | `admin123` | Admin | admin@ainova.com |

---

## 🏃 Start Development

After database setup:

```powershell
npm run dev
```

Open: http://localhost:3000/login

---

## 📊 What Was Created?

### Files Created:
1. ✅ `.env.local` - SQL Server credentials
2. ✅ `scripts/setup-ainova-users.sql` - Database setup script
3. ✅ `scripts/test-db-connection.js` - Connection test tool

### Files Updated:
1. ✅ `lib/db.ts` - Connection pooling with TDK server config
2. ✅ `lib/auth.ts` - Login logic uses `AinovaUsers` table
3. ✅ `package.json` - Added `db:test` and `db:setup` scripts

---

## 🔧 NPM Commands

```powershell
npm run dev         # Start Next.js development server
npm run db:test     # Test SQL connection & verify tables
npm run db:setup    # Show SQL setup instructions
npm run build       # Production build
```

---

## 🛠️ Database Schema

### `dbo.AinovaUsers` Table

```sql
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
```

**Features:**
- Plain text passwords in development (dev/admin users)
- bcrypt hashed passwords for production
- Automatic detection: starts with `$2a$` or `$2b$` = bcrypt hash

---

## ⚠️ Important Notes

### Separate Tables
- ✅ `dbo.AinovaUsers` - **AINOVA project** (your application)
- ⚠️ `dbo.Users` - **Other system** (don't modify this!)

The existing `dbo.Users` table with "demo" user is for another system. We created a separate table to avoid conflicts.

### Password Handling
The auth system automatically detects password type:
- **Plain text** (dev mode): Direct string comparison
- **bcrypt hash** (production): Uses `bcrypt.compare()`

---

## 🔒 Production Security Checklist

Before going live:

- [ ] Hash all passwords with bcrypt
- [ ] Change or delete test accounts (dev/admin)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Review `.env.local` security settings
- [ ] Test session management
- [ ] Verify audit logging

---

## 🐛 Troubleshooting

### "Connection failed"
- Check network/VPN to TDK server
- Verify credentials in `.env.local`
- Check firewall rules

### "Table already exists"
- Setup is complete, run `npm run db:test`
- Skip to Step 3 (verify)

### "Sessions table not found"
- You may need to create `dbo.Sessions` table
- Check with DBA if table exists

### Login fails after setup
- Verify users exist: `SELECT * FROM dbo.AinovaUsers`
- Check `dbo.Sessions` table exists
- Review console logs: `npm run dev`

---

## 📞 Need Help?

1. Run diagnostic: `npm run db:test`
2. Check logs in terminal
3. Verify SQL Server connection in SSMS
4. Review error messages

---

**Ready to proceed?** 🚀

Run the SQL script in SSMS, then test with `npm run db:test`!
