# 📚 AINOVA Modul Dokumentáció

**Frissítve:** 2026. január 7.

---

## 🔐 1. AUTH MODUL

### Leírás
Felhasználói azonosítás és munkamenet-kezelés.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `lib/auth.ts` | Core auth logika (login, logout, validateSession) |
| `lib/db.ts` | SQL Server kapcsolat kezelés |
| `middleware.ts` | Route védelem (Edge Runtime) |
| `app/api/auth/login/route.ts` | Login API endpoint |
| `app/api/auth/logout/route.ts` | Logout API endpoint |
| `app/api/auth/validate-session/route.ts` | Session validáció API |
| `app/api/auth/change-password/route.ts` | Jelszó módosítás API |
| `app/login/page.tsx` | Login oldal UI |

### Működés
1. **Login:** User + jelszó → bcrypt ellenőrzés → session létrehozás (UUID) → cookie beállítás
2. **Session:** HTTP-only cookie, 24h lejárat, 5 perces cache
3. **Middleware:** Minden request → session validálás → user context header-be
4. **Rate limiting:** 5 sikertelen próba → 15 perc blokkolás

### Adatbázis táblák
- `dbo.AinovaUsers` - Felhasználók
- `dbo.Sessions` - Aktív munkamenetek
- `dbo.LoginHistory` - Audit log

### Biztonsági jellemzők
- ✅ Bcrypt hash (12 rounds)
- ✅ HTTP-only cookie
- ✅ Rate limiting
- ✅ Session cache (DoS védelem)
- ⚠️ Plain text jelszó támogatás (fejlesztéshez)

---

## 👥 2. ADMIN MODUL

### Leírás
Felhasználók kezelése, rendszer adminisztráció.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `app/api/admin/users/route.ts` | User lista + létrehozás |
| `app/api/admin/users/[id]/route.ts` | User CRUD (GET, PATCH, DELETE) |
| `app/api/admin/verify/route.ts` | Admin re-autentikáció |
| `app/dashboard/admin/page.tsx` | Admin főoldal |
| `app/dashboard/admin/users/page.tsx` | User lista oldal |
| `components/dashboard/admin/*` | Admin komponensek |
| `lib/validators/user.ts` | User validációk |
| `lib/types/admin.ts` | Admin típusok |

### Funkciók
- **User lista:** Lapozás, keresés, szűrés (role, shift, aktív)
- **User létrehozás:** Validáció, duplikáció ellenőrzés, bcrypt hash
- **User módosítás:** Részleges update, cascade a teljesítmény táblába
- **User törlés:** Soft delete (deaktiválás) vagy hard delete
- **Admin védelem:** Re-autentikáció az admin panelhez

### Szerepkörök
| Szerepkör | Jogosultságok |
|-----------|---------------|
| Admin | Teljes hozzáférés |
| Manager | User kezelés (limitált) |
| Műszakvezető | Csak olvasás |
| Műszakvezető helyettes | Csak olvasás |
| NPI Technikus | Csak olvasás |
| Operátor | Csak olvasás |

---

## 👷 3. LÉTSZÁM MODUL

### Leírás
Napi létszám adatok rögzítése műszakonként.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `app/api/letszam/route.ts` | Létszám API (GET, POST) |
| `app/dashboard/letszam/page.tsx` | Létszám rögzítő oldal |
| `components/letszam/*` | Létszám komponensek |

### Működés
1. User kiválaszt dátumot + műszakot
2. Pozíciónként megadja: megjelent, táppénz, szabadság
3. Rendszer számolja: bruttó létszám, hiányzás %, leadási cél
4. Mentés tranzakcióban + audit log

### Pozíciók
**Operatív (produktív):**
- Előkészítő, Huzalos tekercselő, Fóliás tekercselő
- Maró-ónozó, LaC szerelő, Kis DC szerelő, Nagy DC szerelő
- Mérő, Impregnáló, Végszerelő, Csomagoló

**Nem operatív:**
- Gyártásszervező, Műszakvezető, Minőségellenőr

**Kritikus pozíciók:** Mérő, Csomagoló, Minőségellenőr

### Adatbázis táblák
- `ainova_letszam` - Napi létszám adatok
- `ainova_letszam_audit_log` - Változás napló
- `ainova_riport_koteles_log` - Riport köteles módosítások

### Különleges szabályok
- **Riport köteles:** 1 napnál régebbi módosításnál indoklás szükséges
- **Felülírás figyelmeztetés:** Ha már van mentett adat az adott napra

---

## 📊 4. TELJESÍTMÉNY MODUL

### Leírás
Operátori teljesítmény kimutatások és ranglisták.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `app/api/teljesitmeny/route.ts` | Teljesítmény adatok API |
| `app/api/teljesitmeny/import/route.ts` | Excel import API |
| `app/api/teljesitmeny/check/route.ts` | Import check API |
| `app/dashboard/teljesitmeny/page.tsx` | Teljesítmény dashboard |

### Kimutatás típusok
| Típus | Leírás | Lapozás |
|-------|--------|---------|
| `napi-kimutatas` | 20 nap, műszakonként | ✅ |
| `heti-kimutatas` | 12 hét, műszakonként | ✅ |
| `havi-kimutatas` | 12 hónap, műszakonként | ❌ |
| `egyeni-ranglista` | Top operátorok (30 nap) | ❌ |
| `egyeni-trend` | Egy operátor trendje | ✅ |

### Számítási szabályok
- **Napi cél:** 480 perc = 100%
- **Érvénytelen nap:** < 1000 perc összesen (vasárnap, hiba)
- **Mai nap:** Mindig kihagyva (nincs lezárva)
- **Trend:** Utolsó 7 nap vs előző 7 nap

### Adatbázis
- `ainova_teljesitmeny` - Napi perc adatok operátoronként
- `ainova_operatorok` - Operátor master adat
- `ainova_import_status` - Import státusz

### Excel import
- **Forrás:** Hálózati Excel fájl (PEMC.ver5_2025.07.21.xlsm)
- **Fülek:** "Filter létszám" (operátorok), "Percek" (adatok)
- **Szűrés:** F1L munkaterület, B/C műszak

---

## 📈 5. NAPI PERCES MODUL

### Leírás
Lehívás vs Leadás összehasonlítás napi szinten.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `app/api/napi-perces/route.ts` | Napi perces API |
| `app/api/napi-perces/import/route.ts` | Import API |
| `app/dashboard/napi-perces/page.tsx` | Napi perces dashboard |

### Adatok
- **Cél:** Napi terv
- **Lehívott:** Siemens, No-Siemens, Összesen
- **Leadott:** Siemens, No-Siemens, KACO

### Adatbázis
- `ainova_napi_perces` - Napi adatok
- `ainova_napi_perces_import_status` - Import státusz

### Auto-import
- Induláskor ellenőrzi az Excel módosítási dátumát
- 1 óránál régebbi import → újra importál
- Csak az aktuális hónap füle

---

## 📋 6. KIMUTATÁS MODUL

### Leírás
Létszám és leadás statisztikák összesítése.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `app/api/kimutatas/route.ts` | Kimutatás API |
| `app/dashboard/kimutatas/page.tsx` | Kimutatás oldal |

### Adatok
- Produktív létszám (operatív - MEÓ nélkül)
- Nem produktív létszám
- MEÓ létszám (külön)
- Becsült leadás (produktív × 480)
- Heti összesítések

---

## 📤 7. EXPORT MODUL

### Leírás
Adatok exportálása Excel formátumba.

### Fájlok
| Fájl | Funkció |
|------|---------|
| `app/api/export/route.ts` | Excel export API |

### Export típusok
- `teljesitmeny` - Nyers teljesítmény adatok
- `teljesitmeny-muszak` - Műszak összesítés
- `teljesitmeny-operator` - Operátor összesítés

---

## 🔗 MODUL KAPCSOLATOK

```
┌─────────────┐     ┌─────────────┐
│   AUTH      │────►│  MIDDLEWARE │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ADMIN     │────►│   USERS     │◄────│  LÉTSZÁM    │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ TELJESÍTMÉNY│────►│  KIMUTATÁS  │
                    └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ NAPI PERCES │
                    └─────────────┘
```

### Adatfolyam
1. **Excel** → Import API → `ainova_teljesitmeny` / `ainova_napi_perces`
2. **User** → Létszám UI → `ainova_letszam`
3. **Dashboard** ← Kimutatás API ← Mindkét forrás

---

*Utoljára frissítve: 2026. január 7.*
