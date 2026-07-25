[CmdletBinding()]
param(
  [ValidateSet(
    "List",
    "Audit",
    "Upsert",
    "SetStock",
    "SetPrice",
    "Enable",
    "Disable",
    "ConfirmAddOn",
    "RestoreAddOn",
    "Restock"
  )]
  [string]$Action = "List",

  [string]$Sku,

  [string]$Brand,

  [string]$Model,

  [string]$Name = "Premium Tempered Glass",

  [string]$Label = "Premium Screen Protector",

  [decimal]$Price = 19,

  [int]$Quantity = 0,

  [int]$Units = 1,

  [string]$RequestId,

  [string]$Note,

  [int]$Limit = 25
)

$ErrorActionPreference = "Stop"

$endpoint =
  "https://gorjynnsbmdifnkzxame.supabase.co/functions/v1/primitive-repairs-screen-protectors-admin"

$credentialPath = Join-Path `
  $env:LOCALAPPDATA `
  "PrimitiveRepairs\screen-protector-admin-key.txt"

function Convert-SecureStringToPlainText {
  param(
    [Parameter(Mandatory)]
    [Security.SecureString]$SecureValue
  )

  $pointer = [IntPtr]::Zero

  try {
    $pointer =
      [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
        $SecureValue
      )

    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
      $pointer
    )
  } finally {
    if ($pointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(
        $pointer
      )
    }
  }
}

function Get-InventoryAdminKey {
  if (Test-Path $credentialPath) {
    $encryptedKey = Get-Content `
      -Path $credentialPath `
      -Raw

    $secureKey = ConvertTo-SecureString `
      -String $encryptedKey

    return Convert-SecureStringToPlainText `
      -SecureValue $secureKey
  }

  $secureKey = Read-Host `
    "Inventory admin key" `
    -AsSecureString

  return Convert-SecureStringToPlainText `
    -SecureValue $secureKey
}

function Require-Text {
  param(
    [string]$Value,
    [string]$FieldName
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$FieldName is required for action $Action."
  }
}

$adminKey = Get-InventoryAdminKey

$headers = @{
  Authorization = "Bearer $adminKey"
  Accept = "application/json"
}

try {
  switch ($Action) {
    "List" {
      $result = Invoke-RestMethod `
        -Uri "${endpoint}?view=inventory" `
        -Method Get `
        -Headers $headers

      $result.inventory |
      Select-Object `
        brand,`
        model,`
        sku,`
        price,`
        quantity,`
        available,`
        active,`
        updated_at |
      Format-Table -AutoSize

      break
    }

    "Audit" {
      $safeLimit = [Math]::Min(
        100,
        [Math]::Max(1, $Limit)
      )

      $result = Invoke-RestMethod `
        -Uri "${endpoint}?view=audit&limit=$safeLimit" `
        -Method Get `
        -Headers $headers

      $result.audit |
      Select-Object `
        id,`
        sku,`
        operation,`
        changed_at |
      Format-Table -AutoSize

      break
    }

    "Upsert" {
      Require-Text $Sku "SKU"
      Require-Text $Brand "Brand"
      Require-Text $Model "Model"

      $body = @{
        action = "upsert"
        sku = $Sku
        brand = $Brand
        model = $Model
        name = $Name
        label = $Label
        price = $Price
        quantity = $Quantity
        installed = $true
        active = $true
      } |
      ConvertTo-Json -Depth 5

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      $result.record |
      Format-List

      break
    }

    "ConfirmAddOn" {
      Require-Text $Sku "SKU"
      Require-Text $RequestId "Request ID"

      $body = @{
        action = "confirm-addon"
        sku = $Sku
        requestId = $RequestId
        units = $Units
        note = $Note
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      Write-Host "`nInventory:"
      $result.result.inventory |
      Format-List

      Write-Host "`nMovement:"
      $result.result.movement |
      Format-List

      Write-Host (
        "`nIdempotent: " +
        $result.result.idempotent
      )

      break
    }

    "RestoreAddOn" {
      Require-Text $Sku "SKU"
      Require-Text $RequestId "Request ID"

      $body = @{
        action = "restore-addon"
        sku = $Sku
        requestId = $RequestId
        note = $Note
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      Write-Host "`nInventory:"
      $result.result.inventory |
      Format-List

      Write-Host "`nMovement:"
      $result.result.movement |
      Format-List

      Write-Host (
        "`nIdempotent: " +
        $result.result.idempotent
      )

      break
    }

    "Restock" {
      Require-Text $Sku "SKU"

      $operationId =
        "restock:" +
        [guid]::NewGuid().ToString("N")

      $body = @{
        action = "restock"
        sku = $Sku
        units = $Units
        operationId = $operationId
        note = $Note
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      Write-Host "`nInventory:"
      $result.result.inventory |
      Format-List

      Write-Host "`nMovement:"
      $result.result.movement |
      Format-List

      break
    }

    "SetStock" {
      Require-Text $Sku "SKU"

      $body = @{
        action = "set-stock"
        sku = $Sku
        quantity = $Quantity
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      $result.record |
      Format-List

      break
    }

    "SetPrice" {
      Require-Text $Sku "SKU"

      $body = @{
        action = "set-price"
        sku = $Sku
        price = $Price
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      $result.record |
      Format-List

      break
    }

    "Enable" {
      Require-Text $Sku "SKU"

      $body = @{
        action = "enable"
        sku = $Sku
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      $result.record |
      Format-List

      break
    }

    "Disable" {
      Require-Text $Sku "SKU"

      $body = @{
        action = "disable"
        sku = $Sku
      } |
      ConvertTo-Json

      $result = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body

      $result.record |
      Format-List

      break
    }
  }
} finally {
  $adminKey = $null
}