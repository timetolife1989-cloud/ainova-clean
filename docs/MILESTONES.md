# 🏆 AINOVA Mérföldkövek (Milestones)

**Projekt kezdete:** 2025  
**Aktuális verzió:** 0.1.0  
**Célverzió:** 1.0.0 (Production Ready)

---

## 📍 Verzió Roadmap

```
v0.1.0 (Jelenlegi) ──► v0.2.0 ──► v0.3.0 ──► v0.5.0 ──► v1.0.0
   │                      │          │          │          │
   │                      │          │          │          └── Production Ready
   │                      │          │          └── Admin Settings + Redis
   │                      │          └── Service Layer + RBAC
   │                      └── Kód tisztítás + Dokumentáció
   └── Alap funkciók működnek
```

---

## 🎯 v0.2.0 - Kód Minőség
**Cél dátum:** 2026. január 21.  
**Státusz:** 🔄 Folyamatban

### Feladatok

| # | Feladat | Státusz | Felelős |
|---|---------|---------|---------|
| 1 | Bcrypt duplikáció megszüntetése | ⬜ | - |
| 2 | Plain text jelszavak tiltása | ⬜ | - |
| 3 | Dokumentáció konszolidálás | ⬜ | - |
| 4 | Felesleges fájlok törlése | ⬜ | - |
| 5 | `BCRYPT_ROUNDS` konstans hozzáadása | ⬜ | - |
| 6 | package.json tisztítás | ⬜ | - |

### Sikerkritériumok
- [ ] Csak `bcrypt` van telepítve (nem `bcryptjs`)
- [ ] Production-ben nincs plain text jelszó támogatás
- [ ] Dokumentáció a `docs/` mappában
- [ ] Nincs duplikált SQL script
- [ ] `npm run build` hiba nélkül fut

---

## 🎯 v0.3.0 - Komponens Refaktor
**Cél dátum:** 2026. február 4.  
**Státusz:** ⬜ Tervezés

### Feladatok

| # | Feladat | Státusz |
|---|---------|---------|
| 1 | Teljesítmény oldal darabolása (1309→300 sor) | ⬜ |
| 2 | Létszám oldal darabolása (796→300 sor) | ⬜ |
| 3 | Közös komponensek kiemelése | ⬜ |
| 4 | Custom hooks létrehozása | ⬜ |
| 5 | `hooks/` mappa struktúra | ⬜ |

### Sikerkritériumok
- [ ] Nincs 400 sornál hosszabb komponens
- [ ] Minden oldalhoz tartozik custom hook
- [ ] Közös komponensek: `MuszakSelector`, `DateRangeSelector`
- [ ] Minden komponens TypeScript típusokkal

---

## 🎯 v0.4.0 - Service Layer + RBAC
**Cél dátum:** 2026. február 18.  
**Státusz:** ⬜ Tervezés

### Feladatok

| # | Feladat | Státusz |
|---|---------|---------|
| 1 | `lib/services/` mappa létrehozása | ⬜ |
| 2 | Auth service | ⬜ |
| 3 | User service | ⬜ |
| 4 | Teljesítmény service | ⬜ |
| 5 | Létszám service | ⬜ |
| 6 | RBAC middleware | ⬜ |
| 7 | API route-ok egyszerűsítése | ⬜ |

### Sikerkritériumok
- [ ] API route-ok max 50 sor
- [ ] Üzleti logika service-ekben
- [ ] RBAC: `requireRole()` helper működik
- [ ] Egységes hibakezelés minden API-n

---

## 🎯 v0.5.0 - Admin Settings
**Cél dátum:** 2026. március 4.  
**Státusz:** ⬜ Tervezés

### Feladatok

| # | Feladat | Státusz |
|---|---------|---------|
| 1 | `ainova_settings` tábla | ⬜ |
| 2 | `ainova_poziciok` tábla | ⬜ |
| 3 | Settings API | ⬜ |
| 4 | Pozíciók API | ⬜ |
| 5 | Admin Beállítások UI | ⬜ |
| 6 | Admin Pozíciók UI | ⬜ |
| 7 | Konstansok DB-ből | ⬜ |

### Sikerkritériumok
- [ ] Session timeout állítható adminból
- [ ] Rate limit állítható adminból
- [ ] Pozíciók szerkeszthetők adminból
- [ ] Kritikus pozíciók jelölhetők
- [ ] Karbantartás mód bekapcsolható

---

## 🎯 v0.6.0 - Tesztelés
**Cél dátum:** 2026. március 18.  
**Státusz:** ⬜ Tervezés

### Feladatok

| # | Feladat | Státusz |
|---|---------|---------|
| 1 | Jest/Vitest setup | ⬜ |
| 2 | Auth tesztek | ⬜ |
| 3 | Validator tesztek | ⬜ |
| 4 | Service tesztek | ⬜ |
| 5 | API integration tesztek | ⬜ |

### Sikerkritériumok
- [ ] Min. 70% code coverage lib/ mappán
- [ ] Minden validator tesztelve
- [ ] Auth flow tesztelve
- [ ] CI-ban futnak a tesztek

---

## 🎯 v0.7.0 - Redis + Skálázhatóság
**Cél dátum:** 2026. április 1.  
**Státusz:** ⬜ Tervezés

### Feladatok

| # | Feladat | Státusz |
|---|---------|---------|
| 1 | Redis kliens setup | ⬜ |
| 2 | Session cache Redis-be | ⬜ |
| 3 | Rate limiting Redis-be | ⬜ |
| 4 | Fallback mechanism | ⬜ |
| 5 | Health check endpoint | ⬜ |

### Sikerkritériumok
- [ ] Redis cache működik
- [ ] Fallback in-memory működik
- [ ] Multi-instance rate limiting
- [ ] `/api/health` endpoint

---

## 🎯 v1.0.0 - Production Ready
**Cél dátum:** 2026. május 1.  
**Státusz:** ⬜ Tervezés

### Előfeltételek
- [ ] v0.7.0 minden feladata kész
- [ ] Security audit kész
- [ ] Performance teszt kész
- [ ] Dokumentáció teljes
- [ ] E2E tesztek zöldek

### Production checklist
- [ ] Minden plain text jelszó hash-elve
- [ ] CSP headers beállítva
- [ ] Rate limiting működik
- [ ] Logging beállítva
- [ ] Error tracking (Sentry) beállítva
- [ ] Backup stratégia dokumentálva
- [ ] Rollback terv készen

---

## 📊 Haladás Összesítő

| Mérföldkő | Feladatok | Kész | Haladás |
|-----------|-----------|------|---------|
| v0.2.0 | 6 | 0 | 0% |
| v0.3.0 | 5 | 0 | 0% |
| v0.4.0 | 7 | 0 | 0% |
| v0.5.0 | 7 | 0 | 0% |
| v0.6.0 | 5 | 0 | 0% |
| v0.7.0 | 5 | 0 | 0% |
| v1.0.0 | - | - | 0% |

**Összesen:** 35+ feladat a v1.0.0-ig

---

## 📝 Verzió Történet

### v0.1.0 (Jelenlegi - 2026.01.07)
- ✅ Login/Logout működik
- ✅ Session kezelés
- ✅ Admin user kezelés (CRUD)
- ✅ Létszám modul (alapok)
- ✅ Teljesítmény modul (alapok)
- ✅ Napi perces modul (alapok)
- ✅ Kimutatás modul (alapok)
- ✅ Excel import (teljesítmény, napi perces)
- ⚠️ Ismert hibák: bcrypt duplikáció, túl nagy komponensek

---

*Utoljára frissítve: 2026. január 7.*
