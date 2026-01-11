# Adatbázis Értékelés

## 🗄️ Összesített Adatbázis Értékelés: ⭐⭐⭐⭐ (4/5)

---

## 1. Táblák Áttekintése

### 1.1 Felhasználó Kezelés

#### dbo.AinovaUsers ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

```sql
CREATE TABLE dbo.AinovaUsers (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,     -- Törzsszám
    PasswordHash NVARCHAR(255) NOT NULL,        -- bcrypt hash
    FullName NVARCHAR(200) NOT NULL,
    Role NVARCHAR(50) NOT NULL,                 -- Pozíció
    Shift NVARCHAR(10) NULL,                    -- A/B/C
    Email NVARCHAR(255) NULL,
    Telefon NVARCHAR(50) NULL,
    -- Jogosítványok
    jogsi_gyalog_targonca BIT DEFAULT 0,
    jogsi_forgo_daru BIT DEFAULT 0,
    jogsi_futo_daru BIT DEFAULT 0,
    jogsi_newton_emelo BIT DEFAULT 0,
    -- Orvosi
    orvosi_kezdete DATE NULL,
    orvosi_lejarat DATE NULL,
    orvosi_poziciok NVARCHAR(500) NULL,
    -- Státusz
    FirstLogin BIT NOT NULL DEFAULT 1,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

**Pozitívumok:**
- ✅ IDENTITY primary key
- ✅ UNIQUE constraint username-re
- ✅ Megfelelő adattípusok
- ✅ Default értékek
- ✅ Timestamp mezők

**Indexek:**
```sql
CREATE NONCLUSTERED INDEX IX_Users_Username ON dbo.AinovaUsers(Username);
CREATE NONCLUSTERED INDEX IX_Users_Role_IsActive ON dbo.AinovaUsers(Role, IsActive);
```

---

#### dbo.Sessions ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

```sql
CREATE TABLE dbo.Sessions (
    SessionId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ExpiresAt DATETIME2 NOT NULL,
    CONSTRAINT FK_Sessions_Users FOREIGN KEY (UserId) 
        REFERENCES dbo.AinovaUsers(UserId) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX IX_Sessions_ExpiresAt ON dbo.Sessions(ExpiresAt);
CREATE NONCLUSTERED INDEX IX_Sessions_UserId ON dbo.Sessions(UserId);
```

**Pozitívumok:**
- ✅ UUID primary key (UNIQUEIDENTIFIER)
- ✅ Foreign key CASCADE delete
- ✅ Indexek a gyakran keresett oszlopokon

---

#### dbo.LoginHistory ✅
**Értékelés: ⭐⭐⭐⭐ (4/5)**

```sql
CREATE TABLE dbo.LoginHistory (
    LoginId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    SessionId UNIQUEIDENTIFIER NULL,
    LoginTime DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IPAddress NVARCHAR(50) NULL,
    Success BIT NOT NULL,
    FailureReason NVARCHAR(200) NULL,
    CONSTRAINT FK_LoginHistory_Users FOREIGN KEY (UserId) 
        REFERENCES dbo.AinovaUsers(UserId)
);
```

**Javítandó:**
- ⚠️ UserId NOT NULL de lehet hogy a user nem létezik (user not found)
- ⚠️ Nincs retention policy (régi rekordok törlése)

**Javítás:**
```sql
-- UserId nullable kell legyen (user not found esetén)
ALTER TABLE dbo.LoginHistory ALTER COLUMN UserId INT NULL;

-- Retention: 90 napnál régebbi rekordok törlése
-- Scheduled job-ként futtatni
DELETE FROM dbo.LoginHistory 
WHERE LoginTime < DATEADD(DAY, -90, SYSDATETIME());
```

---

### 1.2 Teljesítmény Adatok

#### dbo.ainova_teljesitmeny ✅
**Értékelés: ⭐⭐⭐⭐ (4/5)**

```sql
CREATE TABLE dbo.ainova_teljesitmeny (
    id INT IDENTITY(1,1) PRIMARY KEY,
    datum DATE NOT NULL,
    torzsszam NVARCHAR(20) NOT NULL,
    muszak NVARCHAR(10) NOT NULL,           -- A/B/C
    leadott_perc INT NOT NULL DEFAULT 0,
    pozicio NVARCHAR(100) NULL,
    imported_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_telj_datum_torzsszam UNIQUE (datum, torzsszam)
);
```

**Indexek szükségesek:**
```sql
-- Jelenlegi: Hiányzik!
CREATE NONCLUSTERED INDEX IX_teljesitmeny_datum_muszak 
ON dbo.ainova_teljesitmeny(datum, muszak) 
INCLUDE (leadott_perc, torzsszam);

CREATE NONCLUSTERED INDEX IX_teljesitmeny_torzsszam 
ON dbo.ainova_teljesitmeny(torzsszam, datum);
```

---

#### dbo.ainova_napi_perces ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

```sql
CREATE TABLE dbo.ainova_napi_perces (
    id INT IDENTITY(1,1) PRIMARY KEY,
    datum DATE NOT NULL,
    cel_perc INT NOT NULL DEFAULT 0,
    lehivott_siemens_dc INT NOT NULL DEFAULT 0,
    lehivott_no_siemens INT NOT NULL DEFAULT 0,
    lehivott_ossz INT NOT NULL DEFAULT 0,
    leadott_siemens_dc INT NOT NULL DEFAULT 0,
    leadott_no_siemens INT NOT NULL DEFAULT 0,
    leadott_kaco INT NOT NULL DEFAULT 0,
    leadott_ossz INT NOT NULL DEFAULT 0,
    imported_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_ainova_napi_perces_datum UNIQUE (datum)
);

CREATE NONCLUSTERED INDEX IX_ainova_napi_perces_datum 
ON dbo.ainova_napi_perces(datum DESC);
```

**Pozitívumok:**
- ✅ Jó normalizálás
- ✅ UNIQUE constraint
- ✅ DESC index a gyakori query-khez

---

### 1.3 Létszám Adatok

#### dbo.ainova_letszam ✅
**Értékelés: ⭐⭐⭐⭐ (4/5)**

```sql
CREATE TABLE dbo.ainova_letszam (
    id INT IDENTITY(1,1) PRIMARY KEY,
    datum DATE NOT NULL,
    muszak CHAR(1) NOT NULL,                -- A/B/C
    pozicio NVARCHAR(100) NOT NULL,
    pozicio_tipus NVARCHAR(20) NOT NULL,    -- operativ/nem_operativ
    is_kritikus BIT NOT NULL DEFAULT 0,
    megjelent INT NOT NULL DEFAULT 0,
    tappenz INT NOT NULL DEFAULT 0,
    szabadsag INT NOT NULL DEFAULT 0,
    brutto_letszam INT NOT NULL DEFAULT 0,
    netto_letszam INT NOT NULL DEFAULT 0,
    hianyzas_fo INT NOT NULL DEFAULT 0,
    hianyzas_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    leadasi_cel_perc INT NULL,
    indoklas_miert NVARCHAR(500) NULL,
    indoklas_meddig NVARCHAR(500) NULL,
    indoklas_terv NVARCHAR(500) NULL,
    rogzitette_user NVARCHAR(100) NULL,
    rogzitette_datum DATETIME2 NULL,
    CONSTRAINT UQ_letszam_datum_muszak_pozicio UNIQUE (datum, muszak, pozicio)
);
```

**Javítandó:**
- ⚠️ `rogzitette_user` szöveges, lehetne FK a UserId-re
- ⚠️ Nincs `updated_at` timestamp

**Javítás:**
```sql
ALTER TABLE dbo.ainova_letszam ADD
    rogzitette_user_id INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_letszam_user FOREIGN KEY (rogzitette_user_id) 
        REFERENCES dbo.AinovaUsers(UserId);
```

---

### 1.4 Operátorok

#### dbo.Operators ✅
**Értékelés: ⭐⭐⭐⭐ (4/5)**

```sql
CREATE TABLE dbo.Operators (
    id INT IDENTITY(1,1) PRIMARY KEY,
    torzsszam NVARCHAR(20) NOT NULL UNIQUE,
    nev NVARCHAR(200) NOT NULL,
    muszak NVARCHAR(10) NULL,               -- A/B/C
    pozicio NVARCHAR(100) NULL,
    jogsi_gyalog_targonca BIT DEFAULT 0,
    jogsi_forgo_daru BIT DEFAULT 0,
    jogsi_futo_daru BIT DEFAULT 0,
    jogsi_newton_emelo BIT DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

#### dbo.OperatorOrvosi ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

```sql
CREATE TABLE dbo.OperatorOrvosi (
    id INT IDENTITY(1,1) PRIMARY KEY,
    operator_id INT NOT NULL,
    pozicio NVARCHAR(100) NOT NULL,
    kezdete DATE NULL,
    lejarat DATE NOT NULL,
    megjegyzes NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_orvosi_operator FOREIGN KEY (operator_id) 
        REFERENCES dbo.Operators(id) ON DELETE CASCADE
);

CREATE INDEX IX_orvosi_operator ON dbo.OperatorOrvosi(operator_id);
CREATE INDEX IX_orvosi_lejarat ON dbo.OperatorOrvosi(lejarat);
```

---

## 2. Hiányzó Táblák/Funkciók

### 2.1 Audit Log Tábla ❌
**Értékelés: Hiányzik!**

```sql
CREATE TABLE dbo.AuditLog (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NULL,
    Action NVARCHAR(100) NOT NULL,
    TargetType NVARCHAR(50) NOT NULL,
    TargetId INT NULL,
    OldValue NVARCHAR(MAX) NULL,        -- JSON
    NewValue NVARCHAR(MAX) NULL,        -- JSON
    IPAddress NVARCHAR(50) NULL,
    UserAgent NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    INDEX IX_AuditLog_UserId (UserId),
    INDEX IX_AuditLog_CreatedAt (CreatedAt DESC),
    INDEX IX_AuditLog_TargetType (TargetType, TargetId)
);
```

---

### 2.2 Notification Tábla ❌
**Értékelés: Hiányzik!**

```sql
CREATE TABLE dbo.Notifications (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Type NVARCHAR(50) NOT NULL,         -- 'orvosi_lejarat', 'import_failed', etc.
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    Link NVARCHAR(500) NULL,            -- Opcionális link
    ReadAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_notif_user FOREIGN KEY (UserId) 
        REFERENCES dbo.AinovaUsers(UserId) ON DELETE CASCADE,
    INDEX IX_Notifications_User_Unread (UserId, ReadAt)
);
```

---

### 2.3 Settings/Config Tábla ❌
**Értékelés: Hiányzik!**

```sql
CREATE TABLE dbo.AppSettings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SettingKey NVARCHAR(100) NOT NULL UNIQUE,
    SettingValue NVARCHAR(MAX) NOT NULL,
    Description NVARCHAR(500) NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedBy INT NULL
);

-- Kezdeti értékek
INSERT INTO dbo.AppSettings (SettingKey, SettingValue, Description) VALUES
('IMPORT_ENABLED', 'true', 'Excel import engedélyezve'),
('SESSION_TIMEOUT_HOURS', '24', 'Session lejárat órákban'),
('RATE_LIMIT_ATTEMPTS', '5', 'Maximum login próbák'),
('RATE_LIMIT_WINDOW_MINUTES', '15', 'Rate limit időablak percben'),
('ORVOSI_WARNING_DAYS', '30', 'Orvosi lejárat figyelmeztetés napokban');
```

---

## 3. Teljesítmény Elemzés

### 3.1 Indexek Értékelése

| Tábla | Index | Státusz | Megjegyzés |
|-------|-------|---------|------------|
| AinovaUsers | IX_Users_Username | ✅ | Van |
| AinovaUsers | IX_Users_Role_IsActive | ⚠️ | Hiányzik |
| Sessions | IX_Sessions_ExpiresAt | ✅ | Van |
| Sessions | IX_Sessions_UserId | ✅ | Van |
| LoginHistory | IX_LoginHistory_UserId | ✅ | Van |
| LoginHistory | IX_LoginHistory_LoginTime | ✅ | Van |
| ainova_teljesitmeny | IX_datum_muszak | ❌ | Hiányzik! |
| ainova_teljesitmeny | IX_torzsszam | ❌ | Hiányzik! |
| ainova_letszam | IX_datum_muszak | ⚠️ | Ellenőrizni |
| OperatorOrvosi | IX_operator | ✅ | Van |
| OperatorOrvosi | IX_lejarat | ✅ | Van |

---

### 3.2 Query Execution Plan Elemzés

**Lassú query-k azonosítása:**
```sql
-- SQL Server: Legköltségesebb query-k
SELECT TOP 10
    qs.execution_count,
    qs.total_logical_reads / qs.execution_count AS avg_reads,
    qs.total_elapsed_time / qs.execution_count / 1000 AS avg_ms,
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2)+1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY avg_ms DESC;
```

---

### 3.3 Index Használat Ellenőrzése

```sql
-- Használatlan indexek
SELECT 
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc,
    ius.user_seeks,
    ius.user_scans,
    ius.user_lookups,
    ius.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius 
    ON i.object_id = ius.object_id AND i.index_id = ius.index_id
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
    AND i.name IS NOT NULL
ORDER BY (ius.user_seeks + ius.user_scans + ius.user_lookups) ASC;
```

---

## 4. Backup és Recovery

### Értékelés: ⚠️ Nem ellenőrizhető

**Javasolt backup stratégia:**

1. **Full Backup** - Naponta
2. **Differential Backup** - 4 óránként
3. **Transaction Log Backup** - 15 percenként

```sql
-- Full backup script
BACKUP DATABASE AINOVA 
TO DISK = 'D:\Backups\AINOVA_Full.bak'
WITH COMPRESSION, CHECKSUM;

-- Differential backup
BACKUP DATABASE AINOVA 
TO DISK = 'D:\Backups\AINOVA_Diff.bak'
WITH DIFFERENTIAL, COMPRESSION;

-- Transaction log backup
BACKUP LOG AINOVA 
TO DISK = 'D:\Backups\AINOVA_Log.trn'
WITH COMPRESSION;
```

---

## 5. Biztonság

### 5.1 Jelszó Tárolás ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

- bcrypt hash (12 rounds)
- Plain text nem támogatott

### 5.2 SQL Injection Védelem ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

- Paraméteres query-k mindenhol

### 5.3 Jogosultság Kezelés ⚠️
**Értékelés: ⭐⭐⭐ (3/5)**

**Javítandó:**
- Adatbázis user jogosultságok szűkítése
- Least privilege principle

```sql
-- Alkalmazás user létrehozása minimális jogokkal
CREATE LOGIN ainova_app WITH PASSWORD = 'SecureP@ss!';
CREATE USER ainova_app FOR LOGIN ainova_app;

-- Csak a szükséges jogok
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.AinovaUsers TO ainova_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Sessions TO ainova_app;
-- ...

-- DENY: Veszélyes műveletek
DENY ALTER, DROP ON SCHEMA::dbo TO ainova_app;
```

---

## 6. Összefoglaló

| Kategória | Értékelés | Prioritás |
|-----------|-----------|-----------|
| Tábla struktúra | ⭐⭐⭐⭐⭐ | - |
| Foreign keys | ⭐⭐⭐⭐⭐ | - |
| Indexek | ⭐⭐⭐ | P1 |
| Audit log | ⭐ | P1 |
| Notifications | ⭐ | P2 |
| Backup | ⚠️ | P1 |
| Least privilege | ⭐⭐⭐ | P2 |

---

## 7. Ajánlott SQL Scriptek

```sql
-- 1. Hiányzó indexek hozzáadása
CREATE NONCLUSTERED INDEX IX_teljesitmeny_datum_muszak 
ON dbo.ainova_teljesitmeny(datum, muszak) 
INCLUDE (leadott_perc, torzsszam);

-- 2. Audit log tábla létrehozása
CREATE TABLE dbo.AuditLog (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NULL,
    Action NVARCHAR(100) NOT NULL,
    TargetType NVARCHAR(50) NOT NULL,
    TargetId INT NULL,
    OldValue NVARCHAR(MAX) NULL,
    NewValue NVARCHAR(MAX) NULL,
    IPAddress NVARCHAR(50) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 3. LoginHistory retention (90 nap)
DELETE FROM dbo.LoginHistory 
WHERE LoginTime < DATEADD(DAY, -90, SYSDATETIME());

-- 4. Expired session cleanup
DELETE FROM dbo.Sessions 
WHERE ExpiresAt < SYSDATETIME();
```

