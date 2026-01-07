-- =====================================================
-- Mock adatok törlése az ainova_teljesitmeny táblából
-- =====================================================
-- FIGYELEM: Ez törli az összes meglévő adatot!
-- Az Excel importot ezután újra kell futtatni
-- =====================================================

-- 1. Ellenőrzés: milyen adatok vannak?
SELECT 
    'Törlés előtt' AS status,
    COUNT(*) AS rekordok,
    COUNT(DISTINCT torzsszam) AS operatorok,
    MIN(datum) AS legkorabbi,
    MAX(datum) AS legkesobbi
FROM ainova_teljesitmeny;

-- 2. Mock adatok törlése
DELETE FROM ainova_teljesitmeny;

-- 3. Ellenőrzés: sikerült?
SELECT 
    'Törlés után' AS status,
    COUNT(*) AS rekordok
FROM ainova_teljesitmeny;

PRINT 'Mock adatok törölve! Most futtasd az Excel importot a webes felületen vagy API-n keresztül.';
GO
