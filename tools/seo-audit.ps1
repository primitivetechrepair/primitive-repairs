[CmdletBinding()]
param(
  [string]$SiteRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$CheckLive
)

$ErrorActionPreference = "Stop"
$baseUrl = "https://www.primitiverepairs.com"
$issues = [System.Collections.Generic.List[string]]::new()
$verificationFile = "googlecb0379dbcfd79d87.html"
$pages = Get-ChildItem -LiteralPath $SiteRoot -Filter "*.html" |
  Where-Object { $_.Name -ne $verificationFile }

function Get-MatchValue {
  param([string]$Html, [string]$Pattern)
  return [regex]::Match($Html, $Pattern, "IgnoreCase").Groups[1].Value.Trim()
}

$records = foreach ($page in $pages) {
  $html = Get-Content -Raw -LiteralPath $page.FullName
  $title = Get-MatchValue $html "(?s)<title>(.*?)</title>"
  $description = Get-MatchValue $html '(?s)<meta(?=[^>]*name=["'']description["''])(?=[^>]*content=["'']([^"'']*)["''])[^>]*>'
  $canonical = Get-MatchValue $html '(?s)<link(?=[^>]*rel=["'']canonical["''])(?=[^>]*href=["'']([^"'']+)["''])[^>]*>'
  $robots = Get-MatchValue $html '(?s)<meta(?=[^>]*name=["'']robots["''])(?=[^>]*content=["'']([^"'']*)["''])[^>]*>'
  $h1Count = [regex]::Matches($html, "<h1\b", "IgnoreCase").Count
  $images = [regex]::Matches($html, "(?s)<img\b[^>]*>", "IgnoreCase")
  $missingAlt = @($images | Where-Object { $_.Value -notmatch "\balt\s*=" }).Count
  $jsonErrors = 0

  foreach ($script in [regex]::Matches($html, '(?s)<script\s+type=["'']application/ld\+json["'']\s*>(.*?)</script>', "IgnoreCase")) {
    try { $null = $script.Groups[1].Value | ConvertFrom-Json -ErrorAction Stop }
    catch { $jsonErrors++ }
  }

  if (-not $title) { $issues.Add("$($page.Name): missing title") }
  if ($title.Length -gt 65) { $issues.Add("$($page.Name): title is longer than 65 characters") }
  if (-not $description) { $issues.Add("$($page.Name): missing meta description") }
  if ($description.Length -gt 165) { $issues.Add("$($page.Name): description is longer than 165 characters") }
  if (-not $canonical.StartsWith("$baseUrl/")) { $issues.Add("$($page.Name): missing or off-domain canonical") }
  if ($robots -notmatch "index" -or $robots -notmatch "follow") { $issues.Add("$($page.Name): unexpected robots directive") }
  if ($h1Count -ne 1) { $issues.Add("$($page.Name): expected one H1, found $h1Count") }
  if ($missingAlt -gt 0) { $issues.Add("$($page.Name): $missingAlt image(s) missing alt attributes") }
  if ($jsonErrors -gt 0) { $issues.Add("$($page.Name): invalid JSON-LD block(s)") }

  [pscustomobject]@{
    File = $page.Name
    Title = $title
    Description = $description
    Canonical = $canonical
  }
}

foreach ($group in $records | Group-Object Title | Where-Object Count -gt 1) {
  $issues.Add("Duplicate title: $($group.Name)")
}

foreach ($group in $records | Group-Object Description | Where-Object Count -gt 1) {
  $issues.Add("Duplicate description: $($group.Name)")
}

foreach ($group in $records | Group-Object Canonical | Where-Object Count -gt 1) {
  $issues.Add("Duplicate canonical: $($group.Name)")
}

[xml]$sitemap = Get-Content -Raw -LiteralPath (Join-Path $SiteRoot "sitemap.xml")
$sitemapUrls = @($sitemap.urlset.url.loc | ForEach-Object { [string]$_ })
$canonicalUrls = @($records.Canonical)

foreach ($difference in Compare-Object $canonicalUrls $sitemapUrls) {
  $issues.Add("Sitemap/canonical mismatch: $($difference.InputObject) $($difference.SideIndicator)")
}

if ($CheckLive) {
  foreach ($url in $sitemapUrls) {
    $status = & curl.exe -L -s -o NUL -w "%{http_code}" --max-time 20 $url
    if ($status -ne "200") { $issues.Add("Live URL returned $status`: $url") }
  }
}

if ($issues.Count -gt 0) {
  $issues | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "SEO audit passed for $($records.Count) public pages and $($sitemapUrls.Count) sitemap URLs."
