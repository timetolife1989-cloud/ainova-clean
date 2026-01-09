# 🚀 AINOVA - Telepítési Útmutató

> Egységes dokumentáció az SQL Server kapcsolathoz és az alkalmazás beállításához.

---

## 📋 Előfeltételek

- Node.js 18+ (ajánlott: 20 LTS)
- SQL Server Management Studio (SSMS)
- VPN kapcsolat a TDK hálózathoz

---

## ⚡ Gyors Indítás (3 lépés)

### 1. SQL Script Futtatása

**SSMS csatlakozási adatok:**
```
Server:   SVEEA0160.tdk-prod.net
Database: LaC_BasicDatas_TEST
Login:    Lac_BasicDatas_TEST_admin
Password: Ad5-Ton~{pXkb{=
```

Futtasd: `scripts/setup-ainova-users.sql`

### 2. Kapcsolat Tesztelése

```powershell
npm run db:test
```

Várt kimenet:
```
✅ Connection successful!
✅ Table dbo.AinovaUsers exists
✅ Total users: 2
```

### 3. Alkalmazás Indítása

```powershell
npm run dev
```

Nyisd meg: http://localhost:3000/login

---

## 🔐 Felhasználókezelés

A felhasználók a `dbo.AinovaUsers` táblában vannak tárolva.

**Új felhasználó létrehozása:**
1. Bejelentkezés admin jogosultsággal
2. Dashboard → Admin → Felhasználók
3. "Új felhasználó" gomb

**Szerepkörök:**
- `Admin` - Teljes hozzáférés, user kezelés
- `Manager` - Vezetői funkciók
- `Műszakvezető` - Műszak adatok kezelése
- `Operátor` - Alap hozzáférés

⚠️ **Jelszavak bcrypt hashelt formában tárolódnak a `PasswordHash` mezőben.**

---

## 🗄️ Adatbázis Séma

### dbo.AinovaUsers

| Mező | Típus | Leírás |
|------|-------|--------|
| UserId | INT | Elsődleges kulcs (auto-increment) |
| Username | NVARCHAR(50) | Egyedi felhasználónév |
| PasswordHash | NVARCHAR(255) | bcrypt hash (KÖTELEZŐ) |
| FullName | NVARCHAR(100) | Teljes név |
| Role | NVARCHAR(50) | Admin, Műszakvezető, Operátor |
| Email | NVARCHAR(100) | Email cím (opcionális) |
| IsActive | BIT | Aktív státusz (1/0) |
| FirstLogin | BIT | Első bejelentkezés jelző |
| CreatedAt | DATETIME | Létrehozás ideje |
| UpdatedAt | DATETIME | Utolsó módosítás |

### dbo.Sessions

| Mező | Típus | Leírás |
|------|-------|--------|
| SessionId | NVARCHAR(64) | Elsődleges kulcs |
| UserId | INT | Felhasználó ID (FK) |
| ExpiresAt | DATETIME | Lejárat ideje |
| CreatedAt | DATETIME | Létrehozás ideje |

### Egyéb táblák

- `dbo.Teljesitmeny` - Teljesítmény adatok
- `dbo.NapiPerces` - Napi perces bontás
- `dbo.Poziciok` - Pozíció definíciók
- `dbo.LoginHistory` - Audit napló

---

## ⚙️ Konfiguráció

### Környezeti Változók (.env.local)

```env
# SQL Server
DB_SERVER=SVEEA0160.tdk-prod.net
DB_DATABASE=LaC_BasicDatas_TEST
DB_USER=Lac_BasicDatas_TEST_admin
DB_PASSWORD=Ad5-Ton~{pXkb{=

# Session
SESSION_SECRET=<random 64 karakter>

# Környezet (development/production)
NODE_ENV=development
```

### Connection Pool Beállítások

A `lib/db.ts` fájlban konfigurálva:

| Beállítás | Érték |
|-----------|-------|
| Min kapcsolat | 2 |
| Max kapcsolat | 10 |
| Idle timeout | 30s |
| Connection timeout | 30s |
| Request timeout | 30s |
| Encryption | true (TLS) |

---

## 🛡️ Biztonsági Jellemzők

| Jellemző | Státusz | Leírás |
|----------|---------|--------|
| HTTP-only cookies | ✅ | XSS védelem |
| Parameterized queries | ✅ | SQL injection védelem |
| SameSite cookies | ✅ | CSRF védelem |
| bcrypt jelszó hash | ✅ | Biztonságos tárolás |
| Rate limiting | ✅ | 5 próba / 15 perc |
| Session cache | ✅ | 5 perc cache (teljesítmény) |
| Audit logging | ✅ | LoginHistory tábla |

---

## 📝 NPM Scriptek

```powershell
npm run dev       # Fejlesztői szerver indítása
npm run build     # Produkciós build
npm run start     # Produkciós szerver
npm run db:test   # Adatbázis kapcsolat teszt
npm run db:setup  # Setup útmutató megjelenítése
npm run lint      # ESLint ellenőrzés
```

---

## 🐛 Hibaelhárítás

### Kapcsolódási hiba

```
Error: Failed to connect to SQL Server
```

**Megoldás:**
1. Ellenőrizd a VPN kapcsolatot
2. `ping SVEEA0160.tdk-prod.net`
3. Ellenőrizd a `.env.local` fájl értékeit
4. Tűzfal beállítások (1433-as port)

### Tábla nem található

```
Error: Invalid object name 'dbo.AinovaUsers'
```

**Megoldás:**
1. Futtasd: `scripts/setup-ainova-users.sql` SSMS-ben
2. Ellenőrizd: `npm run db:test`

### Bejelentkezés sikertelen

**Ellenőrzés:**
```powershell
npm run db:test
```

**Lehetséges okok:**
- A felhasználó nem létezik
- Rossz jelszó
- `IsActive = 0`
- Sessions tábla nem létezik

---

## 🚀 Produkciós Checklist

Élesítés előtt ellenőrizd:

- [ ] Minden jelszó bcrypt hashelt
- [ ] Test fiókok törölve (dev/admin)
- [ ] `NODE_ENV=production` beállítva
- [ ] HTTPS engedélyezve
- [ ] `.env.local` → `.env.production`
- [ ] Session beállítások ellenőrizve
- [ ] Rate limiting megfelelő
- [ ] Audit logging működik

---

## 📞 Támogatás

1. Futtasd: `npm run db:test` diagnosztikához
2. Ellenőrizd a terminál logokat
3. Nézd meg a [MODULES.md](MODULES.md) dokumentációt
4. IT támogatás szerverproblémák esetén

---

*Utolsó frissítés: 2025. január*
