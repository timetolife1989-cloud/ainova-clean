-- ═══════════════════════════════════════════════════════
-- AINOVA LÉTSZÁM ADATOK - FŐ TÁBLA
-- ═══════════════════════════════════════════════════════

CREATE TABLE ainova_letszam (
    -- Primary Key
    id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Időpont és műszak azonosítók
    datum DATE NOT NULL,
    muszak CHAR(1) NOT NULL CHECK (muszak IN ('A', 'B', 'C')),
    
    -- Pozíció információk
    pozicio NVARCHAR(50) NOT NULL,
    pozicio_tipus NVARCHAR(20) NOT NULL CHECK (pozicio_tipus IN ('operativ', 'nem_operativ')),
    is_kritikus BIT NOT NULL DEFAULT 0,
    
    -- Létszám adatok (input mezők)
    megjelent INT NOT NULL DEFAULT 0 CHECK (megjelent >= 0),
    tappenz INT NOT NULL DEFAULT 0 CHECK (tappenz >= 0),
    szabadsag INT NOT NULL DEFAULT 0 CHECK (szabadsag >= 0),
    
    -- Számított mezők (SQL computed columns)
    brutto_letszam AS (megjelent + tappenz + szabadsag) PERSISTED,
    netto_letszam AS (megjelent) PERSISTED,
    hianyzas_fo AS (tappenz + szabadsag) PERSISTED,
    hianyzas_percent AS (
        CASE 
            WHEN (megjelent + tappenz + szabadsag) > 0 
            THEN CAST((tappenz + szabadsag) * 100.0 / (megjelent + tappenz + szabadsag) AS DECIMAL(5,2))
            ELSE 0
        END
    ) PERSISTED,
    
    -- Leadási cél (backend tölti ki)
    leadasi_cel_perc INT NULL,
    
    -- Kritikus pozíció indoklás
    indoklas_miert NVARCHAR(500) NULL,
    indoklas_meddig NVARCHAR(200) NULL,
    indoklas_terv NVARCHAR(500) NULL,
    
    -- Audit fields
    rogzitette_user NVARCHAR(50) NOT NULL,
    rogzitette_datum DATETIME NOT NULL DEFAULT GETDATE(),
    modositotta_user NVARCHAR(50) NULL,
    modositotta_datum DATETIME NULL,
    
    -- Unique constraint
    CONSTRAINT UQ_ainova_letszam_datum_muszak_pozicio 
        UNIQUE (datum, muszak, pozicio)
);

-- Indexek
CREATE NONCLUSTERED INDEX IX_ainova_letszam_datum_muszak 
    ON ainova_letszam (datum, muszak);

CREATE NONCLUSTERED INDEX IX_ainova_letszam_rogzitette 
    ON ainova_letszam (rogzitette_user, rogzitette_datum);

-- ═══════════════════════════════════════════════════════
-- AUDIT LOG TÁBLA
-- ═══════════════════════════════════════════════════════

CREATE TABLE ainova_letszam_audit_log (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    action_type NVARCHAR(10) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    datum DATE NOT NULL,
    muszak CHAR(1) NOT NULL,
    pozicio NVARCHAR(50) NOT NULL,
    
    -- Előző és új értékek
    old_megjelent INT NULL,
    old_tappenz INT NULL,
    old_szabadsag INT NULL,
    new_megjelent INT NULL,
    new_tappenz INT NULL,
    new_szabadsag INT NULL,
    
    -- Audit info
    action_user NVARCHAR(50) NOT NULL,
    action_datum DATETIME NOT NULL DEFAULT GETDATE(),
    action_ip NVARCHAR(45) NULL,
    
    -- Teljes JSON snapshot
    full_data_json NVARCHAR(MAX) NULL
);

CREATE NONCLUSTERED INDEX IX_letszam_audit_datum 
    ON ainova_letszam_audit_log (datum, muszak, action_datum DESC);

-- ═══════════════════════════════════════════════════════
-- ÖSSZEGZÉS VIEW
-- ═══════════════════════════════════════════════════════

CREATE VIEW v_ainova_letszam_osszegzes AS
SELECT 
    datum,
    muszak,
    pozicio_tipus,
    COUNT(*) AS poziciok_szama,
    SUM(megjelent) AS osszesen_megjelent,
    SUM(tappenz) AS osszesen_tappenz,
    SUM(szabadsag) AS osszesen_szabadsag,
    SUM(brutto_letszam) AS brutto_osszesen,
    CASE 
        WHEN SUM(brutto_letszam) > 0
        THEN CAST(SUM(hianyzas_fo) * 100.0 / SUM(brutto_letszam) AS DECIMAL(5,2))
        ELSE 0
    END AS hianyzas_percent_atlag,
    CASE 
        WHEN pozicio_tipus = 'operativ' 
        THEN SUM(megjelent) * 480 
        ELSE NULL 
    END AS leadasi_cel_perc,
    MAX(rogzitette_datum) AS utolso_rogzites
FROM ainova_letszam
GROUP BY datum, muszak, pozicio_tipus;
