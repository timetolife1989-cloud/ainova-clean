# ✅ AINOVA Fejlesztési TODO Lista

**Frissítve:** 2026. január 7.

---

## 🔴 KRITIKUS PRIORITÁS (1-2 hét)

### K1. Bcrypt duplikáció megszüntetése
- [ ] `bcryptjs` eltávolítása package.json-ból
- [ ] Minden fájlban `bcrypt`-re cserélni
- [ ] Tesztelni: login, user create, admin verify
- **Érintett fájlok:** `lib/auth.ts`, `app/api/admin/users/route.ts`, `app/api/admin/verify/route.ts`

### K2. Plain text jelszavak tiltása
- [ ] `lib/auth.ts` - production módban warning helyett error
- [ ] Migration script: meglévő plain text jelszavak hash-elése
- [ ] `.env` flag: `ALLOW_PLAINTEXT_PASSWORDS=false`

### K3. Teljesítmény oldal darabolása
- [ ] `TeljesitmenyChart.tsx` komponens kiemelése
- [ ] `EgyeniRanglista.tsx` komponens kiemelése  
- [ ] `EgyeniTrend.tsx` komponens kiemelése
- [ ] `MuszakSelector.tsx` közös komponens
- [ ] Custom hooks: `useTeljesitmenyData.ts`, `useEgyeniData.ts`
- **Cél:** 1309 sor → max 300 sor/fájl

### K4. Duplikált dokumentáció konszolidálása
- [ ] `README.md` - projekt-specifikus tartalommal frissíteni
- [ ] `SETUP_GUIDE.md` + `DATABASE_SETUP.md` + `SETUP_COMPLETE.md` → `docs/SETUP.md`
- [ ] Gyökérből törölni a régi fájlokat
- [ ] `.gitignore` frissítése (debug fájlok)

---

## 🟡 FONTOS PRIORITÁS (2-4 hét)

### F1. Admin Settings modul
- [ ] `ainova_settings` SQL tábla létrehozása
- [ ] `/api/admin/settings` API endpoint (GET, PUT)
- [ ] Admin UI: Beállítások oldal
- [ ] Konstansok betöltése DB-ből induláskor

**Adminból állítható beállítások:**
| Kulcs | Típus | Alapérték |
|-------|-------|-----------|
| `session_timeout_hours` | number | 24 |
| `rate_limit_attempts` | number | 5 |
| `rate_limit_window_minutes` | number | 15 |
| `daily_target_minutes` | number | 480 |
| `min_valid_daily_minutes` | number | 1000 |
| `maintenance_mode` | boolean | false |

### F2. Pozíciók admin kezelése
- [ ] `ainova_poziciok` SQL tábla létrehozása
- [ ] `/api/admin/poziciok` API endpoint
- [ ] Hard-coded pozíciók migrálása DB-be
- [ ] Frontend: pozíciók listázása DB-ből
- [ ] Kritikus pozíciók jelölése adminból

### F3. RBAC middleware
- [ ] `lib/middleware/auth.ts` - újrafelhasználható
- [ ] Role check helper: `requireRole(['Admin', 'Manager'])`
- [ ] API route-ok átírása middleware használatára
- [ ] Egységes 403 hibakezelés

### F4. Service layer bevezetése
- [ ] `lib/services/auth.service.ts`
- [ ] `lib/services/user.service.ts`
- [ ] `lib/services/teljesitmeny.service.ts`
- [ ] `lib/services/letszam.service.ts`
- [ ] API route-ok egyszerűsítése (csak routing + validation)

### F5. Létszám oldal refaktorálás
- [ ] 796 sor → komponensekre bontás
- [ ] `LetszamForm.tsx` kiemelése
- [ ] `LetszamModals.tsx` kiemelése
- [ ] Custom hook: `useLetszamData.ts`

---

## 🟢 KÖZEPES PRIORITÁS (1-2 hónap)

### K1. Redis cache bevezetése
- [ ] Redis kliens telepítése
- [ ] Session cache Redis-be
- [ ] Rate limiting Redis-be
- [ ] Feature flag: fallback in-memory-ra

### K2. React Query bevezetése
- [ ] `@tanstack/react-query` telepítése
- [ ] Provider setup
- [ ] API hívások átírása query-kre
- [ ] Automatic refetch, stale-while-revalidate

### K3. Egységtesztek
- [ ] Jest/Vitest setup
- [ ] `lib/auth.ts` tesztek
- [ ] `lib/validators/*.ts` tesztek
- [ ] API route tesztek (mock DB)

### K4. API dokumentáció
- [ ] OpenAPI/Swagger spec
- [ ] Automatikus generálás route-okból
- [ ] Swagger UI endpoint

---

## 🔵 ALACSONY PRIORITÁS (2+ hónap)

### A1. E2E tesztek
- [ ] Playwright setup
- [ ] Login flow teszt
- [ ] Admin CRUD tesztek
- [ ] Létszám mentés teszt

### A2. Teljesítmény optimalizálás
- [ ] Bundle analyzer
- [ ] Code splitting
- [ ] Lazy loading komponensek
- [ ] Image optimization

### A3. Logging és monitoring
- [ ] Strukturált logging (winston/pino)
- [ ] Request ID tracking
- [ ] Error aggregation (Sentry)
- [ ] Performance monitoring

### A4. CI/CD pipeline
- [ ] GitHub Actions setup
- [ ] Lint + type check
- [ ] Tesztek futtatása
- [ ] Automatikus deployment

---

## 🗑️ TÖRLENDŐ FÁJLOK

### Azonnal törölhető
- [ ] `PEMC-debug.xlsm` - debug fájl
- [ ] `scripts/002_users_and_shifts.sql` - van FINAL verzió
- [ ] `scripts/db-schema.sql` - elavult struktúra
- [ ] `scripts/mock-data.sql` - teszt adat
- [ ] `scripts/dummy-teljesitmeny.sql` - teszt adat
- [ ] `scripts/letszam-dummy-data.sql` - teszt adat
- [ ] `scripts/torol-mock-adatok.sql` - ha nincs mock

### Konszolidálás után törölhető
- [ ] `SETUP_GUIDE.md` → `docs/SETUP.md`
- [ ] `DATABASE_SETUP.md` → `docs/SETUP.md`
- [ ] `SETUP_COMPLETE.md` → `docs/SETUP.md`

---

## 📦 PACKAGE.JSON TISZTÍTÁS

### Törölendő dependency
```json
"bcryptjs": "^2.4.3"  // Duplikált - bcrypt marad
```

### Hiányzó konstans hozzáadása
```typescript
// lib/constants.ts - HIÁNYZIK:
export const BCRYPT_ROUNDS = 12;
```

---

## ✅ BEFEJEZETT FELADATOK

- [x] Projekt audit elkészítése (2026.01.07)
- [x] TODO lista létrehozása (2026.01.07)
- [x] Mérföldkő fájl létrehozása (2026.01.07)

---

*Utoljára frissítve: 2026. január 7.*
