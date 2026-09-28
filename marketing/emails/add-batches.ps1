# Adds a BATCH column (1, 2, 3, ...) to a contacts CSV so you can send 300 emails a day in Brevo.
#
# Usage (PowerShell, in the folder with your CSV):
#   .\add-batches.ps1 -In contacts.csv -Out contacts-batched.csv -Size 300
#
# Input CSV must have an EMAIL column (FIRSTNAME optional). Put your most recently
# active people at the top: they go in the first batches, which helps deliverability.
param(
  [Parameter(Mandatory = $true)][string]$In,
  [string]$Out = "contacts-batched.csv",
  [int]$Size = 300
)

$rows = Import-Csv -Path $In
$seen = @{}
$i = 0
$result = foreach ($r in $rows) {
  $email = ("" + $r.EMAIL).Trim().ToLower()
  # Skip blanks, obviously broken addresses and duplicates
  if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$' -or $seen.ContainsKey($email)) { continue }
  $seen[$email] = $true
  $first = ("" + $r.FIRSTNAME).Trim()
  if ($first) { $first = ($first -split '\s+')[0] }
  [pscustomobject]@{
    EMAIL     = $email
    FIRSTNAME = $first
    BATCH     = [math]::Floor($i / $Size) + 1
  }
  $i++
}

$result | Export-Csv -Path $Out -NoTypeInformation -Encoding UTF8
$batches = [math]::Ceiling($i / $Size)
Write-Host "Saved $i contacts in $batches batches of $Size to $Out"
