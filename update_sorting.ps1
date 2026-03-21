$ErrorActionPreference = "Stop"

$files = Get-ChildItem -Path . -Filter "*.html" | Where-Object { $_.Name -match "^visual_.*\.html$" -or $_.Name -eq "index.html" }

foreach ($file in $files) {
    # Read entire file as string
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # Normalize line endings for the search string just in case
    # Instead of string replacement, we use regex to ignore variable whitespace/newlines between the rules
    
    $pattern = '(?s)th\.sorted-asc::after \{ content: '' ▲''; color: #38bdf8; font-size: 10px; margin-left: 5px; \}\s*th\.sorted-desc::after \{ content: '' ▼''; color: #fbbf24; font-size: 10px; margin-left: 5px; \}\s*th\.sorted-asc, th\.sorted-desc \{ background: var\(--bg-th\); color: white; \}'
    
    $replacement = "th.sorted-asc::after { content: ''; }`n        th.sorted-desc::after { content: ''; }`n`n        th.sorted-asc { background: #0ea5e9 !important; color: white !important; }`n        th.sorted-desc { background: #f97316 !important; color: white !important; }"
    
    if ($content -match $pattern) {
        $newContent = $content -replace $pattern, $replacement
        # Write back preserving existing encoding (UTF-8 no BOM)
        [System.IO.File]::WriteAllText($file.FullName, $newContent, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "Updated: $($file.Name)"
    } else {
        Write-Host "Pattern NOT FOUND in: $($file.Name)"
    }
}
