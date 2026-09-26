$ErrorActionPreference = "Stop"

$destination = Join-Path $PSScriptRoot "..\frontend\public\images\listings"
New-Item -ItemType Directory -Force $destination | Out-Null

$photos = [ordered]@{
    "manali-villa.jpg"       = "1600607687939-ce8a6c25118c"
    "goa-palms.jpg"          = "1582268611958-ebfd161ef9cf"
    "mussoorie-cottage.jpg"  = "1449158743715-0a90ebb6d2d8"
    "alibag-home.jpg"        = "1600047509807-ba8f99d2cdde"
    "jaipur-haveli.jpg"      = "1600566753190-17f0baa2a6c3"
    "nainital-cabin.jpg"     = "1473448912268-2022ce9509d8"
    "varkala-pool.jpg"       = "1566073771259-6a8506099945"
    "bengaluru-loft.jpg"     = "1522708323590-d24dbb6b0267"
    "munnar-bungalow.jpg"    = "1544984243-ec57ea16fe25"
    "kasol-chalet.jpg"       = "1510798831971-661eb04b3739"
    "anjuna-home.jpg"        = "1499793983690-e29da59ef1c2"
    "udaipur-residence.jpg"  = "1564013799919-ab600027ffc6"
    "nashik-pool.jpg"        = "1580587771525-78b9dba3b914"
    "mumbai-apartment.jpg"   = "1502672260266-1c1ef2d93688"
    "alappuzha-cottage.jpg"  = "1500530855697-b586d89ba3ee"
    "leh-lodge.jpg"          = "1500534314209-a25ddb2bd429"
    "treehouse.jpg"          = "1520250497591-112f2f40a3f4"
    "jodhpur-suite.jpg"      = "1590490360182-c33d57733427"
    "srinagar-houseboat.jpg" = "1493809842364-78817add7ffb"
    "auroville-farm.jpg"     = "1600047509358-9dc75507daeb"
    "ooty-cottage.jpg"       = "1505693416388-ac5ce068fe85"
    "delhi-penthouse.jpg"    = "1600566753086-00f18fb6b3ea"
    "gokarna-cottage.jpg"    = "1455587734955-081b22074882"
    "shimla-cabin.jpg"       = "1449844908441-8829872d2607"
    "interior-living.jpg"    = "1600607687920-4e2a09cf159d"
    "interior-bedroom.jpg"   = "1600566753051-f0b89df2dd90"
    "interior-exterior.jpg"  = "1600585154340-be6161a56a0c"
}

foreach ($photo in $photos.GetEnumerator()) {
    $output = Join-Path $destination $photo.Key
    if (-not (Test-Path $output)) {
        $url = "https://images.unsplash.com/photo-$($photo.Value)?auto=format&fit=crop&w=1200&q=82"
        Invoke-WebRequest -Uri $url -OutFile $output
    }
}

Write-Host "Listing images are available in $destination"
