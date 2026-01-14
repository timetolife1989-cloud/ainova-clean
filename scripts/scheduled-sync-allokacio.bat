@echo off
REM =====================================================
REM AINOVA - Allokáció Excel Szinkronizálás
REM 2 óránként futtatva Windows Task Scheduler-ből
REM =====================================================

cd /d "c:\Users\EE0853\OneDrive - tdkgroup\Asztal\ainova-clean-2026-01-11"

echo [%date% %time%] Allokáció szinkronizálás indítása...
node scripts\sync-allokacio-excel.js >> logs\allokacio-sync.log 2>&1
echo [%date% %time%] Szinkronizálás befejezve.
