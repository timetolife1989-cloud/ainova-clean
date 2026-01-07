-- =====================================================
-- Diagnosztika: Teljesítmény adatok ellenőrzése
-- =====================================================

-- 1. Van-e egyáltalán adat?
SELECT 'ainova_teljesitmeny tábla' AS tabla,
       COUNT(*) AS rekordok
FROM ainova_teljesitmeny;

-- 2. Ha van, milyen dátumok és műszakok?
SELECT 
    muszak,
    COUNT(DISTINCT torzsszam) AS operatorok,
    COUNT(DISTINCT datum) AS napok,
    MIN(datum) AS legkorabbi,
    MAX(datum) AS legkesobbi,
    SUM(leadott_perc) AS ossz_perc
FROM ainova_teljesitmeny
GROUP BY muszak
ORDER BY muszak;

-- 3. Utolsó 5 rekord
SELECT TOP 5 * FROM ainova_teljesitmeny ORDER BY datum DESC;

-- 4. Van-e ainova_operatorok tábla és mi van benne?
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_operatorok')
BEGIN
    SELECT 'ainova_operatorok tábla' AS tabla,
           COUNT(*) AS rekordok,
           COUNT(CASE WHEN pozicio = 'Admin adja meg' THEN 1 END) AS nincs_pozicio
    FROM ainova_operatorok;
END
ELSE
BEGIN
    SELECT 'ainova_operatorok tábla NEM LÉTEZIK!' AS hiba;
END

-- 5. Van-e ainova_poziciok tábla?
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_poziciok')
BEGIN
    SELECT 'ainova_poziciok tábla' AS tabla, COUNT(*) AS poziciok FROM ainova_poziciok;
END
ELSE
BEGIN
    SELECT 'ainova_poziciok tábla NEM LÉTEZIK!' AS hiba;
END
GO
