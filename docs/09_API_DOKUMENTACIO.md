# API Endpoint Dokumentáció

## 📡 API Összefoglaló

**Base URL:** `/api`  
**Formátum:** JSON  
**Autentikáció:** Session Cookie (HTTP-only)  

---

## 1. Autentikáció API

### POST /api/auth/login
**Leírás:** Felhasználó bejelentkeztetése  
**Értékelés:** ⭐⭐⭐⭐⭐ (5/5)

**Request Body:**
```json
{
  "username": "string (max 100 karakter)",
  "password": "string (max 500 karakter)"
}
```

**Response (200 - Sikeres):**
```json
{
  "success": true,
  "user": {
    "userId": 1,
    "username": "kovacs.janos",
    "fullName": "Kovács János",
    "role": "Műszakvezető"
  }
}
```

**Response (401 - Hibás adatok):**
```json
{
  "success": false,
  "error": "Hibás felhasználónév vagy jelszó"
}
```

**Response (429 - Rate limit):**
```json
{
  "success": false,
  "error": "Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva."
}
```

**Cookie beállítás:**
```
Set-Cookie: sessionId=<UUID>; HttpOnly; Secure; Path=/; Max-Age=86400
```

---

### POST /api/auth/logout
**Leírás:** Kijelentkezés  
**Értékelés:** ⭐⭐⭐⭐⭐ (5/5)

**Request:** Cookie-ból olvassa a sessionId-t

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/validate-session
**Leírás:** Session validálás (middleware használja)  
**Értékelés:** ⭐⭐⭐⭐⭐ (5/5)

**Request Body:**
```json
{
  "sessionId": "UUID string"
}
```

**Response (200 - Érvényes):**
```json
{
  "valid": true,
  "userId": 1,
  "username": "kovacs.janos",
  "fullName": "Kovács János",
  "role": "Műszakvezető"
}
```

**Response (401 - Lejárt/érvénytelen):**
```json
{
  "valid": false,
  "error": "Invalid or expired session"
}
```

---

### POST /api/auth/change-password
**Leírás:** Jelszó módosítás  
**Értékelés:** ⭐⭐⭐⭐⭐ (5/5)

**Headers:** `x-user-id`, `x-username` (middleware által beállítva)

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string (min 8 karakter, nagy+kis betű + szám + speciális)",
  "confirmPassword": "string"
}
```

**Response (200 - Sikeres):**
```json
{
  "success": true,
  "message": "Jelszó sikeresen módosítva"
}
```

**Response (400 - Validációs hiba):**
```json
{
  "success": false,
  "error": "Az új jelszónak tartalmaznia kell legalább egy nagybetűt"
}
```

---

## 2. Admin API

### GET /api/admin/users
**Leírás:** Felhasználók listázása (paginált)  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Query Parameters:**
| Paraméter | Típus | Alapértelmezett | Leírás |
|-----------|-------|-----------------|--------|
| page | number | 1 | Oldalszám |
| pageSize | number | 20 | Elemek/oldal |
| search | string | "" | Keresés (username vagy név) |
| role | string | "" | Szűrés pozícióra |
| shift | string | "" | Szűrés műszakra |
| isActive | boolean | "" | Szűrés státuszra |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "kovacs.janos",
      "fullName": "Kovács János",
      "role": "Műszakvezető",
      "shift": "A",
      "email": "kovacs@tdk.com",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

---

### POST /api/admin/users
**Leírás:** Új felhasználó létrehozása  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Request Body:**
```json
{
  "username": "string (min 3 karakter)",
  "name": "string",
  "password": "string (min 8 karakter)",
  "role": "Admin|Manager|Műszakvezető|Operátor",
  "shift": "A|B|C|null",
  "email": "string (opcionális)"
}
```

**Response (201 - Létrehozva):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "username": "uj.felhasznalo"
  },
  "message": "Felhasználó sikeresen létrehozva"
}
```

**Response (409 - Már létezik):**
```json
{
  "success": false,
  "error": "Ez a felhasználónév már foglalt"
}
```

---

### GET /api/admin/users/[id]
**Leírás:** Egy felhasználó adatai  
**Értékelés:** ⭐⭐⭐⭐⭐ (5/5)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "kovacs.janos",
    "fullName": "Kovács János",
    "role": "Műszakvezető",
    "shift": "A",
    "email": "kovacs@tdk.com",
    "telefon": "+36201234567",
    "jogsi_gyalog_targonca": true,
    "jogsi_forgo_daru": false,
    "jogsi_futo_daru": false,
    "jogsi_newton_emelo": true,
    "orvosi_lejarat": "2026-06-30",
    "isActive": true,
    "firstLogin": false,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-06-15T12:30:00.000Z"
  }
}
```

---

### PATCH /api/admin/users/[id]
**Leírás:** Felhasználó módosítása  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Request Body (csak a módosítandó mezők):**
```json
{
  "name": "Kovács János Béla",
  "role": "Manager",
  "shift": "B",
  "jogsi_forgo_daru": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Felhasználó sikeresen módosítva"
}
```

---

### DELETE /api/admin/users/[id]
**Leírás:** Felhasználó törlése (soft delete - IsActive=false)  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Response (200):**
```json
{
  "success": true,
  "message": "Felhasználó deaktiválva"
}
```

---

### POST /api/admin/users/[id]/reset-password
**Leírás:** Jelszó visszaállítás adminként  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Request Body:**
```json
{
  "newPassword": "string (min 8 karakter)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Jelszó sikeresen visszaállítva"
}
```

---

## 3. Létszám API

### GET /api/letszam
**Leírás:** Létszám adatok lekérése  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Query Parameters:**
| Paraméter | Típus | Kötelező | Leírás |
|-----------|-------|----------|--------|
| datum | string (YYYY-MM-DD) | ✅ | Dátum |
| muszak | string (A/B/C) | ✅ | Műszak |

**Response (200 - Van adat):**
```json
{
  "success": true,
  "isEmpty": false,
  "data": [
    {
      "id": 1,
      "datum": "2026-01-10",
      "muszak": "A",
      "pozicio": "Huzalos tekercselő",
      "pozicio_tipus": "operativ",
      "is_kritikus": false,
      "megjelent": 8,
      "tappenz": 1,
      "szabadsag": 0,
      "brutto_letszam": 9,
      "netto_letszam": 8,
      "hianyzas_fo": 1,
      "hianyzas_percent": 11.11,
      "rogzitette_user": "kovacs.janos",
      "rogzitette_datum": "2026-01-10T06:15:00.000Z",
      "rogzitette_fullname": "Kovács János"
    }
  ]
}
```

**Response (200 - Nincs adat):**
```json
{
  "success": true,
  "isEmpty": true,
  "data": [],
  "message": "No data found for this date/shift"
}
```

---

### POST /api/letszam
**Leírás:** Létszám adatok rögzítése  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Request Body:**
```json
{
  "datum": "2026-01-10",
  "muszak": "A",
  "operativ": [
    {
      "pozicio": "Huzalos tekercselő",
      "megjelent": 8,
      "tappenz": 1,
      "szabadsag": 0
    }
  ],
  "nemOperativ": [
    {
      "pozicio": "Műszakvezető",
      "megjelent": 1,
      "tappenz": 0,
      "szabadsag": 0
    }
  ],
  "indoklasok": {},
  "riportKoteles": {
    "indoklas": "Utólagos javítás",
    "isOverwrite": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Létszám adatok sikeresen mentve"
}
```

---

## 4. Teljesítmény API

### GET /api/teljesitmeny
**Leírás:** Teljesítmény adatok lekérése  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Query Parameters:**
| Paraméter | Típus | Alapértelmezett | Leírás |
|-----------|-------|-----------------|--------|
| type | string | napi-kimutatas | napi/heti/havi-kimutatas, egyeni-ranglista, egyeni-trend |
| muszak | string | SUM | A/B/C/SUM |
| offset | number | 0 | Paginálás |
| torzsszam | string | - | Egyéni trend-hez |

**Response (200 - Napi kimutatás):**
```json
{
  "success": true,
  "data": [
    {
      "datum": "2026-01-09",
      "datum_label": "01.09",
      "nap_nev": "Thursday",
      "muszak": "SUM",
      "letszam": 45,
      "cel_perc": 21600,
      "leadott_perc": 23450,
      "szazalek": 108.56
    }
  ],
  "pagination": {
    "totalDays": 250,
    "offset": 0,
    "periodStart": "2025-12-21",
    "periodEnd": "2026-01-09"
  },
  "importStatus": {
    "last_import_at": "2026-01-10T06:00:00.000Z",
    "records_imported": 15420
  }
}
```

---

### GET /api/teljesitmeny/check
**Leírás:** Import szükségességének ellenőrzése  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Response (200):**
```json
{
  "needsImport": true,
  "canStartImport": true,
  "lastImportAt": "2026-01-09T06:00:00.000Z"
}
```

---

### POST /api/teljesitmeny/import
**Leírás:** Excel import indítása  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Response (200):**
```json
{
  "success": true,
  "message": "Import successfully completed",
  "recordsImported": 450
}
```

---

## 5. Napi Perces API

### GET /api/napi-perces
**Leírás:** Napi perces adatok (lehívás vs leadás)  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Query Parameters:**
| Paraméter | Típus | Leírás |
|-----------|-------|--------|
| napok | number | Utolsó X nap (alapértelmezett: 30) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "datum": "2026-01-09",
      "cel_perc": 25000,
      "lehivott_ossz": 24500,
      "leadott_ossz": 23800,
      "leadott_siemens_dc": 15000,
      "leadott_no_siemens": 6000,
      "leadott_kaco": 2800
    }
  ]
}
```

---

## 6. Operátorok API

### GET /api/operatorok
**Leírás:** Operátorok listázása  
**Értékelés:** ⭐⭐⭐⭐ (4/5)

**Query Parameters:**
| Paraméter | Típus | Leírás |
|-----------|-------|--------|
| muszak | string | A/B/C |
| pozicio | string | Szűrés pozícióra |
| search | string | Keresés (név, törzsszám) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "torzsszam": "12345",
      "nev": "Nagy Péter",
      "muszak": "A",
      "pozicio": "LaC szerelő",
      "jogsi_gyalog_targonca": true,
      "legkozelebb_lejaro": "2026-03-15",
      "orvosi_count": 2,
      "isActive": true
    }
  ]
}
```

---

### GET /api/operatorok/[id]/orvosi
**Leírás:** Operátor orvosi vizsgálatai  
**Értékelés:** ⭐⭐⭐⭐⭐ (5/5)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pozicio": "LaC szerelő",
      "kezdete": "2025-03-15",
      "lejarat": "2026-03-15",
      "megjegyzes": "Éves vizsgálat"
    }
  ]
}
```

---

## 7. Export API

### GET /api/export
**Leírás:** Adatok exportálása Excel-be  
**Értékelés:** ⭐⭐⭐ (3/5)

**Query Parameters:**
| Paraméter | Típus | Leírás |
|-----------|-------|--------|
| type | string | teljesitmeny/letszam/operatorok |
| from | string | Kezdő dátum |
| to | string | Vég dátum |

**Response:** Excel fájl (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

---

## 8. Hibakódok Összefoglaló

| HTTP Kód | Jelentés | Mikor |
|----------|----------|-------|
| 200 | OK | Sikeres kérés |
| 201 | Created | Erőforrás létrehozva |
| 400 | Bad Request | Érvénytelen bemenet |
| 401 | Unauthorized | Nincs bejelentkezve |
| 403 | Forbidden | Nincs jogosultság |
| 404 | Not Found | Erőforrás nem található |
| 409 | Conflict | Duplikált erőforrás |
| 429 | Too Many Requests | Rate limit túllépve |
| 500 | Internal Server Error | Szerver hiba |
| 503 | Service Unavailable | Szolgáltatás nem elérhető |

---

## 9. API Értékelés Összefoglaló

| Endpoint | Értékelés | Megjegyzés |
|----------|-----------|------------|
| /api/auth/* | ⭐⭐⭐⭐⭐ | Kiváló |
| /api/admin/users/* | ⭐⭐⭐⭐ | RBAC hiányzik |
| /api/letszam | ⭐⭐⭐⭐ | Jó |
| /api/teljesitmeny | ⭐⭐⭐⭐ | Cache hiányzik |
| /api/napi-perces | ⭐⭐⭐⭐ | Jó |
| /api/operatorok/* | ⭐⭐⭐⭐⭐ | Kiváló |
| /api/export | ⭐⭐⭐ | Bővítendő |

