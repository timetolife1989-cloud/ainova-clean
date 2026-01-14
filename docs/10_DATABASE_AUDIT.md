# AINOVA Adatbázis Audit

**Dátum**: 2026-01-14  
**Adatbázis**: LaC_BasicDatas_TEST @ SVEEA0160.tdk-prod.net

---

## 📊 TÁBLÁK ÖSSZEFOGLALÁSA

### Aktív táblák (használatban)

| Tábla | Rekordok | Forrás | Szinkronizálás | Cél |
|-------|----------|--------|----------------|-----|
| `AinovaUsers` | 8 | Manuális | - | Felhasználók bejelentkezés |
| `AinovaShiftSchedule` | 54 | Manuális | - | Műszakbeosztás heti |
| `ainova_poziciok` | 21 | Manuális | - | Pozíció lista (dropdown) |
| `ainova_folyamat_kategoriak` | 11 | Manuális | - | Kategória lista (kördiagram) |
| `ainova_operatorok` | 90 | Excel | sync-allokacio-excel.js | Operátor törzsadatok |
| `ainova_letszam` | 924 | UI Input | - | Létszám nap/műszak/pozíció |
| `ainova_letszam_audit_log` | 42 | Auto | trigger | Létszám változás napló |
| `ainova_teljesitmeny` | 919 | Excel | Import UI | Egyéni teljesítmény % |
| `ainova_termek_normak` | 719 | Excel | sync-allokacio-excel.js | Típuskód normaidők (K.Z norma) |
| `ainova_sap_folyamatok` | 91 | SQL | folyamat-kategoriak.js | SAP művelet → kategória mapping |
| `ainova_heti_terv` | 68 | Excel | sync-allokacio-excel.js | Heti aggregált terv |
| `ainova_napi_terv` | 410 | Excel | sync-allokacio-excel.js | Napi bontott terv + leadott |
| `ainova_napi_perces` | 8 | Excel | Import UI | Napi célperc/lehívott/leadott |
| `ainova_napi_kategoria_perc` | 165 | Excel | sync-perc-sap-kategoriak.js | Kategóriánkénti leadott perc |
| `ainova_szinkron_log` | 54 | Auto | - | Szinkronizálás napló |
| `ainova_munkanap_config` | 3 | Config | - | Munkanap beállítások |

### ⚠️ Üres táblák (elemzendő)

| Tábla | Rekordok | Státusz | Javaslat |
|-------|----------|---------|----------|
| `ainova_napi_teljesules` | **0** | ⚠️ Nem töltött | Van API de nincs szinkron |
| `ainova_termek_sap_idok` | **0** | ⚠️ Nem töltött | K.Z normából kellene |
| `ainova_operator_belyegzok` | **0** | ℹ️ Feature | Jövőbeli fejlesztés |
| `ainova_operator_orvosi` | **0** | ℹ️ Feature | Operátor orvosi alkalmassági |
| `ainova_user_orvosi` | 1 | ✅ | User orvosi (van 1 teszt) |
| `ainova_riport_koteles_log` | 1 | ✅ | Riport kötelező log |
| `ainova_import_status` | 1 | ✅ | Teljesítmény import státusz |
| `ainova_napi_perces_import_status` | 1 | ✅ | Napi perces import státusz |

---

## 🔄 ADATÁRAMLÁS DIAGRAM

```
                            EXCEL FORRÁSOK
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   War Room Excel                PEMC Excel                Teljesítmény      │
│   O:\!Production\LAC\!          O:\Administration\HR\     Excel             │
│   War Room Tracker...           PEMC.ver5_2025.07.21      (manuális)        │
│                                                                             │
│   ├── CW03 ütemterv            ├── PERC SAP sheet                           │
│   │   (heti/napi terv)         │   (100k+ sor)                              │
│   │                            │   - munkahely_kód                          │
│   ├── Összegyűjtés             │   - művelet                                │
│   │   (leadott db)             │   - visszajelentett_perc                   │
│   │                            │   - dátum                                  │
│   └── K.Z norma                │                                            │
│       (típuskód normák)        └── FIX/tekercs                              │
│                                                                             │
└───────────────┬──────────────────────────┬────────────────────────┬─────────┘
                │                          │                        │
                ▼                          ▼                        ▼
       sync-allokacio-excel.js    sync-perc-sap-kategoriak.js   UI Import
                │                          │                        │
                ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ADATBÁZIS TÁBLÁK                                 │
│                                                                             │
│   ┌──────────────────┐     ┌──────────────────────────┐                     │
│   │ ainova_heti_terv │     │ ainova_napi_kategoria_perc│ ◀── Pie chart     │
│   │ (68 rekord)      │     │ (165 rekord)              │                    │
│   └────────┬─────────┘     └──────────────────────────┘                     │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐     ┌──────────────────────────┐                     │
│   │ ainova_napi_terv │     │ ainova_teljesitmeny      │ ◀── Telj% táblázat │
│   │ (410 rekord)     │     │ (919 rekord)             │                    │
│   └──────────────────┘     └──────────────────────────┘                     │
│                                                                             │
│   ┌──────────────────┐     ┌──────────────────────────┐                     │
│   │ ainova_termek_   │     │ ainova_sap_folyamatok    │ ◀── művelet mapping│
│   │ normak (719)     │     │ (91 rekord)              │                    │
│   └──────────────────┘     └──────────────────────────┘                     │
│                                                                             │
│   ┌──────────────────┐     ┌──────────────────────────┐                     │
│   │ ainova_letszam   │     │ ainova_operatorok        │ ◀── manuális       │
│   │ (924 rekord)     │     │ (90 rekord)              │                    │
│   └──────────────────┘     └──────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 REDUNDANCIA ELEMZÉS

### 1. ✅ NINCS átfedés - Heti és Napi terv
- `ainova_heti_terv` - Heti aggregált (het_szam + tipus_kod)
- `ainova_napi_terv` - Napi bontás (datum + tipus_kod)
- **STÁTUSZ**: OK, különböző granularitás, mindkettő szükséges

### 2. ⚠️ POTENCIÁLIS DUPLIKÁCIÓ - Orvosi adatok
- `ainova_user_orvosi` - AinovaUsers-hez kötve (user_id)
- `ainova_operator_orvosi` - ainova_operatorok-hoz kötve (torzsszam)

**PROBLÉMA**: 
- A user_id és torzsszam NINCS összekapcsolva
- AinovaUsers.torzsszam mező létezik de nincs használva
- ainova_operator_orvosi üres (0 sor)
- ainova_user_orvosi-ban 1 sor van

**JAVASLAT**: 
- Összekapcsolás: AinovaUsers.torzsszam = ainova_operatorok.torzsszam
- Vagy egy közös orvosi tábla mindkettőhöz

### 3. ⚠️ Import Status duplikáció
- `ainova_import_status` - Általános import tracking
- `ainova_napi_perces_import_status` - Specifikus napi perces

**JAVASLAT**: Egy táblába összevonható egy `import_type` mezővel

### 4. ⚠️ Üres táblák - ainova_napi_teljesules
- Van API endpoint: `/api/allokacio/napi-teljesules`
- Van SQL szkript: `ainova-folyamat-normak.sql`
- **DE**: Nincs szinkronizációs szkript!

**JAVASLAT**: 
- Írni kell sync szkriptet ami aggregálja ainova_napi_terv + leadott adatokat
- Vagy: használjuk közvetlenül ainova_napi_terv-et (már tartalmazza leadott_db-t)

### 5. ⚠️ Üres táblák - ainova_termek_sap_idok
- Részletes normaidő típuskód + SAP folyamat bontásban
- **DE**: ainova_termek_normak már tartalmazza a kategória bontást!

**JAVASLAT**: 
- Lehet felesleges - ainova_termek_normak elegendő
- Ha mégis kell: sync-termek-kategoriak.js módosítása

---

## 📋 SZINKRONIZÁCIÓS SZKRIPTEK

| Szkript | Forrás | Cél tábla(k) | Ütemezés |
|---------|--------|--------------|----------|
| `sync-allokacio-excel.js` | War Room Excel | ainova_heti_terv, ainova_napi_terv, ainova_termek_normak, ainova_operatorok | Windows Task 2h |
| `sync-heti-fix.js` | War Room Excel | ainova_heti_terv (TEKERCS bontás) | Manuális |
| `sync-perc-sap-kategoriak.js` | PEMC Excel | ainova_napi_kategoria_perc | Manuális |
| `sync-termek-kategoriak.js` | K.Z norma | ainova_termek_normak kategória oszlopok | Manuális |

---

## 🎯 JAVASOLT FEJLESZTÉSEK

### Magas prioritás

1. **ainova_napi_teljesules aktiválása**
   - Jelenleg: 0 sor, API létezik de nincs adat
   - Teendő: vagy töröljük, vagy szinkron szkriptet írunk

2. **User-Operator összekapcsolás**
   ```sql
   -- AinovaUsers.torzsszam kitöltése ahol létezik operátor
   UPDATE u SET u.torzsszam = o.torzsszam
   FROM AinovaUsers u
   JOIN ainova_operatorok o ON u.Username = o.torzsszam
   WHERE u.torzsszam IS NULL;
   ```

3. **Import status összevonás**
   - Egy tábla: `ainova_import_status`
   - Töröljük: `ainova_napi_perces_import_status`
   - Adjuk hozzá import_type oszlopot

### Közepes prioritás

4. **ainova_termek_sap_idok törlése/feltöltése**
   - Ha nem használt: `DROP TABLE ainova_termek_sap_idok`
   - Ha kell: sync szkript a K.Z norma részletes adatokból

5. **ainova_operator_belyegzok feature**
   - Jelenleg üres
   - Tervezés: Belyegző kód → operátor hozzárendelés
   - Célkitűzés: SAP visszajelentésekhez

### Alacsony prioritás

6. **Régi adatok archiválása**
   - ainova_letszam: 924 sor (2025-12 óta)
   - ainova_teljesitmeny: 919 sor (2025-12 óta)
   - Javaslat: 6+ hónapos adatok archív táblába

---

## 📊 ADATMINŐSÉG

### ✅ Jó minőség
- `ainova_termek_normak`: 719 típuskód normaidőkkel
- `ainova_operatorok`: 90 operátor aktív/inaktív státusszal
- `ainova_letszam`: Napi létszámadatok audit logokkal

### ⚠️ Figyelmeztetések
- `ainova_teljesitmeny`: Nincs validáció % tartományra
- `ainova_napi_terv`: leadott_db sok helyen 0 (nincs visszatöltve)

### ❌ Hiányzó adatok
- `ainova_napi_teljesules`: Teljesen üres
- `ainova_termek_sap_idok`: Teljesen üres
- `ainova_operator_orvosi`: Üres (de van user_orvosi)

---

## 🔗 TÁBLA KAPCSOLATOK

```
AinovaUsers (8)
    ↓ [user_id]
    ainova_user_orvosi (1)
    
ainova_operatorok (90)
    ↓ [torzsszam]
    ainova_teljesitmeny (919)
    ainova_operator_orvosi (0) - ÜRES
    ainova_operator_belyegzok (0) - ÜRES

ainova_folyamat_kategoriak (11)
    ↓ [kod]
    ainova_napi_kategoria_perc (165)
    ainova_sap_folyamatok (91)
    ainova_termek_normak [kategória oszlopok] (719)

ainova_poziciok (21)
    ↓ [nev]
    ainova_letszam (924)
    ainova_operatorok.pozicio (90)

AinovaShiftSchedule (54)
    ↓ [Year, WeekNumber]
    ainova_letszam [muszak lookup] (924)
```

---

## 📁 KAPCSOLÓDÓ FÁJLOK

### SQL Migrációk
- `scripts/db-schema.sql` - Alap séma
- `scripts/ainova-folyamat-normak.sql` - Folyamat táblák
- `scripts/operator-bovites.sql` - Operátor bővítés
- `scripts/teljesitmeny-tabla.sql` - Teljesítmény tábla

### Sync Szkriptek
- `scripts/sync-allokacio-excel.js` - Fő szinkronizáció
- `scripts/sync-heti-fix.js` - TEKERCS heti→napi
- `scripts/sync-perc-sap-kategoriak.js` - Kategória percek
- `scripts/sync-termek-kategoriak.js` - Termék kategóriák

### Check Szkriptek (debug)
- `scripts/check-*.js` - Különböző ellenőrzések
- `scripts/debug-*.js` - Debug segédprogramok

---

**Készítette**: AINOVA DB Audit Script  
**Generálva**: 2026-01-14
