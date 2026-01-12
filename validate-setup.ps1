#!/usr/bin/env pwsh
# Quick validation script for offline setup

Write-Host "Validating Cramodoro Offline Setup..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Check MongoDB
Write-Host "1. Checking MongoDB..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq 'Running') {
    Write-Host "   MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "   MongoDB is not running or not installed" -ForegroundColor Red
    Write-Host "      Start with: net start MongoDB" -ForegroundColor Gray
    $allGood = $false
}

# 2. Check Node.js
Write-Host ""
Write-Host "2. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   Node.js not found" -ForegroundColor Red
    $allGood = $false
}

# 3. Check backend dependencies
Write-Host ""
Write-Host "3. Checking backend dependencies..." -ForegroundColor Yellow
if (Test-Path "backend/node_modules") {
    Write-Host "   Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   Backend dependencies missing" -ForegroundColor Yellow
    Write-Host "      Run: cd backend; npm install" -ForegroundColor Gray
}

# 4. Check frontend dependencies
Write-Host ""
Write-Host "4. Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   Frontend dependencies missing" -ForegroundColor Yellow
    Write-Host "      Run: npm install" -ForegroundColor Gray
}

# 5. Check backend .env
Write-Host ""
Write-Host "5. Checking backend configuration..." -ForegroundColor Yellow
if (Test-Path "backend/.env") {
    Write-Host "   Backend .env exists" -ForegroundColor Green
} else {
    Write-Host "   Backend .env missing" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "All checks passed! Ready to run offline." -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the app:" -ForegroundColor Cyan
    Write-Host "   .\start-offline.ps1" -ForegroundColor White
} else {
    Write-Host "Some issues found. Please fix them before starting." -ForegroundColor Yellow
}

Write-Host ""
