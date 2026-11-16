// Lonca Asistan service worker: gövdesiz push gelince bekleyen bildirimleri sunucudan çeker ve gösterir.
// API adresi kayıt sırasında ?api=... ile verilir (boş = aynı köken). Telefon numarası bildirim metnine girmez.
var API = '';
try { API = new URL(self.location.href).searchParams.get('api') || ''; } catch (e) { API = ''; }
var BASLIK = 'Lonca Asistan';

function telsiz(m) { return String(m).replace(/\+?\d[\d\s-]{8,}\d/g, ''); }

function tek(b) {
  if (b.tur === 'soru') return 'Müşteri soruyor: "' + telsiz(b.soru || '') + '"';
  if (b.tur === 'randevu_talebi' && b.talep) return 'Randevu talebi: ' + [b.talep.gun, b.talep.saat, b.talep.hizmet].filter(Boolean).join(' ');
  if (b.tur === 'iptal_talebi') return 'İptal talebi: ' + (b.ad || 'bir müşteri');
  return b.metin ? telsiz(b.metin) : 'Yeni bildirim var';
}

// Apps Script API'sinde `/bildirimler` ucu yoktur ve service worker'da PIN/cihaz anahtarı bulunmaz (bilerek): gövdesiz push → sabit kısa metin.
var APPS_SCRIPT = /script\.google\.com|googleusercontent\.com/.test(API);
var GENEL_METIN = 'Yeni soru ya da talep var. Açmak için dokunun.';

function bildirimHazirla() {
  if (APPS_SCRIPT) return Promise.resolve({ govde: GENEL_METIN, etiket: 'lonca-yeni' });
  return fetch(API + '/bildirimler', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) {
    var l = (c && c.bildirimler) || [];
    if (!l.length) return { govde: 'Yeni bildirim var', etiket: 'lonca-bos' };
    if (l.length === 1) return { govde: tek(l[0]), etiket: 'lonca-' + l[0].id };
    return { govde: l.length + ' bekleyen soru', etiket: 'lonca-coklu' };
  }).catch(function () { return { govde: 'Yeni bildirim var', etiket: 'lonca-hata' }; });
}

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  // her push'ta MUTLAKA bir bildirim gösterilir
  e.waitUntil(bildirimHazirla().then(function (h) {
    return self.registration.showNotification(BASLIK, {
      body: h.govde, tag: h.etiket, icon: 'simge-192.png', badge: 'simge-192.png', data: { url: 'yonetim.html#asistan' }
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var hedef = new URL('yonetim.html#asistan', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) {
      if (l[i].url.indexOf('yonetim.html') >= 0 && 'focus' in l[i]) {
        return l[i].focus().then(function (c) { if (c && 'navigate' in c) { try { return c.navigate(hedef); } catch (x) { /* odak yeter */ } } });
      }
    }
    return self.clients.openWindow(hedef);
  }));
});
