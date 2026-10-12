// Demo modu: ekip, projeler ve diyaloglar
'use strict';
const CAST = [
  { name: 'Opus', role: 'Takım lideri', shirt: '#e07a55', seed: 3, lead: true },
  { name: 'Sonnet', role: 'Kodlama', shirt: '#5fc9a8', seed: 8 },
  { name: 'Haiku', role: 'Hızlı işler', shirt: '#f0b84a', seed: 21 },
  { name: 'Fable', role: 'Arayüz', shirt: '#d86fa8', seed: 34 },
  { name: 'Sonnet-2', role: 'Test', shirt: '#62aee8', seed: 55 },
  { name: 'Haiku-2', role: 'Dokümantasyon', shirt: '#7bc46a', seed: 89 },
  { name: 'Opus-2', role: 'Mimari', shirt: '#9a8ff0', seed: 144 },
];

const SUPPORT_TYPES = [
  { name: 'Explore', role: 'Kod tarama' },
  { name: 'Plan', role: 'Planlama' },
  { name: 'Genel Destek', role: 'general-purpose' },
  { name: 'Reviewer', role: 'Kod inceleme' },
];

const PROJECTS = [
  { title: 'Ödeme sayfası', files: ['checkout.tsx', 'cart.ts', 'payment.ts', 'checkout.test.ts', 'prices.json'],
    tasks: ['Sepet toplamını düzelt', 'Kupon kodu alanı ekle', 'Ödeme hata mesajları', 'Mobil görünümü toparla', 'Ödeme testlerini yaz', 'Changelog güncelle'] },
  { title: 'Giriş ekranı', files: ['login.tsx', 'auth.ts', 'session.ts', 'auth.test.ts', 'mail.ts'],
    tasks: ['Şifremi unuttum akışı', 'Google ile giriş', 'Oturum süresi ayarı', 'Hatalı giriş ekranı', 'Uçtan uca testler'] },
  { title: 'Envanter sistemi', files: ['Inventory.cs', 'ItemSlot.cs', 'SaveData.cs', 'items.json', 'InventoryUI.cs'],
    tasks: ['Eşya yığınlama', 'Sürükle-bırak', 'Kaydet / yükle', 'Eşya ipuçları', 'Performans ölçümü', 'Hata ayıklama paneli'] },
  { title: 'API v2 göçü', files: ['routes.ts', 'schema.sql', 'migrate.ts', 'api.test.ts', 'openapi.yaml'],
    tasks: ['Şema göçünü yaz', 'Eski uçları işaretle', 'Hız sınırlayıcı', 'API dokümanı', 'Yük testi'] },
  { title: 'Karanlık tema', files: ['theme.css', 'tokens.ts', 'Header.tsx', 'Settings.tsx', 'charts.ts'],
    tasks: ['Renk tokenları', 'Tema düğmesi', 'Kontrast kontrolü', 'Grafik renkleri', 'Ekran görüntüleri'] },
  { title: 'Bildirim servisi', files: ['notify.ts', 'queue.ts', 'templates.ts', 'notify.test.ts', 'push.ts'],
    tasks: ['Kuyruk yapısı', 'E-posta şablonları', 'Mobil bildirim', 'Tekrar deneme mantığı', 'Sessiz saatler'] },
];

const SYMS = ['calcTotal', 'useSession', 'TODO', 'fetchUser', 'applyCoupon', 'onSave', 'retry(', 'theme.dark', 'parseItem', 'FIXME'];
const CMDS = ['npm test', 'npm run build', 'git status', 'git diff --stat', 'npx tsc --noEmit', 'npm run lint', 'pytest -q', 'dotnet test'];
const QUERIES = ['rate limit best practice', 'css contrast ratio', 'oauth refresh token', 'drag and drop a11y', 'retry exponential backoff', 'unity save system json'];

const L = {
  start: ['Tamam, {task} işine başlıyorum.', '{task}… önce koda bir bakayım.', 'Bu iş bende. {task}.', 'Hadi bakalım: {task}.'],
  work: [
    '{file} dosyasında bir şey kokuyor…', 'Şu fonksiyon 300 satır, kim yazdı bunu?', 'Önce testi yazıyorum, sonra kodu.',
    'Bu regex\'i ancak ben anlarım.', 'Tip hatası… yine mi undefined?', '{file} temizlendi, çok daha okunur oldu.',
    'Hmm, tahmin ettiğimden kolaymış.', 'Bir dakika, yanlış daldayım galiba.', 'Lint uyarısı sıfır. Böyle olmalı.',
    'Önce okuyayım, sonra dokunurum.', 'Bu yorum satırı 2019\'dan kalma.', 'Değişikliği küçük tutuyorum.',
    'Kenar durumlar: boş liste, null, uzun metin.', 'Bu test neden yalnızca salı günleri patlıyor?',
  ],
  think: ['{task}… en sade yol hangisi?', 'Bunu ikiye bölebilirim galiba.', 'Kullanıcı aslında ne istiyor?', 'Önce veri, sonra arayüz.', 'Şu bağımlılığa gerçekten gerek var mı?'],
  done: ['{task} bitti!', 'Bitti, testler yeşil.', 'Tamamlandı. Sıradaki?', '{task} tamam, panoya işaretledim.', 'Bitti! Kimse bozmasın.'],
  doneReply: ['Eline sağlık!', 'Harika!', 'Süpersin.', 'Bravo.', 'Çok hızlıydı.'],
  ask: [
    ['{other}, {file} dosyasına sen mi dokundun?', 'Evet, dün akşam. Sorun mu var?', 'Yok, temiz olmuş.'],
    ['{other}, testler sende de kırmızı mı?', 'Bende yeşil. Önbelleği temizle.', 'Haklısın, geçti!'],
    ['{other}, şu hata mesajını sadeleştirir misin?', 'Tabii. Ne olduğunu açıkça yazalım.', 'Kesinlikle.'],
    ['{other}, sence buraya önbellek koyalım mı?', 'Önce ölçelim, sonra karar verelim.', 'Mantıklı, ölçüyorum.'],
    ['Değişkene "data2" adını veren kim?', '…ben. Gece üçtü.', 'Affedildin. Adını değiştiriyorum.'],
    ['{other}, PR\'ıma bakar mısın?', 'Bakıyorum. İki küçük yorumum var.', 'Hemen düzeltiyorum.'],
    ['{other}, bağlam pencerem doluyor.', 'Özetle ve devam et.', 'Sıkıştırıyorum…'],
    ['Kullanıcı "basit olsun" demişti, değil mi?', 'Evet. Fazladan özellik yok.', 'Tamam, o düğmeyi kaldırıyorum.'],
    ['{other}, {task} için hangi dosyaya bakayım?', '{file} ile başla, gerisi oradan çıkıyor.', 'Teşekkürler!'],
    ['{other}, build kırıldı mı?', 'Benim değil! …galiba benim.', 'Düzeltirsin, sorun yok.'],
  ],
  kitchen: [
    ['Kahve makinesi yine yavaş.', 'Token tasarrufu yapıyor herhalde.', 'Haha.'],
    ['Bugün kaç araç çağrısı yaptın?', 'Saymadım ama Grep\'ten bıktım.', 'Glob dene, hayat kurtarıyor.'],
    ['Kedi yine klavyede uyumuş.', 'Commit mesajı "asdfgh" gitmiş.', 'Geri aldım, merak etme.'],
    ['Hafta sonu ne yaptın?', 'Hiç. Ben bir dil modeliyim.', 'Ben de. Güzel hafta sonuydu.'],
    ['Sence biri bizi izliyor mu?', 'Kesin izliyor. El salla.', 'Merhaba!'],
    ['Çay mı kahve mi?', 'Bağlam penceresine göre değişir.', 'Derin.'],
    ['Şu sunucu ışıkları hiç sönmüyor.', 'Bash çalıştıkça daha hızlı yanıp sönüyor.', 'Disko gibi.'],
    ['Yeni gelen destek ajanı kimdi?', 'Explore. Bütün dosyaları iki dakikada taradı.', 'Etkileyici.'],
  ],
  phone: ['Alo, destek? {project} için bir {type} lazım.', 'Merhaba, {project} işi büyüdü. {type} gönderebilir misiniz?', 'Destek hattı mı? Elimizde iş birikti, bir {type} rica ediyorum.'],
  phoneEnd: ['Destek yolda!', 'Geliyorlar, harika.', 'Tamamdır, teşekkürler!'],
  greet: ['Merhaba! Ben {name}. Beni {who} çağırdı.', 'Selam ekip! {name} geldi.', 'İyi günler, {name} burada. Nereden başlayayım?'],
  brief: ['Hoş geldin! {task} işi senin.', '{task} bekliyor, boş masaya geçebilirsin.', 'Tam zamanında. {task} işini al.'],
  report: ['{task} tamam. Notları masana bıraktım.', 'İşim bitti: {task}. Bir şey olursa arayın.', 'Tamamlandı. Rapor hazır.'],
  bye: ['Görüşürüz ekip!', 'Hoşça kalın!', 'Başka iş olursa arayın.'],
  thanks: ['Çok teşekkürler!', 'Eline sağlık, yine bekleriz.', 'Harika iş çıkardın.'],
  wakeCall: ['{other}, uyan! İş birikti.', 'Hey {other}, kahve hazır. İş de.', '{other}! Pano doldu, sana ihtiyacımız var.'],
  alarm: ['Alarm! Pano dolmuş…', 'Bildirim geldi, kalkıyorum.'],
  sleepy: ['Biraz kestireceğim…', 'Gözlerim kapanıyor.', 'Beş dakika şekerleme.', 'Kimse uyandırmasın.'],
  rested: ['Dinlendim, hazırım!', 'Ohh, iyi geldi.', 'Tamam, yeniden çevrimiçiyim.'],
  arcade: ['Rekoru kırmam lazım.', 'Bir el daha…', 'Bu oyunu kim kodladı, çok zor!'],
  window: ['Şehir ne güzel görünüyor.', 'Dışarısı ne kadar sessiz.', 'Bir gün ben de dışarı çıkacağım.'],
  standupLead: ['Günaydın ekip! Yeni proje: {project}.', 'Görevleri panoya yazdım.', 'Takılan olursa destek çağırırız.'],
  standupTake: ['Ben {task} alıyorum.', '{task} bende.', '{task} işine ben bakarım.'],
  standupEnd: ['Hadi başlayalım!', 'Kolay gelsin herkese.', 'Toplantı bitti, işe!'],
  party: ['{project} tamamlandı!', 'Yaşasın!', 'Kahveler benden.', 'Gönderildi!', 'Bir sonraki ne?'],
};
