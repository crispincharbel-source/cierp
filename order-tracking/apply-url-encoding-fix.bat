@echo off
REM Batch script to apply URL encoding fix for IDs with slashes
REM This script patches the backend routes and frontend navigation to handle IDs containing forward slashes

echo ============================================
echo URL Encoding Fix for Order Tracking System
echo ============================================
echo.

REM Check if we're in the correct directory
if not exist "backend\routes\tables.js" (
    echo ERROR: backend\routes\tables.js not found!
    echo Please run this script from the order-tracking-system root directory.
    pause
    exit /b 1
)

echo Step 1: Backing up files...
set timestamp=%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set backupDir=backup_%timestamp%
mkdir "%backupDir%" 2>nul

copy "backend\routes\tables.js" "%backupDir%\tables.js.bak" >nul
copy "backend\controllers\tableController.js" "%backupDir%\tableController.js.bak" >nul
copy "frontend\src\components\tables\DataTable.jsx" "%backupDir%\DataTable.jsx.bak" >nul

echo   Backup created in: %backupDir%
echo.

REM Fix 1: Update backend routes to use wildcard
echo Step 2: Updating backend routes...
powershell -Command "(Get-Content 'backend\routes\tables.js') -replace \"router\.get\('/:tableName/records/:id'\", \"router.get('/:tableName/records/*'\" -replace \"router\.put\('/:tableName/records/:id'\", \"router.put('/:tableName/records/*'\" -replace \"router\.delete\('/:tableName/records/:id'\", \"router.delete('/:tableName/records/*'\" | Set-Content 'backend\routes\tables.js'"
echo   Routes updated successfully
echo.

REM Fix 2: Update tableController - getRecord
echo Step 3: Updating table controller...
powershell -Command "$content = Get-Content 'backend\controllers\tableController.js' -Raw; $content = $content -replace 'getRecord: async \(req, res\) => \{\r?\n\s+try \{\r?\n\s+const \{ tableName, id \} = req\.params;', 'getRecord: async (req, res) => {`n    try {`n      const { tableName } = req.params;`n      const id = req.params[0];'; $content = $content -replace 'updateRecord: async \(req, res\) => \{\r?\n\s+try \{\r?\n\s+const \{ tableName, id \} = req\.params;', 'updateRecord: async (req, res) => {`n    try {`n      const { tableName } = req.params;`n      const id = req.params[0];'; $content = $content -replace 'deleteRecord: async \(req, res\) => \{\r?\n\s+try \{\r?\n\s+const \{ tableName, id \} = req\.params;', 'deleteRecord: async (req, res) => {`n    try {`n      const { tableName } = req.params;`n      const id = req.params[0];'; Set-Content 'backend\controllers\tableController.js' -Value $content -NoNewline"
echo   Controller updated successfully
echo.

REM Fix 3: Update frontend DataTable
echo Step 4: Updating frontend DataTable...
powershell -Command "(Get-Content 'frontend\src\components\tables\DataTable.jsx' -Raw) -replace 'onClick=\{\(\) =^> navigate\(`/tables/\$\{tableName\}/edit/\$\{record\[getPrimaryKeyField\(\)\]\}`\)\}', 'onClick={() =^> navigate(`/tables/${tableName}/edit/${encodeURIComponent(record[getPrimaryKeyField()])}`)}' | Set-Content 'frontend\src\components\tables\DataTable.jsx' -NoNewline"
echo   DataTable updated successfully
echo.

echo ============================================
echo Fix applied successfully!
echo ============================================
echo.
echo Changes made:
echo   1. Backend routes now use wildcard (*) for record IDs
echo   2. Controllers extract ID from req.params[0]
echo   3. Frontend encodes IDs using encodeURIComponent()
echo.
echo Next steps:
echo   1. Review the changes in the modified files
echo   2. Rebuild and restart your Docker containers:
echo      docker-compose down
echo      docker-compose up --build -d
echo.
echo Backup location: %backupDir%
echo.
echo To restore from backup if needed:
echo   copy %backupDir%\*.bak to their original locations
echo.
pause