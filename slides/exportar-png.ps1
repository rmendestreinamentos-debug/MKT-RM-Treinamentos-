# exportar-png.ps1 — abre o .pptx no PowerPoint e salva cada slide como PNG.
# Uso:  powershell -NoProfile -File exportar-png.ps1 teste-tema-mat [outro ...]
#       (sem argumento: exporta TODOS os .pptx de saida/)
#
# Por que existe: deck só se confere com o OLHO. O motor pode dizer "ok: 30 slides" e
# ter posto o título por baixo da foto — isso não aparece no log, aparece na imagem.
# É o PowerPoint que renderiza, então é ele que diz a verdade sobre fonte e quebra.

param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Decks)

$base = $PSScriptRoot
$saida = Join-Path $base "saida"
if (-not $Decks) {
  $Decks = Get-ChildItem $saida -Filter *.pptx | ForEach-Object { $_.BaseName }
}

$pp = New-Object -ComObject PowerPoint.Application
foreach ($nome in $Decks) {
  $src = Join-Path $saida "$nome.pptx"
  if (-not (Test-Path $src)) { Write-Host "nao existe: $nome.pptx"; continue }
  $dest = Join-Path $saida "png\$nome"
  New-Item -ItemType Directory -Force $dest | Out-Null
  Get-ChildItem $dest -Filter *.PNG -ErrorAction SilentlyContinue | Remove-Item -Force
  $d = $pp.Presentations.Open($src, $true, $false, $false)
  $d.SaveCopyAs($dest, 18)     # 18 = ppSaveAsPNG
  $d.Close()
  $n = (Get-ChildItem $dest -Filter *.PNG | Measure-Object).Count
  Write-Host "$nome -> $n png em saida\png\$nome"
}
$pp.Quit()
