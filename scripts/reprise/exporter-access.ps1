# Exporte les tables utiles d'une base Access (.mdb / .accdb) en CSV, pour `npm run reprise`.
# Usage : pwsh scripts/reprise/exporter-access.ps1 -Base "docs/LOYERS/LOYERS.mdb" -Sortie "reprise-csv"
# Nécessite le pilote « Microsoft Access Driver (*.mdb, *.accdb) » 64 bits (installé avec Office).
# La base est copiée avant lecture : l'original n'est jamais ouvert ni modifié.
param(
  [Parameter(Mandatory)] [string] $Base,
  [Parameter(Mandatory)] [string] $Sortie
)
$ErrorActionPreference = 'Stop'

$tables = 'IMMEUBLE', 'APPARTEMENT', 'LOCATAIRE', 'CONTRAT', 'LOYERS'
New-Item -ItemType Directory -Force $Sortie | Out-Null
$copie = Join-Path ([IO.Path]::GetTempPath()) ("reprise-" + [guid]::NewGuid() + [IO.Path]::GetExtension($Base))
Copy-Item -LiteralPath $Base $copie

$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$copie;ReadOnly=1;")
try {
  $cn.Open()
  foreach ($t in $tables) {
    $a = New-Object System.Data.Odbc.OdbcDataAdapter("SELECT * FROM [$t]", $cn)
    $d = New-Object System.Data.DataTable
    [void] $a.Fill($d)
    # Dates en AAAA-MM-JJ, booléens en true/false : indépendants des réglages régionaux de Windows
    $lignes = foreach ($r in $d.Rows) {
      $o = [ordered] @{}
      foreach ($c in $d.Columns) {
        $v = $r[$c]
        $o[$c.ColumnName] = if ($v -is [DBNull]) { '' }
          elseif ($v -is [datetime]) { $v.ToString('yyyy-MM-dd') }
          elseif ($v -is [bool]) { if ($v) { 'true' } else { 'false' } }
          else { "$v" }
      }
      [pscustomobject] $o
    }
    $fichier = Join-Path $Sortie "$t.csv"
    if ($lignes) { $lignes | Export-Csv $fichier -NoTypeInformation -Encoding utf8 -Delimiter ';' }
    else { ($d.Columns | ForEach-Object { '"' + $_.ColumnName + '"' }) -join ';' | Set-Content $fichier -Encoding utf8 }
    Write-Host ("{0,-12} {1,5} lignes -> {2}" -f $t, $d.Rows.Count, $fichier)
  }
} finally {
  $cn.Close()
  Remove-Item $copie -ErrorAction SilentlyContinue
}
