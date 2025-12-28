# AINOVA - Vállalati Alkalmazás

**AINOVA** egy Next.js 16 alapú vállalati webalkalmazás gyártási létszám- és teljesítményadatok kezelésére.

## 📚 Dokumentáció

Ez a README egy gyors áttekintést nyújt. **Részletes dokumentációért lásd:**

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Teljes projekt áttekintés magyarul
  - Technológiai stack részletesen
  - Adatbázis séma és kapcsolatok
  - API végpontok dokumentációja
  - Frontend komponensek leírása
  - Biztonsági jellemzők
  - Modulok és funkciók
  
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Rendszer architektúra
  - High-level architektúra diagramok
  - Request-response flow diagramok
  - Database connection architecture
  - Security architecture
  - Deployment architecture

- **[scripts/db-schema.sql](./scripts/db-schema.sql)** - Adatbázis séma

## 🚀 Gyors Kezdés

### Követelmények

- **Node.js 20+** és npm
- **SQL Server** vagy **LocalDB**
- **Git**

### 1. Telepítés

```bash
# Repository klónozása
git clone https://github.com/timetolife1989-cloud/ainova-clean.git
cd ainova-clean

# Dependencies telepítése
npm install
```

### 2. Adatbázis Beállítás

```bash
# SQL Server indítása, majd futtasd:
# scripts/db-schema.sql fájlt SQL Server Management Studio-ban
# vagy sqlcmd segítségével
```

### 3. Környezeti Változók

Hozz létre egy `.env.local` fájlt a projekt gyökerében:

```env
# Database connection
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=AINOVA_DEV
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Feature flags
FE_LOGIN_RATE_LIMIT=true
FE_LOGIN_AUDIT=true
FE_LOGIN_FIRST_LOGIN_FORCE=true
```

### 4. Fejlesztői Szerver Indítása

```bash
npm run dev
```

Nyisd meg böngészőben: [http://localhost:3000](http://localhost:3000)

### 5. Demo Bejelentkezés

```
Username: demo
Password: demo123
```

## 🏗 Projekt Struktúra

```
ainova-clean/
├── app/                    # Next.js App Router (pages + API)
│   ├── api/                # Backend API endpoints
│   ├── dashboard/          # Dashboard modulok
│   ├── login/              # Login oldal
│   └── layout.tsx          # Root layout
├── components/             # React komponensek
│   ├── dashboard/          # Dashboard komponensek
│   ├── letszam/            # Létszám modul komponensek
│   └── login/              # Login komponensek
├── lib/                    # Backend üzleti logika
│   ├── auth.ts             # Authentikáció
│   └── db.ts               # SQL Server kapcsolat
├── scripts/                # Utility scriptek
│   └── db-schema.sql       # Adatbázis séma
└── public/                 # Statikus fájlok
```

## 🎯 Főbb Funkciók

- ✅ **Biztonságos Authentikáció** - bcrypt, HTTP-only cookies, rate limiting
- ✅ **Dashboard** - Modul választó menü
- ✅ **Létszám Rögzítés** - Műszakos létszám adatok (operatív + nem-operatív)
- ✅ **Admin Panel** - Felhasználó kezelés
- 🚧 **Teljesítmény Adat Rögzítés** - Fejlesztés alatt
- 🚧 **Gépadat Rögzítés** - Fejlesztés alatt

## 🛠 Scriptek

```bash
npm run dev       # Fejlesztői szerver (http://localhost:3000)
npm run build     # Production build
npm run start     # Production szerver
npm run lint      # ESLint kód ellenőrzés
```

## 🔐 Biztonság

- **bcrypt password hashing** (12 rounds)
- **HTTP-only cookies** (XSS védelem)
- **Rate limiting** (5 fail / 15 min)
- **Parameterized SQL queries** (SQL injection védelem)
- **CSRF protection** (SameSite cookies)
- **Audit trail** (LoginHistory)

## 📦 Technológiai Stack

- **Next.js 16** - React framework
- **TypeScript 5** - Type-safe development
- **SQL Server / LocalDB** - Adatbázis
- **Framer Motion** - Animációk
- **Tailwind CSS** - Styling
- **bcryptjs** - Password hashing
- **mssql** - SQL Server driver

## 📖 További Információk

### Next.js Tudásbázis
- [Next.js Documentation](https://nextjs.org/docs) - Next.js funkciók és API
- [Learn Next.js](https://nextjs.org/learn) - Interaktív Next.js tutorial

### AINOVA Specifikus
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - **Teljes projekt dokumentáció (KEZDD ITT!)**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architektúra diagramok
- [scripts/db-schema.sql](./scripts/db-schema.sql) - Adatbázis séma

## 📄 Licensz

Private - Belső használatra

## 👥 Közreműködés

Projekt tulajdonos: [@timetolife1989-cloud](https://github.com/timetolife1989-cloud)

---

**Verzió**: 0.1.0  
**Utoljára frissítve**: 2024-12-28
