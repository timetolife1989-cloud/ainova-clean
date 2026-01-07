-- =====================================================
-- AINOVA - Dummy teljesítmény adatok generálása
-- =====================================================
-- Cél: 3 műszak (A, B, C), 60 nap, 20-30 operátor műszakonként
-- =====================================================

-- Töröljük a régi adatokat (opcionális - kommenteld ki ha nem kell)
-- DELETE FROM ainova_teljesitmeny;

-- Generáljunk 60 napnyi adatot visszamenőleg
DECLARE @StartDate DATE = DATEADD(DAY, -60, CAST(GETDATE() AS DATE));
DECLARE @EndDate DATE = CAST(GETDATE() AS DATE);
DECLARE @CurrentDate DATE = @StartDate;

-- Operátor nevek (30 fiktív név műszakonként)
DECLARE @OperatorsA TABLE (id INT IDENTITY, torzsszam VARCHAR(20), nev NVARCHAR(100));
DECLARE @OperatorsB TABLE (id INT IDENTITY, torzsszam VARCHAR(20), nev NVARCHAR(100));
DECLARE @OperatorsC TABLE (id INT IDENTITY, torzsszam VARCHAR(20), nev NVARCHAR(100));

-- A műszak operátorok
INSERT INTO @OperatorsA VALUES 
('30010001', 'Kovács Péter'),('30010002', 'Nagy László'),('30010003', 'Szabó János'),
('30010004', 'Tóth Gábor'),('30010005', 'Horváth István'),('30010006', 'Varga Zoltán'),
('30010007', 'Kiss Béla'),('30010008', 'Molnár Ferenc'),('30010009', 'Németh András'),
('30010010', 'Farkas Tamás'),('30010011', 'Balogh Attila'),('30010012', 'Papp Károly'),
('30010013', 'Lakatos Imre'),('30010014', 'Oláh Sándor'),('30010015', 'Fekete Mihály'),
('30010016', 'Simon Géza'),('30010017', 'Szűcs Róbert'),('30010018', 'Takács József'),
('30010019', 'Hegedűs Márton'),('30010020', 'Juhász Ádám'),('30010021', 'Vincze Dániel'),
('30010022', 'Budai Csaba'),('30010023', 'Bodnár Erik'),('30010024', 'Kerekes Máté'),
('30010025', 'Sárközi Balázs');

-- B műszak operátorok
INSERT INTO @OperatorsB VALUES 
('30020001', 'Garcia Miguel'),('30020002', 'Santos Maria'),('30020003', 'Rodriguez Juan'),
('30020004', 'Martinez Carlos'),('30020005', 'Lopez Ana'),('30020006', 'Hernandez Jose'),
('30020007', 'Gonzalez Pedro'),('30020008', 'Perez Rosa'),('30020009', 'Sanchez Luis'),
('30020010', 'Ramirez Elena'),('30020011', 'Torres Diego'),('30020012', 'Flores Carmen'),
('30020013', 'Rivera Pablo'),('30020014', 'Gomez Sofia'),('30020015', 'Diaz Marco'),
('30020016', 'Cruz Isabella'),('30020017', 'Morales David'),('30020018', 'Ortiz Laura'),
('30020019', 'Gutierrez Oscar'),('30020020', 'Chavez Julia'),('30020021', 'Reyes Manuel'),
('30020022', 'Ruiz Andrea'),('30020023', 'Mendoza Fernando'),('30020024', 'Castillo Lucia'),
('30020025', 'Vargas Ricardo');

-- C műszak operátorok  
INSERT INTO @OperatorsC VALUES 
('30030001', 'Fehér Lajos'),('30030002', 'Szalai Viktor'),('30030003', 'Boros Norbert'),
('30030004', 'Major Krisztián'),('30030005', 'Pintér Levente'),('30030006', 'Katona Olivér'),
('30030007', 'Király Bence'),('30030008', 'Mészáros Dominik'),('30030009', 'Fábián Kornél'),
('30030010', 'Lengyel Patrik'),('30030011', 'Gál Zsolt'),('30030012', 'Orbán Richárd'),
('30030013', 'Halász Marcell'),('30030014', 'Illés Bendegúz'),('30030015', 'Kozma Hunor'),
('30030016', 'Kelemen Nándor'),('30030017', 'Bogdán Szabolcs'),('30030018', 'Barta Kristóf'),
('30030019', 'Somogyi Ákos'),('30030020', 'Csonka Vince'),('30030021', 'Hajdu Zalán'),
('30030022', 'Antal Botond'),('30030023', 'Székely Roland'),('30030024', 'Lukács Milán'),
('30030025', 'Pálfi Gergő');

-- Naponként végigmegyünk
WHILE @CurrentDate <= @EndDate
BEGIN
    -- Hétvégéket kihagyjuk (szombat=7, vasárnap=1)
    IF DATEPART(WEEKDAY, @CurrentDate) NOT IN (1, 7)
    BEGIN
        -- A műszak: 18-25 ember dolgozik naponta (véletlenszerűen)
        DECLARE @ACount INT = 18 + ABS(CHECKSUM(NEWID())) % 8;
        INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
        SELECT TOP (@ACount)
            @CurrentDate,
            'A',
            torzsszam,
            nev,
            -- Perc: 350-580 közötti random érték (van aki gyengébb, van aki túlteljesít)
            350 + ABS(CHECKSUM(NEWID())) % 230
        FROM @OperatorsA
        ORDER BY NEWID();

        -- B műszak: 20-28 ember
        DECLARE @BCount INT = 20 + ABS(CHECKSUM(NEWID())) % 9;
        INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
        SELECT TOP (@BCount)
            @CurrentDate,
            'B',
            torzsszam,
            nev,
            380 + ABS(CHECKSUM(NEWID())) % 200
        FROM @OperatorsB
        ORDER BY NEWID();

        -- C műszak: 15-22 ember
        DECLARE @CCount INT = 15 + ABS(CHECKSUM(NEWID())) % 8;
        INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
        SELECT TOP (@CCount)
            @CurrentDate,
            'C',
            torzsszam,
            nev,
            400 + ABS(CHECKSUM(NEWID())) % 180
        FROM @OperatorsC
        ORDER BY NEWID();
    END

    SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
END

-- Ellenőrzés
SELECT 
    muszak,
    COUNT(*) as rekordok,
    COUNT(DISTINCT datum) as napok,
    COUNT(DISTINCT torzsszam) as operatorok,
    AVG(leadott_perc) as atlag_perc,
    AVG(szazalek) as atlag_szazalek
FROM ainova_teljesitmeny
GROUP BY muszak
ORDER BY muszak;

SELECT 'Összesen:', COUNT(*) FROM ainova_teljesitmeny;
