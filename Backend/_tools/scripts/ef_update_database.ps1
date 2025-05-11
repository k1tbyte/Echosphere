$efInstalled = $null
try {
    $efInstalled = dotnet tool list --global | Select-String -Pattern "dotnet-ef"
} catch {
    $efInstalled = $null
}

if (-not $efInstalled) {
    Write-Host "Installing EF Core tools..."
    dotnet tool install --ignore-failed-sources --add-source https://api.nuget.org/v3/index.json --global dotnet-ef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error installing EF Core tools. Exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "EF Core tools installed successfully."
} else {
    Write-Host "EF Core tools already installed."
}

dotnet ef database update --project Backend.csproj --startup-project Backend.csproj --context Backend.Data.AppDbContext
    
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to update database. Exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}