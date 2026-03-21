$files = Get-ChildItem -Filter *.html
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    $changed = $false
    
    if ($c -notmatch 'system-version\.js') {
        $c = $c -replace '(?i)(<head>)', "`$1`r`n    <script src=`"system-version.js`"></script>"
        $changed = $true
    }
    
    if ($c.Contains('sysLog("System Ready.");')) {
        $c = $c.Replace('sysLog("System Ready.");', 'sysLog("System Ready " + (typeof NEOGLEAMZ_VERSION !== ''undefined'' ? NEOGLEAMZ_VERSION : "") + ".");')
        $changed = $true
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
    }
}
