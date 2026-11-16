# Küçük Konuşma

Yabancılarla 2 dakikalık, rastgele, yazılı sohbet uygulaması. Ayrıntılar README.md'de.

## Çalışma kuralları

- Kullanıcıyla Türkçe konuş.
- **Onay almadan yapma:** commit atmak, GitHub'a göndermek (push), sunucuda ya da başka bir dış hizmette değişiklik yapmak. Önce ne yapacağını söyle, onay bekle.
- Kendi ortamındaki işleri (kod okuma, test, derleme) yapabilirsin, ama ne yaptığını kullanıcıya anlat.
- Sunucudaki kod dosyalarını doğrudan değiştirtme. Değişiklik GitHub'a gider, sunucu `git pull` ile çeker.

## Commit kuralları

- Biçim: `tür(kapsam): yapılan iş`
  - Türler: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`
  - Kapsam isteğe bağlı: `sohbet`, `giriş`, `bekleme`, `bitiş`, `sunucu`, `docker`, `filtre` gibi.
- Başlık Türkçe, geçmiş zaman edilgen ("eklendi", "düzeltildi", "giderildi"), kısa, sonunda nokta yok.
- Açıklama sadece gerçekten gerekirse, birkaç kısa satır. Kullanıcının isteklerini ya da konuşmayı anlatma; kodda ne değiştiğini yaz.
- Yazar: `EyakutDev <yakutenver@gmail.com>`.
- `Co-Authored-By` ya da Claude'u anan hiçbir satır ekleme.

Örnekler:

```
feat(sohbet): uzatma anahtarı son 30 saniyede gösterildi
fix(docker): servis adındaki ağ çakışması giderildi
docs: kurulum adımları sadeleştirildi
```

## Proje

| Klasör | İçerik |
|---|---|
| `web/` | React + Vite istemci. Ekranlar: `Login`, `Wait`, `Chat`, `End` |
| `server/` | Node + Express + Socket.IO. Eşleşme kuyruğu ve sohbetler bellekte (`matchmaker.ts`), veritabanı ve migration'lar `db.ts` içinde |
| `shared/` | İstemci ve sunucunun ortak kodu: olay tipleri, konu kartları, küfür filtresi |

Komutlar:

```bash
npm run dev         # sunucu (:3000) + istemci (:5173)
npm run typecheck
npm test            # küfür filtresi testleri
npm run build
```

Yerel geliştirmede PostgreSQL gerekir (`DATABASE_URL`, varsayılan `postgres://kucuk:kucuk@localhost:5432/kucuk`). Turu kısaltmak için `ROUND_SECONDS=20`.

## Tasarım

- Tek vurgu rengi mercan (`--accent`), açık ve koyu tema token'larla (`web/src/styles.css`).
- Modüler kart (bento) düzeni, Geist yazı tipi.
- Ton sade ve ciddi. Reddedilme hissi yaratmamak temel kural: uzatma kararı gizli, sohbet bitince iki taraf da aynı ekranı görür.

## Sunucu

- Docker Compose ile kurulu. Uygulama tek kopya çalışmalı (eşleşme kuyruğu bellekte).
- Sunucuya özel ayarlar `.env` ve `docker-compose.override.yml` dosyalarında; ikisi de depoda yok.
- Uygulamanın önünde başka bir projeye ait Caddy var. Caddy'yi yeniden başlatmak sunucudaki tüm siteleri birkaç saniye keser, önce kullanıcıya sor.
- Sunucu IP'sini ve canlı adresi README dışında herkese açık yerlere yazma.
