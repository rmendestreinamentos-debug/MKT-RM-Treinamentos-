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
  $total = $d.Slides.Count

  # SaveCopyAs exporta o deck inteiro numa chamada só, e num deck longo ele às vezes aborta
  # no meio com E_FAIL depois de uns trinta slides. O perigo não é a falha: é a falha PARCIAL,
  # que deixa a pasta com 28 dos 61 e devolve uma contagem que passa batido — e aí se confere
  # meio deck achando que se conferiu o deck. Quando a contagem não fecha, cai pro Export
  # slide a slide, que é mais lento e não perde o resto por causa de um.
  try { $d.SaveCopyAs($dest, 18) } catch { }     # 18 = ppSaveAsPNG
  $n = (Get-ChildItem $dest -Filter *.PNG -ErrorAction SilentlyContinue | Measure-Object).Count

  if ($n -lt $total) {
    Write-Host "$nome -> lote saiu com $n de $total; refazendo slide a slide"
    $falhas = @()
    for ($i = 1; $i -le $total; $i++) {
      $alvo = Join-Path $dest ("Slide{0}.PNG" -f $i)
      try { $d.Slides.Item($i).Export($alvo, "PNG", 1280, 720) } catch { $falhas += $i }
    }
    $n = (Get-ChildItem $dest -Filter *.PNG -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($falhas.Count) { Write-Host ("  nao saiu: " + ($falhas -join ", ")) }
  }

  $d.Close()
  Write-Host "$nome -> $n de $total png em saida\png\$nome"
  # A contagem faz parte da conferência: PNG faltando é slide que ninguém olhou.
  # (Sem acento nem travessao DENTRO de string: o PS 5.1 le este arquivo como ANSI e o
  # travessao dentro de aspas mata o parser. Em comentario passa, em string nao.)
  if ($n -lt $total) { Write-Host "  ATENCAO: faltam $($total - $n): a folha de contato esta incompleta" }
}
$pp.Quit()
