param(
  [int]$Port = 8001
)

function Get-PortProcessIds {
  param([int]$TargetPort)

  $netstatIds = netstat -ano | Select-String "^\s*TCP|^\s*UDP" | ForEach-Object {
    $parts = ($_.Line.Trim() -split '\s+')
    $localAddress = $parts[1]
    $processId = $parts[-1]
    if ($localAddress -match "[:.]$TargetPort$") {
      $processId
    }
  }

  $tcpIds = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess

  @(@($netstatIds) + @($tcpIds)) |
    Where-Object { $_ -match '^\d+$' -and [int]$_ -gt 0 } |
    Sort-Object -Unique
}

function Get-DescendantProcessIds {
  param([int[]]$ParentIds)

  $all = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
  if (-not $all) {
    return $ParentIds
  }
  $found = New-Object System.Collections.Generic.HashSet[int]
  $queue = New-Object System.Collections.Generic.Queue[int]

  foreach ($parentId in $ParentIds) {
    [void]$found.Add($parentId)
    $queue.Enqueue($parentId)
  }

  while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    $children = $all | Where-Object { $_.ParentProcessId -eq $current }
    foreach ($child in $children) {
      if ($found.Add([int]$child.ProcessId)) {
        $queue.Enqueue([int]$child.ProcessId)
      }
    }
  }

  @($found.GetEnumerator() | ForEach-Object { [int]$_ })
}

function Get-UvicornPortProcessIds {
  param([int]$TargetPort)

  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match 'uvicorn|app\.main:app' -and
      ($_.CommandLine -match "--port\s+$TargetPort" -or $_.CommandLine -match "[:=]$TargetPort\b")
    } |
    Select-Object -ExpandProperty ProcessId
}

$portProcessIds = @(Get-PortProcessIds -TargetPort $Port)
$uvicornProcessIds = @(Get-UvicornPortProcessIds -TargetPort $Port)
$processIds = @(@($portProcessIds) + @($uvicornProcessIds)) |
  Where-Object { $_ -match '^\d+$' -and [int]$_ -gt 0 } |
  Sort-Object -Unique

if ($processIds) {
  $processIds = @(Get-DescendantProcessIds -ParentIds ([int[]]$processIds)) |
    Sort-Object -Unique
}

if (-not $processIds) {
  Write-Host "Port $Port zaten bos; uvicorn kalintisi bulunamadi."
  exit 0
}

$orderedProcessIds = $processIds | Sort-Object -Descending

foreach ($processId in $orderedProcessIds) {
  try {
    $process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id ([int]$processId) -Force -ErrorAction Stop
      Write-Host "Port $Port icin process kapatildi: $processId ($($process.ProcessName))"
    }
    else {
      $taskkillOutput = & taskkill /PID $processId /T /F 2>&1
      if ($LASTEXITCODE -eq 0) {
        Write-Host "Port $Port icin process taskkill ile kapatildi: $processId"
      }
      else {
        Write-Warning "taskkill basarisiz: $processId - $taskkillOutput"
      }
    }
  }
  catch {
    $taskkillOutput = & taskkill /PID $processId /T /F 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Port $Port icin process taskkill ile kapatildi: $processId"
    }
    else {
      Write-Warning "Process kapatilamadi: $processId - $($_.Exception.Message) - $taskkillOutput"
    }
  }
}

Start-Sleep -Milliseconds 500

$remaining = @(Get-PortProcessIds -TargetPort $Port)
if ($remaining) {
  Write-Warning "Port $Port hala su PID'ler tarafindan tutuluyor: $($remaining -join ', ')"
  exit 1
}

Write-Host "Port $Port tamamen kapandi."
