# Ajan Ofisi

Claude Code'da çalışan ajanları piksel sanatı bir ofiste anlık gösteren görselleştirici.

- **Canlı mod:** Son 10 saatteki Claude oturumları ofiste karakter olur. Çalışan ajan masasındadır, monitörü kullandığı araca göre değişir (kod, terminal, tarayıcı, doküman). Gerçek mesajları konuşma balonunda görünür. Turu biten ajan kahveye gider, bir süre sonra koltukta uyur; yeni görev gelince uyanır. Alt ajan çağrılınca telefon çalar, destek ajanı kapıdan girer, işini bitirip çıkar.
- **Demo modu:** Kendi kendine dönen bir ekip simülasyonu: toplantılar, uyandırmalar, destek çağrıları, kutlamalar.

## Çalıştırma

`baslat.bat` dosyasına çift tıkla ya da:

```bash
node server.js
```

Sonra tarayıcıda `http://localhost:4777` adresini aç. Node.js dışında bağımlılık yok.

Köprü (`server.js`) sadece `~/.claude/projects` altındaki oturum kayıtlarını okur; Claude ayarlarına dokunmaz. `index.html` doğrudan açılırsa yalnızca demo modu çalışır.

Port değiştirmek için: `AJAN_OFISI_PORT=5000 node server.js`
