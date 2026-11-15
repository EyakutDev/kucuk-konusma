# Küçük Konuşma

Bir yabancıyla iki dakika sohbet et. Süre bitince ikiniz de isterseniz sohbet uzar; istemezseniz yeni birine geçersiniz.

- Rastgele eşleşme, kayıt yok (anonim cihaz kimliği)
- 2 dakikalık tur, en fazla 2 uzatma (+2 dk). "Devam" isteği karşı tarafa görünmez; biri istemezse iki taraf da aynı "Süre doldu" ekranını görür
- Her sohbette ortak bir konu kartı; 20 saniye sessizlikte yeni konu önerilir
- Küfür ve hakaret filtresi: uygunsuz mesaj karşıya hiç gitmez, kaydedilmez
- Bildirim ve cihaz bazlı geçici yasak
- Mesajlar sohbet bitince ekrandan silinir; yalnızca bildirimleri inceleyebilmek için sunucuda 3 gün saklanır
- Telefonda ana ekrana eklenebilir (PWA)

## Teknoloji

| Parça | Kullanılan |
|---|---|
| Ön yüz | React 18, TypeScript, Vite |
| Sunucu | Node.js 22, Express, Socket.IO |
| Veritabanı | PostgreSQL 16 |
| Yayın | Docker Compose |

Kod düzeni:

```
web/        Tarayıcı uygulaması (ekranlar: Login, Wait, Chat, End)
server/     Node sunucusu: kimlik, eşleşme kuyruğu, sohbet süresi, bildirim/yasak, temizlik
shared/     İkisinin ortak kullandığı kurallar: olaylar, konu kartları, küfür filtresi
```

Eşleşme kuyruğu ve sohbetler sunucunun belleğinde tutulur; bu yüzden uygulama **tek bir sunucu kopyası** olarak çalışmalıdır. Veritabanında cihazlar, sohbet kayıtları, mesajlar (3 gün) ve bildirimler bulunur.

## Bilgisayarında çalıştırma

Gerekenler: Node.js 20 veya üstü, çalışan bir PostgreSQL.

```bash
npm install

# Veritabanı yoksa Docker ile hızlıca:
docker run -d --name kk-db -p 5432:5432 -e POSTGRES_USER=kucuk -e POSTGRES_PASSWORD=kucuk -e POSTGRES_DB=kucuk postgres:16-alpine

npm run dev
```

Tarayıcıda http://localhost:5173 adresini aç. Eşleşmeyi denemek için ikinci bir pencereyi **gizli sekmede** aç (her pencerenin ayrı bir kimliği olmalı).

Süreyi beklememek için turu kısaltabilirsin: `ROUND_SECONDS=15 npm run dev`

Diğer komutlar:

```bash
npm run typecheck   # TypeScript kontrolü
npm test            # küfür filtresi testleri
npm run build       # dist/ klasörüne üretim derlemesi
npm start           # derlenmiş sürümü çalıştırır
```

## Sunucuya kurulum (Docker)

### 1. Docker'ı kur (yoksa)

Ubuntu/Debian için:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # sonra oturumu kapatıp aç
```

### 2. Kodu indir ve ayarları yap

```bash
git clone https://github.com/EyakutDev/kucuk-konusma.git
cd kucuk-konusma
cp .env.example .env
```

`.env` dosyasında iki zorunlu değeri doldur:

```bash
openssl rand -hex 32   # çıkan değeri SESSION_SECRET'a yapıştır
openssl rand -hex 16   # çıkan değeri POSTGRES_PASSWORD'e yapıştır
```

### 3. Başlat

```bash
docker compose up -d --build
```

Uygulama `http://SUNUCU_IP:3000` adresinde açılır. Durumu kontrol etmek için:

```bash
docker compose ps
docker compose logs -f kucuk-konusma
curl http://localhost:3000/api/health
```

### Güncelleme

```bash
git pull
docker compose up -d --build
```

Veritabanı tabloları uygulama başlarken otomatik oluşturulur ve güncellenir.

### Yedekleme

```bash
docker compose exec db pg_dump -U kucuk kucuk > yedek-$(date +%F).sql
```

## Alan adı ve HTTPS

Telefonda ana ekrana ekleme (PWA) ve bazı tarayıcı özellikleri **HTTPS** ister. Alan adı alınca en kolay yol, sunucuya [Caddy](https://caddyserver.com/) kurup uygulamanın önüne koymaktır; sertifikayı kendisi alır ve yeniler.

Örnek `/etc/caddy/Caddyfile`:

```
kucukkonusma.com {
    reverse_proxy localhost:3000
}
```

Bu durumda `.env` dosyasında `TRUST_PROXY=1` yap (kullanıcıların gerçek IP adresi doğru okunsun) ve 3000 portunu dışarıya kapat.

### Sunucuda zaten Docker içinde bir Caddy varsa

Uygulamayı o Caddy'nin Docker ağına bağla. Depoya girmeyen, sadece sunucuya özel bir `docker-compose.override.yml` dosyası oluştur (Compose bunu otomatik okur):

```yaml
services:
  kucuk-konusma:
    networks: [default, edge]
networks:
  edge:
    external: true
    name: CADDY_AGININ_ADI   # örn. docker inspect ile bulunan ağ adı
```

Caddyfile'a eklenecek blok:

```
kucukkonusma.ornek.com {
    reverse_proxy kucuk-konusma:3000
}
```

Alan adı yoksa ücretsiz [sslip.io](https://sslip.io) kullanılabilir: `kucukkonusma.1-2-3-4.sslip.io` adresi `1.2.3.4` IP'sine gider ve Caddy bunun için de sertifika alır.

## Ayarlar

Tüm ayarlar `.env` dosyasındadır; açıklamalar `.env.example` içinde. Öne çıkanlar:

| Ayar | Varsayılan | Anlamı |
|---|---|---|
| `ROUND_SECONDS` | 120 | Bir turun süresi |
| `MAX_EXTENSIONS` | 2 | En fazla kaç kez uzatılabilir |
| `REPORT_BAN_THRESHOLD` | 3 | Kaç farklı kişi bildirirse cihaz yasaklanır |
| `REPORT_WINDOW_HOURS` | 24 | Bildirimlerin sayıldığı süre |
| `BAN_HOURS` | 24 | Yasak süresi |
| `MESSAGE_RETENTION_HOURS` | 72 | Mesajların sunucuda tutulduğu süre |

## Bilinen sınırlar

- Tamamen anonim olduğu için yasaklanan biri tarayıcı verilerini silerek yeni kimlik alabilir. Bunu yavaşlatmak için bir IP adresinden saatte en fazla 20 yeni kimlik oluşturulabilir.
- Küfür filtresi bir kelime listesine dayanır (`shared/filter.ts`); her şeyi yakalamaz. Listeyi zamanla genişletmek gerekir.
- Yazı tipi Google Fonts'tan yüklenir; bu, kullanıcının IP adresinin Google'a gitmesi demektir. İstenirse yazı tipi sunucuya taşınabilir.
