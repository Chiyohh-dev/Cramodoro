#!/usr/bin/env pwsh
# Cramodoro Offline Startup Script
# This script starts all required services for offline operation

Write-Host "🚀 Starting Cramodoro in Offline Mode..." -ForegroundColor Cyan
Write-Host ""

# Check MongoDB
Write-Host "📊 Checking MongoDB..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue

if ($mongoService) {
    if ($mongoService.Status -ne 'Running') {
        Write-Host "   Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service MongoDB
        Start-Sleep -Seconds 2
    }
    Write-Host "   ✅ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MongoDB service not found. Attempting manual start..." -ForegroundColor Yellow
    Write-Host "   Please ensure MongoDB is installed or start it manually with:" -ForegroundColor Yellow
    Write-Host "   mongod --dbpath=C:\data\db" -ForegroundColor Gray
    Write-Host ""
}

# Start Backend
Write-Host ""
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal
Write-Host "   ✅ Backend starting on http://localhost:5000" -ForegroundColor Green

# Wait for backend to initialize
Write-Host "   ⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend health
try {
    $health = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Backend health check failed. It may still be starting..." -ForegroundColor Yellow
}

# Start Expo
Write-Host ""
Write-Host "📱 Starting Expo (LAN mode)..." -ForegroundColor Yellow
Write-Host "   Press 'a' to open in Android emulator" -ForegroundColor Cyan
Write-Host "   Press 'r' to reload app" -ForegroundColor Cyan
Write-Host "   Press 'q' to quit" -ForegroundColor Cyan
Write-Host ""

npm run start:lan
