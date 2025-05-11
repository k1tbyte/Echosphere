param (
    [Parameter(Mandatory=$true)]
    [string]$MigrationName
)

if (-not $MigrationName) {
    Write-Error "Migration name is required."
    exit 1
}

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


dotnet ef migrations add $MigrationName --project Backend.csproj --startup-project Backend.csproj --context Backend.Data.AppDbContext --output-dir Migrations

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration '$fullMigrationName' created successfully!"
} else {
    Write-Error "Failed to create migration. Exit code: $LASTEXITCODE"
}

$confirmation = Read-Host "Do you want to update the database? (y/n)"
if ($confirmation -eq 'y') {
    Write-Host "Updating database..."
    dotnet ef database update --project Backend\Backend.csproj --startup-project Backend\Backend.csproj --context Backend.Data.AppDbContext
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to update database. Exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "Database updated successfully."
} else {
    Write-Host "Database update skipped."
}