# 🏭 AINOVA - Termelésirányítási Rendszer

> TDK Hungary termelési dashboard Next.js 16 alapokon

## ⚡ Gyors Indítás

```powershell
npm install
npm run dev
```

Nyisd meg: http://localhost:3000

## 📚 Dokumentáció

| Dokumentum | Leírás |
|------------|--------|
| [docs/SETUP.md](docs/SETUP.md) | Telepítési útmutató |
| [docs/MODULES.md](docs/MODULES.md) | Modul dokumentáció |
| [docs/TODO.md](docs/TODO.md) | Fejlesztési feladatok |
| [docs/MILESTONES.md](docs/MILESTONES.md) | Verzió roadmap |

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, SQL Server (mssql)
- **Vizualizáció:** Recharts, Framer Motion
- **Auth:** bcrypt, HTTP-only cookies, session cache

## 📦 NPM Scriptek

```powershell
npm run dev       # Fejlesztői szerver
npm run build     # Produkciós build
npm run db:test   # Adatbázis teszt
npm run lint      # ESLint
```

## 🔐 Bejelentkezés

SAP usernév + jelszó (bcrypt hash).
Alapértelmezett jelszó visszaállítás után: `Ainova2025!`

## 📂 Projekt Struktúra

```
ainova-clean/
├── app/              # Next.js App Router
│   ├── api/          # API végpontok
│   └── dashboard/    # Dashboard oldalak
├── components/       # React komponensek
├── lib/              # Shared utilities
├── scripts/          # SQL és utility scriptek
└── docs/             # Dokumentáció
```

## 🏗️ Modulok

- **Letszám** - Műszak és pozíció kezelés
- **Teljesítmény** - Termelési riportok
- **Napi Perces** - Részletes termelési adatok
- **Kimutatás** - Összesítő grafikonok
- **Admin** - Felhasználó kezelés

---

*© 2025 TDK Hungary - AINOVA Project*
