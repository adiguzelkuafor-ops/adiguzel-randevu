(function () {
  var API = (window.RANDEVU_API || '').trim();
  var DENEME = !API && /[?&]deneme=1(&|$)/.test(location.search);
  var AYAR_YOK = !API && !DENEME;
  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var GUN_K = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  var GUN_U = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  var HATA = {
    dolu: 'Bu saat az önce doldu. Lütfen başka bir saat seçin.',
    ad: 'Adınızı yalnız harflerle yazın (en az 2, en çok 40 karakter).', telefon: 'Telefonu 05xx xxx xx xx biçiminde yazın.',
    sinir: 'Bu numarayla zaten bekleyen randevularınız var.', sinir_doldu: 'Şu an çevrimiçi randevu alınamıyor, lütfen dükkânı arayın.', iz_sinir: 'Bu cihazdan çok fazla randevu denemesi yapıldı. Lütfen dükkânı arayın.', yogun: 'Şu an yoğunluk var, birkaç saniye sonra tekrar deneyin.',
    ag: 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.'
  };
  var $ = function (id) { return document.getElementById(id); };
  var d = { bilgi: null, hizmet: null, tarih: null, saat: null, istek: 0 };

  // ------------------------------------------------ veri (gerçek ya da deneme)
  function get(p) {
    if (AYAR_YOK) return new Promise(function () {});
    if (DENEME) return Promise.resolve(sahte.get(p));
    var q = Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
    return fetch(API + '?' + q).then(function (r) { return r.json(); });
  }
  function post(b) {
    if (AYAR_YOK) return new Promise(function () {});
    if (DENEME) return new Promise(function (ok) { setTimeout(function () { ok(sahte.post(b)); }, 600); });
    return fetch(API, { method: 'POST', body: JSON.stringify(b) }).then(function (r) { return r.json(); });
  }
  var sahte = {
    bugun: function () { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); },
    ekle: function (t, n) { var p = t.split('-'); var x = new Date(+p[0], +p[1] - 1, +p[2] + n); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); },
    gunNo: function (t) { var p = t.split('-'); return (new Date(+p[0], +p[1] - 1, +p[2]).getDay() + 6) % 7; },
    get: function (p) {
      if (p.islem === 'bilgi') {
        var b = sahte.bugun(), gunler = [];
        for (var i = 0; i < 14; i++) { var t = sahte.ekle(b, i); gunler.push({ tarih: t, gun: sahte.gunNo(t), acik: sahte.gunNo(t) !== 6 }); }
        return { ok: true, dukkan: 'Adıgüzel Kuaför', adres: '[adres]', telefon: '[telefon]', simdiAcik: true,
          hizmetler: [{ id: 'sac', ad: 'Saç', sure: 30, fiyat: '400' }, { id: 'sakal', ad: 'Sakal', sure: 20, fiyat: '200' }, { id: 'sac-sakal', ad: 'Saç + sakal', sure: 45, fiyat: '550' }], gunler: gunler };
      }
      var s = [], tohum = +p.tarih.replace(/-/g, '') % 7;
      for (var m = 540; m + 30 <= 1200; m += 30) { if (m >= 720 && m < 780) continue; if ((m / 30 + tohum) % 4 === 0) continue; s.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2)); }
      return { ok: true, tarih: p.tarih, saatler: s };
    },
    post: function (b) {
      var h = d.bilgi.hizmetler.filter(function (x) { return x.id === b.hizmet; })[0];
      var p = b.saat.split(':'), bit = +p[0] * 60 + +p[1] + h.sure;
      return { ok: true, id: 'deneme', tarih: b.tarih, bas: b.saat, bit: ('0' + Math.floor(bit / 60)).slice(-2) + ':' + ('0' + bit % 60).slice(-2), hizmet: h.ad, adres: '[adres]', telefon: '[telefon]' };
    }
  };

  // ------------------------------------------------ yardımcılar
  function tarihParca(t) { var p = t.split('-'); return { y: +p[0], a: +p[1], g: +p[2] }; }
  function uzunTarih(t, gunNo) { var p = tarihParca(t); return GUN_U[gunNo] + ', ' + p.g + ' ' + AYLAR[p.a - 1]; }
  function saatGoster(s) { return kacis(String(s).replace(':', '.')); }
  function fiyatYaz(f) { return f ? (/^\d+$/.test(f) ? f + ' ₺' : f) : ''; }
  function tost(m) { var t = $('tost'); t.textContent = m; t.classList.add('ac'); clearTimeout(tost.z); tost.z = setTimeout(function () { t.classList.remove('ac'); }, 3200); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function kacis(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ------------------------------------------------ çizim
  function hizmetleriCiz() {
    var kap = $('hizmetler'); kap.innerHTML = '';
    var hz = d.bilgi.hizmetler;
    hz.forEach(function (h, i) {
      var genis = hz.length % 2 === 1 && i === hz.length - 1;
      var b = el('button', 'k' + (genis ? ' genis' : '') + (d.hizmet === h ? ' sec' : ''),
        '<b>' + kacis(h.ad) + '</b><span>' + kacis(h.sure) + ' dk' + (h.fiyat ? ' · ' + kacis(fiyatYaz(h.fiyat)) : '') + '</span>');
      b.onclick = function () { d.hizmet = h; d.saat = null; hizmetleriCiz(); saatleriYukle(); ctaCiz(); };
      kap.appendChild(b);
    });
  }

  function gunleriCiz() {
    var kap = $('gunler'); kap.innerHTML = '';
    d.bilgi.gunler.forEach(function (g) {
      var b = el('button', 'g' + (d.tarih === g.tarih ? ' sec' : ''), '<small>' + GUN_K[g.gun] + '</small><b>' + tarihParca(g.tarih).g + '</b>');
      b.disabled = !g.acik;
      b.onclick = function () { d.tarih = g.tarih; d.saat = null; gunleriCiz(); saatleriYukle(); ctaCiz(); };
      kap.appendChild(b);
    });
    var sec = d.bilgi.gunler.filter(function (g) { return g.tarih === d.tarih; })[0];
    $('gunBaslik').textContent = sec ? uzunTarih(sec.tarih, sec.gun) : 'Gün seçin';
  }

  function saatleriYukle() {
    var kap = $('saatler');
    if (!d.hizmet || !d.tarih) { kap.innerHTML = ''; return; }
    var no = ++d.istek;
    kap.innerHTML = '<div class="saat">' + '<div class="iskelet"></div>'.repeat(6) + '</div>';
    get({ islem: 'bos', tarih: d.tarih, hizmet: d.hizmet.id }).then(function (c) {
      if (no !== d.istek) return;
      if (!c.ok) { kap.innerHTML = '<p class="bilgi">Saatler yüklenemedi.</p>'; return; }
      saatleriCiz(c.saatler);
    }).catch(function () { if (no === d.istek) kap.innerHTML = '<p class="bilgi">' + HATA.ag + '</p>'; });
  }

  function saatleriCiz(liste) {
    var kap = $('saatler'); kap.innerHTML = '';
    if (!liste.length) { kap.innerHTML = '<p class="bilgi">Bu gün için boş saat kalmadı. Başka bir gün seçin.</p>'; return; }
    var gruplar = [['Sabah', function (s) { return s < '12:00'; }], ['Öğleden sonra', function (s) { return s >= '12:00' && s < '17:00'; }], ['Akşam', function (s) { return s >= '17:00'; }]];
    gruplar.forEach(function (gr) {
      var l = liste.filter(gr[1]); if (!l.length) return;
      kap.appendChild(el('div', 'kume', gr[0]));
      var sira = el('div', 'saat');
      l.forEach(function (s) {
        var b = el('button', 's' + (d.saat === s ? ' sec' : ''), saatGoster(s));
        b.onclick = function () { d.saat = s; saatleriCiz(liste); ctaCiz(); };
        sira.appendChild(b);
      });
      kap.appendChild(sira);
    });
  }

  function ctaCiz() {
    var c = $('cta');
    if (d.hizmet && d.tarih && d.saat) {
      var g = d.bilgi.gunler.filter(function (x) { return x.tarih === d.tarih; })[0];
      $('ctaYazi').innerHTML = kacis(d.hizmet.ad) + ' · ' + saatGoster(d.saat) + '<small>' + uzunTarih(d.tarih, g.gun) + '</small>';
      c.disabled = false;
    } else {
      $('ctaYazi').innerHTML = (d.hizmet ? 'Saat seçin' : 'Hizmet seçin') + '<small>&nbsp;</small>';
      c.disabled = true;
    }
  }

  // ------------------------------------------------ bilgi kartı
  function sayfaAc() {
    var g = d.bilgi.gunler.filter(function (x) { return x.tarih === d.tarih; })[0];
    $('ozet').innerHTML = '<b>' + kacis(d.hizmet.ad) + ' · ' + saatGoster(d.saat) + '</b><small>' + uzunTarih(d.tarih, g.gun) + ' · ' + kacis(d.hizmet.sure) + ' dk' + (d.hizmet.fiyat ? ' · ' + kacis(fiyatYaz(d.hizmet.fiyat)) : '') + '</small>';
    $('hataYazi').textContent = '';
    $('perde').classList.add('ac'); $('sayfa').classList.add('ac');
    setTimeout(function () { ($('ad').value ? $('tel') : $('ad')).focus(); }, 300);
  }
  function sayfaKapat() { $('perde').classList.remove('ac'); $('sayfa').classList.remove('ac'); document.activeElement && document.activeElement.blur(); }

  $('cta').onclick = sayfaAc;
  $('perde').onclick = sayfaKapat;
  $('degistir').onclick = sayfaKapat;

  // Ad: yalnız harf, boşluk, nokta, kesme, tire; 2-40 karakter, en az 2 harf (sunucudaki kuralın aynısı)
  function adGecerli(a) {
    a = a.replace(/\s+/g, ' ').trim();
    return a.length >= 2 && a.length <= 40 && /^[\p{L} .'’\-]+$/u.test(a) && (a.match(/\p{L}/gu) || []).length >= 2;
  }

  // Tarayıcı izi (G4b): kalıcı rastgele kimlik + cihaz özeti (SHA-256). Sunucu ikisini yeniden özetler; ham değer tabloya yazılmaz.
  function izKimlik() {
    var k = ''; try { k = localStorage.getItem('iz_kimlik') || ''; } catch (x) {}
    if (/^[0-9a-f]{32}$/.test(k)) return k;
    k = '';
    try { var a = new Uint8Array(16); window.crypto.getRandomValues(a); for (var i = 0; i < 16; i++) k += ('0' + a[i].toString(16)).slice(-2); } catch (x) { k = ''; }
    if (!k) for (var j = 0; j < 32; j++) k += Math.floor(Math.random() * 16).toString(16);
    try { localStorage.setItem('iz_kimlik', k); } catch (x) {}
    return k;
  }
  function izOzet() {
    try {
      var t = ''; try { t = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (x) {}
      var s = [navigator.userAgent, navigator.language, t, screen.width, screen.height, screen.colorDepth, navigator.hardwareConcurrency, navigator.platform].join('|');
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      }).catch(function () { return ''; });
    } catch (x) { return Promise.resolve(''); }
  }

  $('sayfa').onsubmit = function (e) {
    e.preventDefault();
    var ad = $('ad').value.trim(), tel = $('tel').value.replace(/\D/g, '');
    $('ad').classList.toggle('hata', !adGecerli(ad));
    $('tel').classList.toggle('hata', !/^(90)?0?5\d{9}$/.test(tel));
    if (!adGecerli(ad)) { $('hataYazi').textContent = HATA.ad; return; }
    if (!/^(90)?0?5\d{9}$/.test(tel)) { $('hataYazi').textContent = HATA.telefon; return; }
    var btn = $('onayla'); btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    izOzet().then(function (oz) { return post({ islem: 'randevu', tarih: d.tarih, saat: d.saat, hizmet: d.hizmet.id, ad: ad, telefon: tel, site: $('site').value, iz_kimlik: izKimlik(), iz_ozet: oz }); })
      .then(function (c) {
        btn.disabled = false; btn.textContent = 'Randevuyu onayla';
        if (c.ok) { try { localStorage.setItem('randevu_kisi', JSON.stringify({ ad: ad, tel: $('tel').value, zaman: Date.now() })); } catch (x) {} onayGoster(c); return; }
        if (c.hata === 'dolu') { sayfaKapat(); tost(HATA.dolu); d.saat = null; ctaCiz(); saatleriYukle(); return; }
        if (c.hata === 'sinir_doldu' || c.hata === 'iz_sinir') {
          var dTel = c.telefon || (d.bilgi && d.bilgi.telefon) || '';
          $('hataYazi').textContent = HATA[c.hata] + (dTel ? ' Telefon: ' + dTel : '');
          return;
        }
        $('hataYazi').textContent = HATA[c.hata] || 'Randevu alınamadı, tekrar deneyin.';
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Randevuyu onayla'; $('hataYazi').textContent = HATA.ag; });
  };

  // ------------------------------------------------ onay
  function onayGoster(c) {
    sayfaKapat();
    var g = d.bilgi.gunler.filter(function (x) { return x.tarih === c.tarih; })[0];
    var p = tarihParca(c.tarih);
    $('onayGun').textContent = GUN_U[g.gun] + '.';
    var satirlar = [['Hizmet', c.hizmet + ' · ' + kacis(d.hizmet.sure) + ' dk'], ['Zaman', p.g + ' ' + AYLAR[p.a - 1] + ' · ' + saatGoster(c.bas)]];
    if (c.adres) satirlar.push(['Adres', c.adres]);
    if (c.telefon) satirlar.push(['İptal için', '<a href="tel:' + kacis(c.telefon.replace(/\s/g, '')) + '" style="color:inherit">' + kacis(c.telefon) + '</a>']);
    $('bilet').innerHTML = satirlar.map(function (s) { return '<p><span>' + s[0] + '</span>' + (s[0] === 'İptal için' ? s[1] : kacis(s[1])) + '</p>'; }).join('');
    $('takvim').onclick = function () { takvimeEkle(c); };
    $('secim').hidden = true; $('cta').hidden = true; $('onay').hidden = false;
    window.scrollTo(0, 0);
  }

  // RFC 5545 metin kaçışı: önce ters bölü, sonra ; ve , ; satır sonları (CRLF tek, kalan CR/LF ayrı) iki karakterli \n olur
  function icsKacis(t) {
    return String(t === undefined || t === null ? '' : t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n/g, '\n').replace(/[\r\n]/g, '\\n');
  }
  function icsYap(c, dukkan) {
    var z = function (t, s) { return t.replace(/-/g, '') + 'T' + s.replace(':', '') + '00'; };
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Randevu//TR', 'BEGIN:VEVENT', 'UID:' + icsKacis(c.id) + '@randevu',
      'DTSTART;TZID=Europe/Istanbul:' + z(c.tarih, c.bas), 'DTEND;TZID=Europe/Istanbul:' + z(c.tarih, c.bit),
      'SUMMARY:' + icsKacis(dukkan || 'Berber') + ' · ' + icsKacis(c.hizmet), c.adres ? 'LOCATION:' + icsKacis(c.adres) : '', 'END:VEVENT', 'END:VCALENDAR']
      .filter(Boolean).join('\r\n');
  }
  // Telefonda kişi bilgisi en çok 7 gün (7x24 saatten BÜYÜKSE geçersiz; zamansız eski kayıt geçersiz)
  var KISI_OMUR = 7 * 24 * 3600 * 1000;
  function kisiOku(ham, simdi) {
    try {
      var k = JSON.parse(ham || 'null');
      if (!k || typeof k.zaman !== 'number' || simdi - k.zaman > KISI_OMUR || k.zaman > simdi) return null;
      return k;
    } catch (x) { return null; }
  }
  function takvimeEkle(c) {
    var ics = icsYap(c, d.bilgi.dukkan);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'randevu.ics'; a.click();
  }

  $('yeni').onclick = function (e) {
    e.preventDefault();
    d.saat = null; $('onay').hidden = true; $('secim').hidden = false; $('cta').hidden = false;
    ctaCiz(); saatleriYukle();
  };


  // ------------------------------------------------ ASİSTAN BALONU (ayar.js'de ASISTAN_API tanımlıysa görünür)
  // Randevu balonun KENDİ sohbetinde alınır (akış sunucuda yürür, akis nesnesi burada tutulur); siteye yönlendirme yok.
  var AS = window.ASISTAN_API, ASISTAN = typeof AS === 'string';
  var AY_K = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var HIZLI = ['Fiyatlar', 'Adres', 'Çalışma saatleri'];
  var bl = { acildi: false, aktif: false, telefon: '', son: '', anlasilmayan: '', akis: null, gorulen: {}, rozet: 0, oturum: '' };
  function blNorm(t) { return String(t).toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  // oturum kimliği: tarayıcıda saklanır (localStorage yoksa sayfa ömrü boyunca bellekte); ustanın cevabı bununla müşteriye ulaşır
  function blOturumUret() {
    var o = '';
    try { o = localStorage.getItem('lonca_oturum') || ''; } catch (x) {}
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(o)) {
      o = '';
      try { var u = new Uint8Array(12); crypto.getRandomValues(u); for (var i = 0; i < u.length; i++) o += ('0' + u[i].toString(16)).slice(-2); } catch (x) {}
      if (!o) return '';
      try { localStorage.setItem('lonca_oturum', o); } catch (x) {}
    }
    return o;
  }
  function blGorulenOku() { try { var g = JSON.parse(localStorage.getItem('lonca_gorulen') || '{}'); return g && typeof g === 'object' ? g : {}; } catch (x) { return {}; } }
  function blGorulenYaz() { try { var k = Object.keys(bl.gorulen); if (k.length > 200) { var y = {}; k.slice(-100).forEach(function (a) { y[a] = 1; }); bl.gorulen = y; } localStorage.setItem('lonca_gorulen', JSON.stringify(bl.gorulen)); } catch (x) {} }
  // Müşteri geçmişi YALNIZ bu tarayıcıda (localStorage) durur; sunucuya GİTMEZ. 7 gün / 30 mesaj sınırı (mantik.js gecmisKirp ile aynı kural).
  function gecmisKirp(liste, simdiMs) {
    if (!Array.isArray(liste) || typeof simdiMs !== 'number' || !isFinite(simdiMs)) return [];
    var y = [];
    for (var i = 0; i < liste.length; i++) {
      var x = liste[i];
      if (!x || typeof x !== 'object' || typeof x.t !== 'string' || (x.k !== 'm' && x.k !== 'a')) continue;
      if (typeof x.z !== 'number' || !isFinite(x.z) || simdiMs - x.z > 7 * 24 * 3600 * 1000) continue;
      y.push({ k: x.k, t: x.t, z: x.z });
    }
    return y.length > 30 ? y.slice(y.length - 30) : y;
  }
  function blGecmisOku() {
    try { var g = JSON.parse(localStorage.getItem('lonca_balon_gecmis') || 'null'); return gecmisKirp(g && g.v === 1 ? g.m : [], Date.now()); } catch (x) { return []; }
  }
  function blGecmisKaydet(k, t) {
    try {
      var l = blGecmisOku(); l.push({ k: k, t: String(t), z: Date.now() });
      var kayit = { v: 1, m: gecmisKirp(l, Date.now()) };
      localStorage.setItem('lonca_balon_gecmis', JSON.stringify(kayit));
    } catch (x) {}
  }
  var BL_BILGI = 'Hizmeti iyileştirmek için sorularınız adınız ve telefonunuz olmadan kaydedilir.';
  function blBilgiGoster() {
    var var_ = false;
    try { var_ = !!localStorage.getItem('lonca_balon_bilgi'); } catch (x) {}
    if (var_) return;
    var bn = el('div', 'balon-not'); bn.textContent = BL_BILGI; $('blSohbet').appendChild(bn);
    try { localStorage.setItem('lonca_balon_bilgi', '1'); } catch (x) {}
  }
  function blIstek(yol, govde) {
    // Apps Script'te yol (/musteri/mesaj) YOKTUR: tek adres, gövdede islem adı (asistan_musteri_mesaj); GET sorgusu da gövdeye girer (E bulgusu 15.11)
    if (/script.google/.test(AS)) {
      var q = yol.split('?'), b = {};
      (q[1] || '').split('&').forEach(function (p) { if (p) { var kv = p.split('='); b[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); } });
      Object.keys(govde || {}).forEach(function (k) { b[k] = govde[k]; });
      b.islem = 'asistan_' + q[0].slice(1).replace(/[/-]/g, '_');
      // F1: balon randevusu da formla aynı tarayıcı izi sınırından geçer (sunucu yeniden özetler; ham değer saklanmaz)
      return (typeof izOzet === 'function' ? izOzet() : Promise.resolve('')).then(function (oz) {
        if (typeof izKimlik === 'function') { b.iz_kimlik = izKimlik(); b.iz_ozet = oz; }
        return fetch(AS, { method: 'POST', body: JSON.stringify(b) }); // basit istek (ön uçuşsuz): başlık yok
      }).then(function (r) { return r.json(); });
    }
    var o = govde === undefined ? {} : { method: 'POST', body: JSON.stringify(govde) };
    if (govde !== undefined) o.headers = { 'Content-Type': 'application/json' }; // yerel sunucu JSON ister (G10)
    return fetch(AS + yol, o).then(function (r) { return r.json(); });
  }
  function blTelefon() {
    var t = (bl.telefon || ($('tel') && $('tel').value) || '').replace(/\D/g, '');
    return /^(90)?0?5\d{9}$/.test(t) ? t : '';
  }
  function blBaloncuk(sinif, metin, gecmisten) {
    var e = el('div', 'blm ' + sinif); e.textContent = metin; $('blSohbet').appendChild(e); $('blSohbet').scrollTop = 1e9;
    if (!gecmisten) blGecmisKaydet(sinif === 'ben' ? 'm' : 'a', metin);
  }
  function blRozetCiz() { var r = $('blRozet'); r.textContent = bl.rozet > 9 ? '9+' : String(bl.rozet); r.hidden = !bl.rozet; }
  function blAc() {
    $('blp').classList.add('ac'); $('bln').hidden = true;
    bl.rozet = 0; blRozetCiz();
    if (!bl.acildi) {
      bl.acildi = true;
      var gc = blGecmisOku();
      gc.forEach(function (x) { blBaloncuk(x.k === 'm' ? 'ben' : 'asi', x.t, true); }); // geçmiş geri çizilir, yeniden kaydedilmez
      bl.ilkSus = gc.length > 0; // geçmiş varsa ilk selamlama balonu tekrar çizilmez
      blBilgiGoster();
      blGonderMetin('merhaba', true);
    }
    blGelen();
  }
  function blKapat() { $('blp').classList.remove('ac'); $('bln').hidden = false; document.activeElement && document.activeElement.blur(); }
  // düğme etiketi: eski biçim "YYYY-AA-GG SS:DD Hizmet" okunur yazılır
  function blEtiket(x) { return String(x).replace(/^(\d{4})-(\d{2})-(\d{2}) /, function (m, y, a, g) { return (+g) + ' ' + AY_K[+a - 1] + ' '; }); }
  // düğmeler: cevapta varsa onlar (akış adımlarında yalnız adımın düğmeleri); yoksa altta küçük hafif öneriler
  function blDugmeCiz(liste, akisVar) {
    var kap = $('blDugme'); kap.innerHTML = '';
    var l = (liste || []).slice();
    var oner = !l.length && !akisVar;
    kap.className = 'bld' + (oner ? ' oner' : '');
    if (oner) l = HIZLI.slice();
    l.forEach(function (x) {
      var b = el('button', '', kacis(blEtiket(x)));
      b.type = 'button';
      b.onclick = function () { blGonderMetin(x); };
      kap.appendChild(b);
    });
    $('blSohbet').scrollTop = 1e9; // düğmeler sohbet alanını daraltır; son mesaj görünür kalsın
  }
  function blGonderMetin(m, sessiz, baslat) {
    bl.son = m;
    if (!sessiz) blBaloncuk('ben', m);
    if (!bl.aktif) { bl.aktif = true; try { localStorage.setItem('lonca_aktif', '1'); } catch (x) {} }
    $('blGonder').disabled = true;
    var g = { metin: m, telefon: blTelefon(), oturum: bl.oturum };
    if (baslat) g.baslat = true; else if (bl.akis) g.akis = bl.akis;
    if (blNorm(m) === 'ustaya sor') g.soru = bl.anlasilmayan;
    blIstek('/musteri/mesaj', g).then(function (r) {
      $('blGonder').disabled = false;
      var yazi = r.metin || r.hata || 'Cevap alınamadı.';
      var sus = bl.ilkSus && m === 'merhaba'; bl.ilkSus = false;
      if (!sus) blBaloncuk('asi', yazi);
      bl.akis = r.akis || null;
      if (r.anlasilmadi) bl.anlasilmayan = m;
      if (r.telefon) bl.telefon = r.telefon;
      $('blGiris').placeholder = bl.akis ? 'Yanıtınızı yazın…' : 'Sorunuzu yazın…';
      blDugmeCiz(r.dugmeler, !!bl.akis);
      $('blTelKutu').hidden = !(!bl.akis && /telefon numaranızı/.test(yazi) && !blTelefon());
      if (!$('blTelKutu').hidden) setTimeout(function () { $('blTel').focus(); }, 50);
    }).catch(function () { $('blGonder').disabled = false; blBaloncuk('asi', 'Bağlantı kurulamadı. Biraz sonra tekrar deneyin.'); });
  }
  // ustanın cevabı ve randevu kararları: oturum (ve varsa telefon) ile sorulur; görülen mesaj kimlikleri hatırlanır
  function blGelen() {
    if (!bl.aktif) return;
    var t = blTelefon();
    blIstek('/musteri/gelen?oturum=' + encodeURIComponent(bl.oturum)).then(function (r) {
      var acik = $('blp').classList.contains('ac'), yeni = 0;
      (r.mesajlar || []).forEach(function (m) {
        if (bl.gorulen[m.id]) return;
        bl.gorulen[m.id] = 1; yeni++;
        blBaloncuk('asi', (m.tur === 'cevap' ? 'Ustanın cevabı: ' : '') + m.metin);
        if (m.dugmeler && m.dugmeler.length) { bl.akis = null; blDugmeCiz(m.dugmeler, false); }
      });
      if (yeni) { blGorulenYaz(); if (!acik) { bl.rozet += yeni; blRozetCiz(); } }
    }).catch(function () {});
  }
  // balon açıkken 10 sn, kapalıyken 30 sn'de bir
  function blYokla() {
    if (document.visibilityState !== 'hidden') blGelen();
    setTimeout(blYokla, $('blp').classList.contains('ac') ? 10000 : 30000);
  }
  if (ASISTAN && !(bl.oturum = blOturumUret())) {
    // G4: güvenli rastgele sayı yoksa balon çalışmaz; sade uyarı verilir
    $('bln').hidden = false;
    $('bln').onclick = function () { alert('Bu tarayıcıda sohbet açılamıyor. Randevu için lütfen formu kullanın.'); };
  } else if (ASISTAN) {
    bl.gorulen = blGorulenOku();
    try { bl.aktif = localStorage.getItem('lonca_aktif') === '1'; } catch (x) {}
    $('bln').hidden = false;
    $('bln').onclick = blAc;
    $('blKapat').onclick = blKapat;
    $('blRandevu').onclick = function () { blGonderMetin('Randevu al', false, true); };
    $('blForm').onsubmit = function (e) {
      e.preventDefault();
      var m = $('blGiris').value.trim(); if (!m) return;
      $('blGiris').value = ''; blGonderMetin(m);
    };
    $('blTel').onchange = function () {
      var t = $('blTel').value.replace(/\D/g, '');
      if (!/^(90)?0?5\d{9}$/.test(t)) { blBaloncuk('asi', 'Telefonu 05xx xxx xx xx biçiminde yazın.'); return; }
      bl.telefon = t; $('blTelKutu').hidden = true;
      if (bl.son && !bl.akis) blGonderMetin(bl.son, true);
    };
    setTimeout(blYokla, 3000);
    try { var kk = kisiOku(localStorage.getItem('randevu_kisi'), Date.now()); if (kk && kk.tel) bl.telefon = kk.tel; } catch (x) {}
    // Yalnız deneme: ekran görüntüsü için #balon ile balonu aç
    if (DENEME && location.hash === '#balon') { var s2 = document.createElement('style'); s2.textContent = '*{transition:none!important}'; document.head.appendChild(s2); blAc(); }
  }

  // ------------------------------------------------ KVKK bandı (C4; kurucu onaylı metin 14.11, değiştirilebilir tek sabit)
  var KVKK_METIN = 'Randevu için adınızı ve telefonunuzu, sohbet balonunda yazdıklarınızı yalnızca randevunuzu yönetmek ve sorunuzu cevaplamak için kullanıyoruz. Kötüye kullanımı önlemek için cihazınızın tanımlayıcı olmayan bir özeti tutulur. Randevu bilgileri {GUN} gün sonra silinir; kimseyle paylaşılmaz. Sorularınız için dükkânı arayabilirsiniz.';
  var kvkkGun = 30, kvkkOturumdaTamam = false;   // gün sayısı tablodaki sakla_gun'dan gelir (bilgi.saklaGun); okunamazsa varsayılan 30
  function kvkkMetni() { return KVKK_METIN.replace('{GUN}', String(kvkkGun)); }
  // bantta ilk cümle; "Ayrıntı"ya dokununca tam metin AYNEN açılır (kurucu kararı 15.11, b seçeneği)
  function kvkkOzet() { var m = kvkkMetni(), i = m.indexOf('. '); return i < 0 ? m : m.slice(0, i + 1); }
  var kvkkAcik = false;
  function kvkkTamamMi() { if (kvkkOturumdaTamam) return true; try { return localStorage.getItem('kvkk_tamam') === '1'; } catch (x) { return false; } }
  function kvkkYukseklik() { try { var b = $('kvkk'); if (!b) return; document.body.classList.toggle('kvkk-var', !b.hidden); document.body.style.setProperty('--kvkk-h', b.hidden ? '0px' : (b.offsetHeight || 0) + 'px'); } catch (x) {} }
  function kvkkYaz() {
    $('kvkkMetin').textContent = kvkkAcik ? kvkkMetni() : kvkkOzet();
    if ($('kvkkAyrinti')) { $('kvkkAyrinti').textContent = kvkkAcik ? 'Kapat' : 'Ayrıntı'; $('kvkkAyrinti').setAttribute('aria-expanded', kvkkAcik ? 'true' : 'false'); }
  }
  function kvkkGunYaz(g) { g = Number(g); if (g >= 1 && g <= 3650) { kvkkGun = Math.floor(g); kvkkYaz(); kvkkYukseklik(); } }
  function kvkkCiz() {
    var b = $('kvkk'); if (!b) return;
    kvkkYaz();
    b.hidden = kvkkTamamMi();
    kvkkYukseklik();
  }
  if ($('kvkkAyrinti')) $('kvkkAyrinti').onclick = function () { kvkkAcik = !kvkkAcik; kvkkYaz(); kvkkYukseklik(); };
  if ($('kvkkTamam')) $('kvkkTamam').onclick = function () {
    kvkkOturumdaTamam = true;   // yazılamayan tarayıcıda da bu oturum boyunca gizli
    try { localStorage.setItem('kvkk_tamam', '1'); } catch (x) {}
    kvkkCiz();
  };
  if (window.addEventListener) window.addEventListener('resize', kvkkYukseklik);

  // ------------------------------------------------ açılış
  if (DENEME) $('deneme').hidden = false;
  kvkkCiz();
  try { var k = kisiOku(localStorage.getItem('randevu_kisi'), Date.now()); if (k) { $('ad').value = k.ad || ''; $('tel').value = k.tel || ''; } else localStorage.removeItem('randevu_kisi'); } catch (x) {}
  if (AYAR_YOK) {
    document.body.innerHTML = '<p style="padding:48px 24px;text-align:center;font-size:16px">Randevu sistemi şu an açılamıyor. Lütfen dükkânı arayın.</p>';
  } else get({ islem: 'bilgi' }).then(function (c) {
    if (!c.ok) throw new Error(c.hata);
    d.bilgi = c;
    kvkkGunYaz(c.saklaGun);
    document.title = (c.dukkan ? c.dukkan + ' · ' : '') + 'Randevu al';
    $('dukkan').textContent = c.dukkan || ''; $('blDukkan').textContent = c.dukkan || '';
    var r = $('rozet'); r.hidden = false;
    r.className = 'rozet' + (c.simdiAcik ? ' acik' : ''); r.textContent = c.simdiAcik ? '● Şu an açık' : '● Şu an kapalı';
    d.hizmet = c.hizmetler[0] || null;
    var ilk = c.gunler.filter(function (g) { return g.acik; })[0];
    d.tarih = ilk ? ilk.tarih : null;
    hizmetleriCiz(); gunleriCiz(); saatleriYukle(); ctaCiz();
    // Yalnız deneme modunda: #sayfa / #onay ile ekranları doğrudan aç (ekran görüntüsü için)
    if (DENEME && /^#(sayfa|onay)$/.test(location.hash)) {
      d.saat = '14:30'; ctaCiz(); $('ad').value = 'Test Müşteri';
      if (location.hash === '#sayfa') { var ss = document.createElement('style'); ss.textContent = '*{transition:none!important}'; document.head.appendChild(ss); sayfaAc(); }
      else onayGoster(sahte.post({ tarih: d.tarih, saat: d.saat, hizmet: d.hizmet.id }));
    }
  }).catch(function () {
    $('saatler').innerHTML = '<p class="bilgi">' + HATA.ag + '</p>';
  });
})();
