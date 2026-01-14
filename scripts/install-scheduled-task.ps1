# =====================================================
# AINOVA - Allokáció Scheduled Task Telepítése
# Futtatás: PowerShell Adminisztrátorként
# =====================================================

$TaskName = "AINOVA_Allokacio_Sync"
$Description = "AINOVA - Allokáció Excel szinkronizálás 2 óránként"
$ScriptPath = "c:\Users\EE0853\OneDrive - tdkgroup\Asztal\ainova-clean-2026-01-11\scripts\scheduled-sync-allokacio.bat"

# Ellenőrizd, hogy létezik-e már
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task már létezik, törlés..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Trigger: 2 óránként, reggel 6-tól este 20-ig (munkaidőben)
$Triggers = @()
# Hétköznapokon, 2 óránként: 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00
foreach ($hour in @(6, 8, 10, 12, 14, 16, 18)) {
    $Trigger = New-ScheduledTaskTrigger -Daily -At ([DateTime]::Today.AddHours($hour))
    $Triggers += $Trigger
}

# Action
$Action = New-ScheduledTaskAction -Execute $ScriptPath -WorkingDirectory (Split-Path $ScriptPath)

# Settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Task létrehozása
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $TaskName -Description $Description -Action $Action -Trigger $Triggers[0] -Settings $Settings -Principal $Principal
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Task sikeresen létrehozva!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task név: $TaskName"
    Write-Host "Script: $ScriptPath"
    Write-Host "Időzítés: 2 óránként (06:00-18:00)"
    Write-Host ""
    Write-Host "Manuális futtatás: schtasks /run /tn `"$TaskName`""
    Write-Host ""
    
} catch {
    Write-Host "HIBA: $($_.Exception.Message)" -ForegroundColor Red
}

# Egyszerűbb verzió: schtasks paranccsal
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Alternatív: schtasks parancs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "schtasks /create /tn `"AINOVA_Allokacio_Sync`" /tr `"$ScriptPath`" /sc hourly /mo 2 /st 06:00 /et 20:00 /f"
Write-Host ""
