# Odak Not

DEHB dostu, tablette kalemle el yazısı için tasarlanmış, mühendislik ve sayısal derslere odaklı bir not uygulaması. Gemini yapay zekâsı el yazısını okuyup metne ve LaTeX'e çevirir, çözümleri kontrol eder, soruları adım adım çözer.

- Kurulum gerektirmez: tek bir statik site, GitHub Pages'te ücretsiz çalışır.
- Tablete uygulama gibi kurulur (ana ekrana ekle), internet yokken de not alınır.
- Notlar yalnızca kullanıcının kendi cihazında (tarayıcı IndexedDB) saklanır.
- Gemini API anahtarı koda **yazılmaz**; her kullanıcı kendi anahtarını uygulamanın Ayarlar ekranından girer.

---

## Bölüm 1 — GitHub Pages'te yayına alma (repo sahibi için)

Git bilmeye gerek yok, hepsi tarayıcıdan yapılır. Yaklaşık 5 dakika.

### 1. Yeni repo oluştur
1. github.com'a giriş yap → sağ üstteki **+** → **New repository**.
2. **Repository name:** `odak-not` (başka bir isim de olur; linkte bu isim görünür).
3. **Public** seçili olsun. (Ücretsiz hesapta GitHub Pages yalnızca public repolarda çalışır.)
4. Diğer kutucukları boş bırak → **Create repository**.

### 2. Dosyaları yükle
1. Açılan sayfada **uploading an existing file** linkine tıkla.
2. Zip'ten çıkardığın klasörün **içindeki** her şeyi seç ve sürükle:
   ```
   index.html
   manifest.webmanifest
   sw.js
   .nojekyll
   README.md
   icons/   (klasörün kendisini sürükle)
   ```
   > Önemli: `odak-not-site` klasörünün kendisini değil, **içindekileri** sürükle. `index.html` reponun en üst seviyesinde olmalı.
   >
   > `.nojekyll` gizli dosya olduğu için görünmeyebilir. Görünmezse sorun değil, atlayabilirsin; site yine çalışır.
3. Aşağıda **Commit changes** düğmesine bas.

### 3. Pages'i aç
1. Repoda üstteki **Settings** sekmesi → sol menüde **Pages**.
2. **Source:** `Deploy from a branch`.
3. **Branch:** `main` ve klasör `/ (root)` → **Save**.
4. 1–2 dakika bekle, sayfayı yenile. Üstte şu çıkar:
   **Your site is live at `https://KULLANICI-ADI.github.io/odak-not/`**

Bu linki uygulamayı kullanacak kişiye gönder.

### Güncelleme yapmak gerekirse
Repoda **Add file → Upload files** ile yeni `index.html`'i yükle (eskisinin üzerine yazar) ve `sw.js` içindeki `VERSION` satırındaki sayıyı bir artır (`odak-not-v1` → `odak-not-v2`). Böylece tabletler yeni sürümü alır.

---

## Bölüm 2 — Tablette kullanmaya başlama (kullanıcı için)

### 1. Uygulamayı aç ve kur
1. Tablette **Chrome** veya **Samsung Internet** ile site linkini aç.
2. Menüden (⋮) **Ana ekrana ekle** / **Uygulamayı yükle** seç.
3. Artık ana ekrandaki **Odak Not** ikonundan, tarayıcı çubuğu olmadan açılır.

### 2. Gemini API anahtarı al (ücretsiz)
1. **aistudio.google.com/apikey** adresine Google hesabınla gir.
2. **Create API key** → oluşan anahtarı kopyala.

### 3. Anahtarı uygulamaya gir
1. Uygulamada sol paneli aç (sol üstteki ☰) → alttaki **dişli** simgesi → Ayarlar.
2. Anahtarı yapıştır → **Bağlantıyı test et**.
3. "Bağlantı çalışıyor ✓" görürsen hazırsın. Anahtar yalnızca o cihazda saklanır.

### 4. Kullanım
| Ne | Nasıl |
|---|---|
| Yaz | Kalemle doğrudan yaz. Kalem algılanınca parmak sadece sayfayı kaydırır (avuç içi reddi). |
| Sil | Silgi aracı ya da kalemin silgi ucu / yan düğmesi. |
| Geri al | ↶ düğmesi veya Ctrl+Z (klavye bağlıysa). |
| Arka plan | Üst sağdaki ızgara simgesi: ızgara → nokta → düz. |
| Odak modu | ☰ ile sol paneli kapat; sadece sayfa kalır. |
| Yapay zekâ | Alt çubuktaki **Asistan** → Dijitale çevir / Çözümü kontrol et / Adım adım çöz / Özet. Ya da sayfa hakkında soru yaz. |

Kısayollar (klavye varsa): `P` kalem, `H` fosforlu, `E` silgi, `Esc` paneli kapat.

---

## Sorun giderme

| Mesaj | Çözüm |
|---|---|
| *Uygulama bir önizleme penceresinin içinde açılmış* | Linki Chrome'da kendi sekmesinde aç; dosya önizleyicilerde yapay zekâ çalışmaz. |
| *API anahtarı geçersiz* | AI Studio'dan anahtarı tekrar kopyala; başında/sonunda eksik karakter olmasın. |
| *Ücretsiz kota doldu* | 1 dakika bekle. Günlük kota dolduysa ertesi gün yenilenir. |
| *Google'a ulaşılamadı… reklam engelleyici/VPN* | Reklam engelleyiciyi bu site için kapat veya farklı bir ağda dene. Bazı okul/iş ağları Google API'lerini engeller. |
| Eski sürüm açılıyor | Uygulamayı tamamen kapatıp yeniden aç; olmadıysa tarayıcıda siteyi bir kez yenile. |

### Notlarım nerede?
Notlar **cihazın tarayıcısında** tutulur, sunucuya veya GitHub'a gitmez. Bu yüzden:
- Başka cihazda aynı notlar görünmez.
- Tarayıcı verilerini (site verisi) silmek notları da siler.
- Site adresi değişirse (ör. repo adı değişirse) eski notlar yeni adreste görünmez.

---

## Teknik özet (geliştirici için)

| Dosya | Görevi |
|---|---|
| `index.html` | Uygulamanın tamamı: arayüz, çizim motoru (Canvas + Pointer Events, basınç, yumuşatma), IndexedDB kaydı, Gemini istemcisi. |
| `manifest.webmanifest` | Ana ekrana kurulum (PWA) bilgileri. |
| `sw.js` | Çevrimdışı önbellek. Gemini isteklerini hiç önbelleğe almaz. |
| `icons/` | Uygulama ikonları. |
| `.nojekyll` | GitHub Pages'in dosyaları işlemeden yayınlamasını sağlar. |

- Derleme adımı yok, bağımlılık kurulumu yok. KaTeX ve Inter fontu CDN'den gelir.
- Gemini çağrısı doğrudan tarayıcıdan `generativelanguage.googleapis.com/v1beta`'ya gider. Varsayılan model `gemini-3.8-flash`; model kapalıysa (404) uygulama anahtarın erişebildiği en uygun flash modelini otomatik seçer.
- Yerelde denemek için: klasörde `python3 -m http.server 8000` → `http://localhost:8000`.

**Güvenlik notu:** API anahtarını asla repoya, koda veya README'ye yazma. Repo public olduğu için herkes görür. Anahtar yalnızca Ayarlar ekranından girilir ve kullanıcının cihazında kalır.
