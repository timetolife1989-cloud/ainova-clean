-- Operátor sync timestamp oszlop hozzáadása az ainova_import_status táblához
-- Futtatás: SSMS-ben vagy a scripts mappából

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('ainova_import_status') 
  AND name = 'last_operator_sync_at'
)
BEGIN
  ALTER TABLE ainova_import_status 
  ADD last_operator_sync_at DATETIME NULL;
  
  PRINT 'last_operator_sync_at oszlop hozzáadva';
END
ELSE
BEGIN
  PRINT 'last_operator_sync_at oszlop már létezik';
END
GO
