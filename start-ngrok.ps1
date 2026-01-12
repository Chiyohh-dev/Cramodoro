# Start ngrok and auto-update API config with the tunnel URL

Write-Host "Starting ngrok tunnel..." -ForegroundColor Cyan

# Start ngrok in background
$ngrokProcess = Start-Process -FilePath "C:\Tools\ngrok\ngrok.exe" -ArgumentList "http", "5000" -PassThru -WindowStyle Normal

# Wait for ngrok to start
Start-Sleep -Seconds 3

# Get tunnel URL from ngrok API
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -Method Get -ErrorAction Stop
    $httpsUrl = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
    
    if ($httpsUrl) {
        $apiUrl = "$httpsUrl/api"
        Write-Host "Ngrok tunnel active: $apiUrl" -ForegroundColor Green
        
        # Update api.js
        $apiFile = "api\api.js"
        $content = Get-Content $apiFile -Raw
        
        # Replace the BACKEND_TUNNEL_URL value
        $pattern = "(const BACKEND_TUNNEL_URL = ')[^']+(')"
        $replacement = "`${1}$apiUrl`${2}"
        $newContent = $content -replace $pattern, $replacement
        
        Set-Content -Path $apiFile -Value $newContent -NoNewline
        
        Write-Host "Updated $apiFile with new tunnel URL" -ForegroundColor Green
        Write-Host ""
        Write-Host "Backend tunnel: $apiUrl" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop ngrok" -ForegroundColor Gray
        
        # Keep script running - monitor ngrok process
        try {
            while ($true) {
                Start-Sleep -Seconds 5
                $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction SilentlyContinue
                if (-not $tunnels) {
                    Write-Host "Ngrok stopped" -ForegroundColor Red
                    break
                }
            }
        } catch {
            Write-Host "Ngrok monitoring stopped" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Failed to get ngrok URL. Check if ngrok started correctly." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure ngrok is running and accessible at http://127.0.0.1:4040" -ForegroundColor Yellow
    exit 1
}
