# Veri Dönüşüm Birimi Portalı

FastAPI backend ve ayrılmış frontend dosyalarıyla hazırlanmış iç portal. İçerikler JSON dosyalarından gelir; çalışmalar, duyurular, bağlantılar ve talep formu hazırdır.

## İlk Kurulum

PowerShell'i proje klasöründe açın veya şu komutla klasöre geçin:

```powershell
cd "C:\Users\o\source\birim_website_tasarımı\_v4"
```

Sanal ortam oluşturun:

```powershell
python -m venv .venv
```

Sanal ortamı aktif edin:

```powershell
.\.venv\Scripts\Activate.ps1
```

PowerShell script izni uyarısı alırsanız yalnızca bu terminal oturumu için izin verin, sonra tekrar aktif edin:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Python paketlerini indirin:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Çalıştırma

Geliştirme sunucusunu başlatın:

```powershell
python -m uvicorn app.main:app --reload --port 8001
```

Tarayıcıda şu adresi açın:

```text
http://127.0.0.1:8001/
```

Ek sayfalar:

```text
http://127.0.0.1:8001/works
http://127.0.0.1:8001/announcements
http://127.0.0.1:8001/admin
```

Sunucuyu durdurmak için PowerShell penceresinde `Ctrl + C` yapın.

## Port Takılırsa

`8001` dolu görünürse PID aramadan otomatik kapatın. Bu script portu tutan process'i, varsa `uvicorn --reload` child process'lerini ve aynı portla çalışan uvicorn kalıntılarını kapatır:

```powershell
.\scripts\kill-port.ps1 -Port 8001
```

PowerShell script izni uyarısı verirse şu şekilde çalıştırın:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\kill-port.ps1 -Port 8001
```

Sonra sunucuyu tekrar başlatın:

```powershell
python -m uvicorn app.main:app --reload --port 8001
```

Kontrol etmek isterseniz:

```powershell
Invoke-WebRequest http://127.0.0.1:8001/ -UseBasicParsing
```

## Kontrol Komutları

API ana içeriği geliyor mu kontrol etmek için:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/portal
```

Çalışmaları kontrol etmek için:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/works
```

Duyuruları kontrol etmek için:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/announcements
```

## Dosya Yapısı

- `app/main.py`: FastAPI uygulaması ve API uçları
- `app/data/content.json`: duyuru, çalışma, bağlantı ve talep tipi içerikleri
- `app/data/requests.json`: gönderilen talep kayıtları
- `index.html`: ana frontend iskeleti
- `works.html`: tüm çalışmalar sayfası
- `announcements.html`: tüm duyurular sayfası
- `admin.html`: duyuru ve çalışma ekleme paneli
- `static/css/base.css`: korunan mevcut tema stilleri
- `static/css/app.css`: yeni etkileşim, hover, modal ve responsive stilleri
- `static/css/admin.css`: yönetim paneli stilleri
- `static/js/home.js`: ana sayfa etkileşimleri
- `static/js/listing.js`: tümünü göster sayfaları
- `static/js/admin.js`: yönetim paneli etkileşimleri
- `static/js/api.js`, `ui.js`, `utils.js`: ortak frontend yardımcıları
- `static/img`: logo ve header görselleri

## İçerik Güncelleme

Yeni duyuru veya çalışma eklemek için `/admin` panelini kullanabilirsiniz. İsterseniz `app/data/content.json` dosyasını doğrudan da düzenleyebilirsiniz. Sunucu `--reload` ile çalıştığı için çoğu değişiklik yenilemeden sonra görünür.

Talep formundan gelen kayıtlar `app/data/requests.json` içine yazılır. Bu dosyayı boşaltmak isterseniz içeriğini şu şekilde bırakın:

```json
[]
```
