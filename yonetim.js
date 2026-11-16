(function () {
  var API = (window.RANDEVU_API || '').trim();
  var DENEME = !API && /[?&]deneme=1(&|$)/.test(location.search);
  var AYAR_YOK = !API && !DENEME;
  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var GUN_K = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  var GUN_U = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  var HATA = { pin: 'PIN yanlış.', oturum: 'Oturum bitti. PIN ile yeniden girin.', pin_kisa: 'PIN çok kısa. Tablo menüsünden (Randevu sistemi → Yönetim PIN\'ini değiştir) en az 6 haneye çıkarın.', kod: 'Kod yanlış. Yeni telefonun ekranındaki 4 haneli kodu yazın.', son_cihaz: 'Bu son onaylı telefon; panelden kaldırılamaz. Tablo menüsünden kaldırabilirsiniz.', cihaz_yeni: 'Bu telefon henüz 24 saatlik değil; başka telefonu kaldıramaz.', kilitli: 'Çok fazla yanlış deneme. Bir süre sonra (15 dakika ile 4 saat) tekrar deneyin.', dolu: 'Bu saatte başka bir randevu var.',
    aralik: 'Başlangıç saati bitişten önce olmalı.', gun_bitti: 'Bugünün çalışma saati bitti.', girdi: 'Bilgileri kontrol edin.', ag: 'Bağlantı kurulamadı.',
    cihaz_cok: 'Onay bekleyen çok fazla telefon var. Tabloda Randevu sistemi → Cihazları göster / kaldır menüsünden temizleyin ya da 24 saat bekleyin.',
    cihaz_cok_saat: 'Bu saat içinde çok fazla yeni telefon denendi. Bir saat sonra tekrar deneyin.',
    cihaz_kaldirildi: 'Bu telefonun yetkisi kaldırıldı. PIN ile yeniden girin.', yogun: 'Sistem şu an yoğun, tekrar deneyin.',
    degisti: 'Kayıt başka biri tarafından değişti, yeniden deneyin.', bulunamadi: 'Kayıt bulunamadı.', sunucu: 'Sunucu hatası, biraz sonra tekrar deneyin.' };
  var $ = function (id) { return document.getElementById(id); };
  var d = { pin: '', tarih: null, gun: null, hizmetler: [], aralik: 30, saatler: null, ekran: 'gunluk', sakla: 30, cihaz: '', jeton: '' };

  // ------------------------------------------------ yardımcılar
  function dk(s) { if (!s) return null; var p = s.split(':'); return +p[0] * 60 + +p[1]; }
  function hh(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  // denetçi DÜŞÜK (2): sunucudan gelen saat innerHTML'e de yazılıyor → kaçışlı (saatte özel karakter olmaz; bozuk/kötü veri metin olarak görünür)
  function goster(s) { return s ? kacis(String(s).replace(':', '.')) : ''; }
  function gunNo(t) { var p = t.split('-'); return (new Date(+p[0], +p[1] - 1, +p[2]).getDay() + 6) % 7; }
  function ekle(t, n) { var p = t.split('-'); var x = new Date(+p[0], +p[1] - 1, +p[2] + n); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function gunYaz(t) { var p = t.split('-'); return +p[2] + ' ' + AYLAR[+p[1] - 1]; }
  function kacis(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fiyatYaz(f) { return f ? (/^\d+$/.test(f) ? f + ' ₺' : f) : ''; }
  function tost(m, kir) { var t = $('tost'); t.textContent = saatNokta(m); t.className = 'tost ac' + (kir ? ' kir' : ''); clearTimeout(tost.z); tost.z = setTimeout(function () { t.className = 'tost' + (kir ? ' kir' : ''); }, 2600); }

  // ------------------------------------------------ istek
  function cihazTarifi() {
    var u = navigator.userAgent || '';
    var os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Macintosh/.test(u) ? 'Mac' : 'Cihaz';
    var br = /Edg\//.test(u) ? 'Edge' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /CriOS|Chrome/.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : 'Tarayıcı';
    return os + ' ' + br;
  }
  function istek(b) {
    var sessiz = b.sessiz; delete b.sessiz;
    b.pin = d.pin; b.jeton = d.jeton; b.cihaz = d.cihaz; b.cihazAd = cihazTarifi();
    if (!sessiz) $('yuk').classList.add('ac');
    var yerel = function () { return new Promise(function (ok) { setTimeout(function () { ok(sahte.isle(JSON.parse(JSON.stringify(b)))); }, 250); }); };
    // deneme modu (RANDEVU_API boş) + ASISTAN_API tanımlı: Günlük sekmesi randevuları asistanın durumundan (GET /durum) alır; ASISTAN_API yoksa eskisi gibi
    var p = DENEME ? ((ASISTAN && b.islem === 'gun') ? asRandevuSenkron().then(yerel) : yerel())
      : fetch(API, { method: 'POST', body: JSON.stringify(b) }).then(function (r) { return r.json(); });
    var t0 = Date.now(); // ölçüm (#213): konsolda ve window.__sureler'de
    function sureYaz() { var ms = (Date.now() - t0); (window.__sureler = window.__sureler || []).push({ islem: b.islem, ms: ms }); try { console.log('[sure] ' + b.islem + ' ' + ms + ' ms'); } catch (x) {} }
    p.then(sureYaz, sureYaz);
    return p.then(function (c) {
      $('yuk').classList.remove('ac');
      if (!c.ok && c.hata === 'cihaz_kaldirildi') { cihazUnut(); cikis(HATA.cihaz_kaldirildi); throw c; }
      if (!c.ok && b.islem !== 'giris' && (c.hata === 'pin' || c.hata === 'oturum' || c.hata === 'pin_kisa' || c.hata === 'kilitli' || c.hata === 'cihaz_bekliyor' || c.hata === 'cihaz_onayi')) { cikis(HATA[c.hata] || 'Yeniden giriş yapın.'); throw c; }
      return c;
    }, function (e) { $('yuk').classList.remove('ac'); if (!sessiz) tost(HATA.ag, true); throw e; });
  }

  // ------------------------------------------------ giriş
  var bekleZaman = null, bekleSayac = 0;
  function onayDur() { if (bekleZaman) { clearInterval(bekleZaman); bekleZaman = null; } }
  function cihazKaydet(k) { d.cihaz = k; try { localStorage.setItem('yonetim_cihaz', k); } catch (x) {} }
  function cihazUnut() { d.cihaz = ''; try { localStorage.removeItem('yonetim_cihaz'); } catch (x) {} }
  function pinEkrani(mesaj) {
    onayDur();
    ['gunluk', 'asistan', 'notlar', 'ayarlar', 'sekme', 'cihazEkran'].forEach(function (x) { $(x).hidden = true; });
    $('sinirSerit').hidden = true; $('pinSerit').hidden = true;
    $('pinEkran').hidden = false; $('pinHata').textContent = mesaj || ''; $('pin').value = ''; $('pinDugme').disabled = false;
  }
  // PIN telefonda saklanmaz (G4b P7): yalnız günlük oturum jetonu durur; eski sürümden kalan kayıtlı PIN silinir
  function jetonUnut() { d.jeton = ''; try { localStorage.removeItem('yonetim_jeton'); localStorage.removeItem('yonetim_pin'); } catch (x) {} }
  function cikis(mesaj) { jetonUnut(); d.pin = ''; pinEkrani(mesaj); }

  // Yeni (onaysız) telefon: kod gösterilir, onaylanana kadar 5 sn'de bir sessizce giriş denenir (en çok 10 dk)
  function cihazBekle(kod) {
    ['gunluk', 'asistan', 'notlar', 'ayarlar', 'sekme', 'pinEkran'].forEach(function (x) { $(x).hidden = true; });
    $('cihazEkran').hidden = false; $('cihazKod').textContent = kod || '----'; $('cihazHata').textContent = '';
    onayDur(); bekleSayac = 0;
    bekleZaman = setInterval(function () {
      if (++bekleSayac > 120) { cikis('Onay süresi doldu. PIN ile yeniden girin.'); return; }
      istek({ islem: 'giris', sessiz: true }).then(function (c) {
        if (c.ok) girisSonucu(c, true);
        else if (c.hata === 'cihaz_bekliyor' || c.hata === 'cihaz_onayi') { if (c.cihaz) cihazKaydet(c.cihaz); $('cihazKod').textContent = c.kod || '----'; }
        else cikis(HATA[c.hata] || 'Giriş yapılamadı.');
      }).catch(function () {});
    }, 5000);
  }
  $('cihazVazgec').onclick = function () { cikis(); };

  // true: panel açıldı
  function girisSonucu(c, otomatik) {
    $('pinDugme').disabled = false;
    if (c.ok) { onayDur(); d.pin = ''; $('pin').value = ''; if (c.jeton) { d.jeton = c.jeton; try { localStorage.setItem('yonetim_jeton', c.jeton); } catch (x) {} } basla(c); return true; }
    if (c.hata === 'cihaz_onayi' || c.hata === 'cihaz_bekliyor') { if (c.cihaz) cihazKaydet(c.cihaz); cihazBekle(c.kod); return false; }
    if (otomatik) { if (c.hata === 'oturum' || c.hata === 'pin') jetonUnut(); pinEkrani(c.hata === 'oturum' ? '' : (HATA[c.hata] || '')); } else $('pinHata').textContent = HATA[c.hata] || 'Giriş yapılamadı.';
    return false;
  }
  $('pinForm').onsubmit = function (e) {
    e.preventDefault();
    d.pin = $('pin').value.trim();
    if (!d.pin) return;
    $('pinDugme').disabled = true;
    istek({ islem: 'giris' }).then(function (c) { girisSonucu(c, false); }).catch(function () { $('pinDugme').disabled = false; });
  };
  $('cikis').onclick = function () { istek({ islem: 'cikis', sessiz: true }).then(function () { cikis(); }, function () { cikis(); }); };

  // Şeritler: sınır uyarısı (her girişte), PIN 6 hane uyarısı (cihaz başına bir kez)
  function seritleriGoster(c) {
    $('sinirSerit').hidden = !c.sinirUyari;
    var goruldu = ''; try { goruldu = localStorage.getItem('pin_uyari') || ''; } catch (x) {}
    $('pinSerit').hidden = !(c.pinKisa && !goruldu);
    if (!$('pinSerit').hidden) { try { localStorage.setItem('pin_uyari', '1'); } catch (x) {} }
  }
  Array.prototype.forEach.call(document.querySelectorAll('.serit button'), function (b) { b.onclick = function () { b.parentNode.hidden = true; }; });

  function basla(c) {
    d.sakla = Math.min(Number(c.saklaGun) || 30, 60);
    d.dukkan = c.dukkan || '';
    Array.prototype.forEach.call(document.querySelectorAll('.dukkanAd'), function (e) { e.textContent = d.dukkan; });
    $('avatar').textContent = d.dukkan.split(/\s+/).filter(Boolean).slice(0, 2).map(function (k) { return k.charAt(0); }).join('').toLocaleUpperCase('tr');
    $('pinEkran').hidden = true; $('cihazEkran').hidden = true; $('sekme').hidden = false;
    seritleriGoster(c);
    sekmeAc('gunluk');
    bildirimGuncelle();
    istek({ islem: 'hizmetler' }).then(function (h) { d.hizmetler = h.hizmetler; d.aralik = h.aralik; });
  }

  // ------------------------------------------------ sekmeler
  Array.prototype.forEach.call(document.querySelectorAll('.sekme button'), function (b) { b.onclick = function () { sekmeAc(b.dataset.s); }; });
  function sekmeAc(s) {
    d.ekran = s;
    ['gunluk', 'asistan', 'notlar', 'ayarlar'].forEach(function (x) { $(x).hidden = x !== s; });
    Array.prototype.forEach.call(document.querySelectorAll('.sekme button'), function (b) { b.classList.toggle('on', b.dataset.s === s); });
    window.scrollTo(0, 0);
    if (s === 'gunluk') { gunYukle(d.tarih); bildirimGuncelle(); }
    if (s === 'ayarlar') { istek({ islem: 'saatler' }).then(saatleriCiz); istek({ islem: 'hizmetler' }).then(hizmetleriCiz); istek({ islem: 'cihazlar' }).then(cihazCiz); }
    // kurucu 12.11: "ayarlara açıp kapamak için ayar koyabiliriz" → açıksa bekleyen soru kartları Asistan ekranında da görünür;
    // kart kutusu tek: açılan sekmeye taşınır (yazılmakta olan cevap taşınırken korunur, iki kopya olmaz)
    if (s === 'asistan' && soruAsistanda()) $('asSoruYeri').appendChild($('asBekleyen'));
    if (s === 'notlar') $('notSoruYeri').appendChild($('asBekleyen'));
    if (s === 'asistan') asistanAc();
    if (s === 'notlar') notlarAc();
  }
  function soruAsistanda() { try { return localStorage.getItem('yonetim_soru_asistanda') === '1'; } catch (x) { return false; } }
  function soruAyarCiz() { $('soruAsistanda').classList.toggle('kapali', !soruAsistanda()); }
  $('soruAsistanda').onclick = function () {
    try { localStorage.setItem('yonetim_soru_asistanda', soruAsistanda() ? '0' : '1'); } catch (x) {}
    soruAyarCiz(); tost(soruAsistanda() ? 'Sorular Asistan ekranında da görünecek' : 'Sorular yalnız Notlar\'da görünecek');
  };
  soruAyarCiz();

  // ------------------------------------------------ GÜNLÜK
  function gunYukle(t) { return istek({ islem: 'gun', tarih: t || '' }).then(gunCiz); }

  function gunCiz(c) {
    if (!c.ok) return;
    d.gun = c; d.tarih = c.tarih; d.aralik = c.aralik;
    var bugun = c.tarih === c.simdi.tarih;
    var gecmis = c.tarih < c.simdi.tarih;
    c.gecmis = gecmis;
    var sdk = c.simdi.dk;
    $('gunBaslik').textContent = bugun ? (sdk < 720 ? 'Günaydın' : (sdk < 1080 ? 'İyi günler' : 'İyi akşamlar')) + (d.dukkan ? ' ' + d.dukkan : '') : (gecmis ? 'Geçmiş · ' : '') + GUN_U[gunNo(c.tarih)];
    $('tarihRozet').textContent = GUN_U[gunNo(c.tarih)] + ', ' + gunYaz(c.tarih);
    $('listeBaslik').textContent = bugun ? 'Bugünün randevuları' : (gecmis ? 'Geçmiş randevular' : GUN_U[gunNo(c.tarih)] + ' randevuları');
    $('listeOzet').textContent = c.randevular.length + ' randevu' + (!gecmis && c.gun.acik ? ' · ' + c.bos.length + ' boş' : '');
    $('ekleSira').hidden = gecmis;
    $('topluSira').hidden = gecmis || !c.randevular.length;
    // gün şeridi: geçmiş (saklanan gün kadar) + bugün + 20 gün ileri
    var kap = $('gunler'); kap.innerHTML = '';
    for (var i = -d.sakla; i < 21; i++) {
      (function (t) {
        var b = document.createElement('button');
        b.className = 'g' + (t === c.tarih ? ' sec' : '') + (t < c.simdi.tarih ? ' eski' : '');
        b.innerHTML = '<small>' + GUN_K[gunNo(t)] + '</small><b>' + +t.split('-')[2] + '</b>';
        b.onclick = function () { gunYukle(t); };
        kap.appendChild(b);
      })(ekle(c.simdi.tarih, i));
    }
    var sec = kap.querySelector('.sec'); if (sec) kap.scrollLeft = sec.offsetLeft - kap.offsetLeft - 18;
    hizliCiz(c, bugun);
    cizelgeCiz(c, bugun);
  }

  function hizliCiz(c, bugun) {
    var kap = $('hizliKutu'); kap.innerHTML = '';
    if (!bugun || !c.gun.acik) return;
    var simdi = c.simdi.dk;
    var aktif = c.kapalilar.filter(function (k) { return k.tumGun || (dk(k.bas) <= simdi && simdi < dk(k.bit)); })[0];
    if (aktif) {
      var div = document.createElement('div'); div.className = 'disarida';
      div.innerHTML = '<div><b>' + (aktif.tumGun ? 'Bugün kapalı' : 'Şu an kapalı · ' + goster(aktif.bit) + '\'e kadar') + '</b><small>Müşteriler bu saatleri göremiyor</small></div><button>Geri döndüm</button>';
      div.querySelector('button').onclick = function () { istek({ islem: 'ac', id: aktif.id }).then(function (r) { gunCiz(r); tost('Açıldı, randevular yeniden alınabilir'); }); };
      kap.appendChild(div); return;
    }
    if (simdi >= dk(c.gun.bit)) return;
    var h = document.createElement('div'); h.className = 'hizli-kapat';
    h.innerHTML = '<p>Dükkândan çıkıyorum <small>· şimdiden itibaren kapat</small></p><div><button data-s="1">1 saat</button><button data-s="2">2 saat</button><button data-s="3">3 saat</button><button data-s="gunsonu">Gün sonu</button></div>';
    Array.prototype.forEach.call(h.querySelectorAll('button'), function (b) {
      b.onclick = function () {
        istek({ islem: 'hizliKapat', saat: b.dataset.s === 'gunsonu' ? 'gunsonu' : +b.dataset.s }).then(function (r) {
          if (!r.ok) { tost(HATA[r.hata] || 'Kapatılamadı', true); return; }
          gunCiz(r); tost('Kapatıldı');
        });
      };
    });
    kap.appendChild(h);
  }

  // zaman çizgisi satırı: solda saat, sağda kart
  function zamanSatiri(saat, gecti, ic) {
    var e = document.createElement('div'); e.className = 'zs';
    var t = document.createElement('div'); t.className = 'zsaat' + (gecti ? ' gecti' : ''); t.textContent = saat;
    e.appendChild(t); e.appendChild(ic); return e;
  }

  function cizelgeCiz(c, bugun) {
    var kap = $('cizelge'); kap.innerHTML = '';
    var tumGun = c.kapalilar.filter(function (k) { return k.tumGun; })[0];
    if (!c.gun.acik || tumGun) {
      kap.innerHTML = '<p class="bos-yazi">' + (tumGun ? 'Bu gün kapatıldı' + (tumGun.not ? ' (' + kacis(tumGun.not) + ')' : '') + '.' : 'Bu gün izin günü.') + '</p>';
      if (tumGun && !c.gecmis) { var b = document.createElement('button'); b.className = 'ikinci-d'; b.style.margin = '0'; b.textContent = 'Günü yeniden aç'; b.onclick = function () { istek({ islem: 'ac', id: tumGun.id }).then(gunCiz); }; kap.appendChild(b); }
      c.randevular.forEach(function (r) { kap.appendChild(randevuSatiri(r, bugun, c, false)); });
      return;
    }
    var ogeler = [];
    c.randevular.forEach(function (r) { ogeler.push({ t: dk(r.bas), tur: 'r', v: r }); });
    c.kapalilar.forEach(function (k) { ogeler.push({ t: dk(k.bas), tur: 'k', v: k }); });
    if (c.gun.araBas) ogeler.push({ t: dk(c.gun.araBas), tur: 'a' });
    c.bos.forEach(function (s) { ogeler.push({ t: dk(s), tur: 'b', v: s }); });
    ogeler.sort(function (a, b) { return a.t - b.t || (a.tur === 'b' ? 1 : -1); });
    if (c.gecmis) ogeler = ogeler.filter(function (o) { return o.tur === 'r'; });
    if (!ogeler.length) { kap.innerHTML = '<p class="bos-yazi">' + (c.gecmis ? 'Bu gün randevu yoktu.' : 'Bu gün için gösterilecek saat yok.') + '</p>'; return; }
    var simdiYazildi = !bugun, siradaVar = false;
    function simdiCiz() { var s = document.createElement('div'); s.className = 'simdi'; s.textContent = 'ŞİMDİ ' + goster(hh(c.simdi.dk)); kap.appendChild(s); simdiYazildi = true; }
    ogeler.forEach(function (o) {
      if (!simdiYazildi && o.t > c.simdi.dk) simdiCiz();
      if (o.tur === 'r') {
        var sira = bugun && !siradaVar && dk(o.v.bit) > c.simdi.dk;
        if (sira) siradaVar = true;
        kap.appendChild(randevuSatiri(o.v, bugun, c, sira)); return;
      }
      var ic = document.createElement('div');
      if (o.tur === 'k') {
        ic.className = 'kapali-blok';
        ic.innerHTML = '<div><b>Kapalı · ' + goster(o.v.bas) + '–' + goster(o.v.bit) + '</b>' + (o.v.not ? '<p>' + kacis(o.v.not) + '</p>' : '') + '</div><button class="mini am" type="button">Aç</button>';
        ic.querySelector('button').onclick = function () { istek({ islem: 'ac', id: o.v.id }).then(function (r) { gunCiz(r); tost('Açıldı'); }); };
        kap.appendChild(zamanSatiri(goster(o.v.bas), false, ic));
      } else if (o.tur === 'a') {
        ic.className = 'bos'; ic.textContent = 'Öğle arası · ' + goster(c.gun.araBit) + '\'e kadar';
        kap.appendChild(zamanSatiri(goster(c.gun.araBas), false, ic));
      } else {
        ic = document.createElement('button'); ic.type = 'button'; ic.className = 'bos';
        ic.innerHTML = 'Boş · ' + c.aralik + ' dk <b>+ Ekle</b>';
        ic.onclick = function () { randevuEkleAc(o.v); };
        kap.appendChild(zamanSatiri(goster(o.v), false, ic));
      }
    });
    if (!simdiYazildi) simdiCiz();
  }

  function randevuSatiri(r, bugun, c, sira) {
    var gecti = bugun && dk(r.bit) <= c.simdi.dk;
    var e = document.createElement('button'); e.type = 'button';
    e.className = 'rk' + (gecti ? ' gecti' : '');
    e.innerHTML = '<div><div class="ad">' + kacis(r.ad) + '</div><div class="ne">' + kacis(r.hizmet) + ' · ' + (dk(r.bit) - dk(r.bas)) + ' dk</div></div>' + (gecti ? '<div class="sag">Bitti</div>' : (sira ? '<div class="sag">Sırada</div>' : ''));
    e.onclick = function () { randevuDetay(r, c.gecmis); };
    return zamanSatiri(goster(r.bas), gecti, e);
  }

  function randevuDetay(r, gecmis) {
    sayfaAc('<h2>' + kacis(r.ad) + '</h2><div class="bilgi-kart">' +
      '<p><span>Hizmet</span>' + kacis(r.hizmet) + '</p><p><span>Zaman</span>' + gunYaz(d.tarih) + ' · ' + goster(r.bas) + '–' + goster(r.bit) + '</p>' +
      (r.telefon ? '<p><span>Telefon</span><a href="tel:' + kacis(r.telefon) + '">' + kacis(r.telefon) + '</a></p>' : '') + '</div>' +
      (r.telefon ? '<a class="ikinci-d" style="display:block;text-align:center;text-decoration:none;color:inherit" href="tel:' + kacis(r.telefon) + '">Ara</a>' : '') +
      (gecmis ? '' : '<button class="tehlike-d" id="iptalD">Randevuyu iptal et</button>'));
    if (!gecmis) $('iptalD').onclick = function () {
      if (!confirm(r.ad + ' · ' + goster(r.bas) + ' randevusu iptal edilsin mi?')) return;
      istek({ islem: 'iptal', id: r.id }).then(function (c) { sayfaKapat(); gunCiz(c); tost('Randevu iptal edildi'); });
    };
  }

  // Saat kapat yaprağı: mevcut alanlar (başlangıç, bitiş, not) + 'kapat' / 'bütün günü kapat' işlemleri; hazır seçenekler yalnız alanları doldurur
  $('aralikKapatD').onclick = function () {
    var c = d.gun;
    var gBas = c.gun.bas || '09:00', gBit = c.gun.bit || '20:00';
    var oneri = c.tarih === c.simdi.tarih ? Math.ceil(c.simdi.dk / 30) * 30 : (dk(c.gun.bas) || 540);
    sayfaAc('<h2>Saat kapat</h2><p class="alt">Bu saatlerde müşteriler randevu alamaz. · ' + GUN_U[gunNo(c.tarih)] + ', ' + gunYaz(c.tarih) + '</p>' +
      '<div class="bolum"><small>Hazır seçenekler</small><div class="cipler" id="kCipler"><button class="cip" type="button" data-h="ogle">Öğle arası</button><button class="cip" type="button" data-h="kalan">Günün kalanı</button><button class="cip" type="button" data-h="tum">Bütün gün</button></div></div>' +
      '<div class="bolum"><small>Saat aralığı</small><div class="saatler"><label class="saat-kutu"><small>Başlangıç</small><input type="time" id="kBas" value="' + hh(Math.min(oneri, 1380)) + '"></label><label class="saat-kutu"><small>Bitiş</small><input type="time" id="kBit" value="' + hh(Math.min(oneri + 120, 1439)) + '"></label></div><div class="cubuk" id="kCubuk"></div></div>' +
      '<label>Not (isteğe bağlı)</label><input id="kNot" maxlength="60" placeholder="örn. dışarıdayım">' +
      '<div class="uyari-satir" id="kUyari" hidden><svg class="ik" viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4M12 17v.01"/></svg><span id="kUyariMetin"></span></div>' +
      '<div class="hata" id="kHata"></div><button class="btn buyuk" id="kKaydet" type="button">Kapat</button>' +
      '<button class="ikinci-d" id="kTum">Bütün günü kapat</button>');
    function guncelle() {
      var mn = dk(c.gun.bas), mx = dk(c.gun.bit);
      if (mn === null || mx === null || mx <= mn) { mn = 540; mx = 1200; }
      var b = dk($('kBas').value), e = dk($('kBit').value), ok = b !== null && e !== null && e > b, cak = [];
      var yz = function (m) { return Math.max(0, Math.min(100, (m - mn) / (mx - mn) * 100)); };
      var h = '<div class="yol"></div>';
      if (ok) h += '<div class="secili" style="left:' + yz(b) + '%;width:' + (yz(e) - yz(b)) + '%"></div>';
      c.randevular.forEach(function (r) {
        var cakisir = ok && dk(r.bas) < e && dk(r.bit) > b;
        if (cakisir) cak.push(r);
        h += '<span class="rnd' + (cakisir ? ' cakisan' : '') + '" style="left:' + yz(dk(r.bas)) + '%"></span>';
      });
      h += '<div class="olcek"><span>' + goster(hh(mn)) + '</span><span>' + goster(hh(Math.round((mn + mx) / 60) * 30)) + '</span><span>' + goster(hh(mx)) + '</span></div>';
      $('kCubuk').innerHTML = h;
      $('kUyari').hidden = !cak.length;
      $('kUyariMetin').textContent = 'Bu aralıkta ' + cak.length + ' randevu var: ' + cak.map(function (r) { return r.ad + ' ' + goster(r.bas); }).join(', ') + '.';
      $('kKaydet').textContent = ok ? goster(hh(b)) + '–' + goster(hh(e)) + ' kapat' : 'Kapat';
    }
    function cipSifirla() { Array.prototype.forEach.call($('kCipler').children, function (x) { x.classList.remove('on'); }); }
    Array.prototype.forEach.call($('kCipler').children, function (b) {
      b.onclick = function () {
        var h = b.dataset.h;
        if (h === 'ogle') { $('kBas').value = c.gun.araBas || '12:00'; $('kBit').value = c.gun.araBit || '13:00'; }
        else if (h === 'kalan') { $('kBas').value = hh(Math.min(oneri, 1439)); $('kBit').value = gBit; }
        else { $('kBas').value = gBas; $('kBit').value = gBit; }
        cipSifirla(); b.classList.add('on'); guncelle();
      };
    });
    $('kBas').oninput = $('kBit').oninput = function () { cipSifirla(); guncelle(); };
    guncelle();
    $('kKaydet').onclick = function () {
      istek({ islem: 'kapat', tarih: c.tarih, bas: $('kBas').value, bit: $('kBit').value, not: $('kNot').value }).then(function (r) {
        if (!r.ok) { $('kHata').textContent = HATA[r.hata] || 'Kapatılamadı.'; return; }
        sayfaKapat(); gunCiz(r); tost('Kapatıldı');
      });
    };
    $('kTum').onclick = function () {
      istek({ islem: 'kapat', tarih: c.tarih, not: $('kNot').value }).then(function (r) { sayfaKapat(); gunCiz(r); tost('Gün kapatıldı'); });
    };
  };

  function randevuEkleAc(saat) {
    var c = d.gun;
    var sec = d.hizmetler.filter(function (h) { return h.aktif; }).map(function (h) { return '<option value="' + kacis(h.id) + '">' + kacis(h.ad) + ' · ' + kacis(h.sure) + ' dk</option>'; }).join('');
    sayfaAc('<h2>Randevu ekle</h2><p class="alt">Telefonla ya da dükkânda alınan randevu · ' + gunYaz(c.tarih) + '</p>' +
      '<label>Hizmet</label><select id="rHizmet">' + sec + '</select>' +
      '<label>Saat</label><input type="time" id="rSaat" value="' + kacis(saat || c.bos[0] || '10:00') + '">' +
      '<label>Ad</label><input id="rAd" maxlength="60" placeholder="Müşterinin adı">' +
      '<label>Telefon (isteğe bağlı)</label><input id="rTel" type="tel" inputmode="tel" placeholder="05xx xxx xx xx">' +
      '<div class="hata" id="rHata"></div><button class="ana-d" id="rKaydet">Ekle</button>');
    $('rKaydet').onclick = function () {
      istek({ islem: 'randevuEkle', tarih: c.tarih, hizmet: $('rHizmet').value, saat: $('rSaat').value, ad: $('rAd').value, telefon: $('rTel').value }).then(function (r) {
        if (!r.ok) { $('rHata').textContent = HATA[r.hata] || 'Eklenemedi.'; return; }
        sayfaKapat(); gunCiz(r); tost('Randevu eklendi');
      });
    };
  }
  $('randevuEkleD').onclick = function () { randevuEkleAc(''); };

  // ------------------------------------------------ SAATLER
  function saatleriCiz(c) {
    d.saatler = c.saatler;
    var kap = $('haftaListe'); kap.innerHTML = '';
    c.saatler.forEach(function (s, i) {
      var e = document.createElement('div');
      e.className = 'gun-satir tek' + (s.acik ? '' : ' izin');
      e.innerHTML = '<b>' + kacis(s.gun) + '</b>' +
        (s.acik ? '<div class="alt-s"><input type="time" value="' + kacis(s.bas) + '"><span>–</span><input type="time" value="' + kacis(s.bit) + '"></div>' : '<span class="izin-yazi">İzin günü</span>') +
        '<button class="anah' + (s.acik ? '' : ' kapali') + '" aria-label="aç/kapat"></button>';
      e.querySelector('.anah').onclick = function () { saatleriTopla(); d.saatler[i].acik = !d.saatler[i].acik; saatleriCiz({ saatler: d.saatler, kapaliGunler: c.kapaliGunler }); };
      kap.appendChild(e);
    });
    var ara = c.saatler.filter(function (s) { return s.ara_bas; })[0];
    $('araBas').value = ara ? ara.ara_bas : ''; $('araBit').value = ara ? ara.ara_bit : '';
    var kg = $('kapaliGunler'); kg.innerHTML = '';
    if (!c.kapaliGunler || !c.kapaliGunler.length) kg.innerHTML = '<p class="aciklama" style="padding:0 2px">Kapalı gün yok.</p>';
    (c.kapaliGunler || []).forEach(function (k) {
      var e = document.createElement('div'); e.className = 'satir kirmizi';
      e.innerHTML = '<span>' + GUN_U[gunNo(k.tarih)] + ', ' + gunYaz(k.tarih) + (k.not ? ' · ' + kacis(k.not) : '') + '</span><button class="mini">Sil</button>';
      e.querySelector('button').onclick = function () { istek({ islem: 'ac', id: k.id }).then(function () { istek({ islem: 'saatler' }).then(saatleriCiz); tost('Gün yeniden açıldı'); }); };
      kg.appendChild(e);
    });
  }
  function saatleriTopla() {
    Array.prototype.forEach.call($('haftaListe').children, function (e, i) {
      var t = e.querySelectorAll('input[type=time]');
      if (t.length) { d.saatler[i].bas = t[0].value; d.saatler[i].bit = t[1].value; }
    });
  }
  $('araSil').onclick = function () { $('araBas').value = ''; $('araBit').value = ''; };
  $('saatKaydet').onclick = function () {
    saatleriTopla();
    var ab = $('araBas').value, ae = $('araBit').value;
    var liste = d.saatler.map(function (s) { return { gun: s.gun, acik: s.acik, bas: s.bas, bit: s.bit, ara_bas: ab, ara_bit: ae }; });
    istek({ islem: 'saatlerKaydet', saatler: liste }).then(function (c) {
      saatleriCiz(c);
      if (c.hatalar && c.hatalar.length) tost(c.hatalar.join(', ') + ': açılış saati kapanıştan önce olmalı', true);
      else tost('Kaydedildi');
    });
  };
  $('gunKapatD').onclick = function () {
    var yarin = ekle((d.gun && d.gun.simdi.tarih) || new Date().toISOString().slice(0, 10), 1);
    sayfaAc('<h2>Gün kapat</h2><label>Tarih</label><input type="date" id="gTarih" value="' + yarin + '"><label>Not (isteğe bağlı)</label><input id="gNot" maxlength="60" placeholder="örn. bayram, izin">' +
      '<div class="hata" id="gHata"></div><button class="ana-d" id="gKaydet">Günü kapat</button>');
    $('gKaydet').onclick = function () {
      istek({ islem: 'kapat', tarih: $('gTarih').value, not: $('gNot').value }).then(function (r) {
        if (!r.ok) { $('gHata').textContent = 'Tarih geçersiz.'; return; }
        sayfaKapat(); istek({ islem: 'saatler' }).then(saatleriCiz); tost('Gün kapatıldı');
      });
    };
  };

  // ------------------------------------------------ HİZMETLER
  function hizmetleriCiz(c) {
    d.hizmetler = c.hizmetler; d.aralik = c.aralik;
    var kap = $('hizmetListe'); kap.innerHTML = '';
    c.hizmetler.forEach(function (h) {
      var e = document.createElement('button'); e.className = 'hz' + (h.aktif ? '' : ' pasif');
      e.innerHTML = '<div class="ik">' + kacis(h.ad.charAt(0).toLocaleUpperCase('tr')) + '</div><div class="i"><b>' + kacis(h.ad) + '</b><small>' + kacis(h.sure) + ' dk' + (h.aktif ? '' : ' · gizli') + '</small></div><div class="f">' + kacis(fiyatYaz(h.fiyat)) + '</div>';
      e.onclick = function () { hizmetDuzenle(h); };
      kap.appendChild(e);
    });
    var ak = $('araliklar'); ak.innerHTML = '';
    [15, 20, 30, 45, 60].forEach(function (a) {
      var b = document.createElement('button'); b.className = 'cip' + (a === c.aralik ? ' sec' : ''); b.textContent = a + ' dk';
      b.onclick = function () { istek({ islem: 'aralikKaydet', aralik: a }).then(function (r) { hizmetleriCiz(r); tost('Randevu aralığı ' + a + ' dk'); }); };
      ak.appendChild(b);
    });
  }
  function hizmetDuzenle(h) {
    h = h || { ad: '', sure: 30, fiyat: '', aktif: true };
    sayfaAc('<h2>' + (h.id ? 'Hizmeti düzenle' : 'Yeni hizmet') + '</h2>' +
      '<label>Hizmet adı</label><input id="hAd" maxlength="40" value="' + kacis(h.ad) + '" placeholder="örn. Saç + sakal">' +
      '<div class="iki"><div><label>Süre (dk)</label><input id="hSure" type="number" inputmode="numeric" min="5" max="480" step="5" value="' + kacis(h.sure) + '"></div>' +
      '<div><label>Fiyat (₺)</label><input id="hFiyat" inputmode="numeric" maxlength="20" value="' + kacis(h.fiyat) + '"></div></div>' +
      (h.id ? '<div class="satir" style="margin-top:14px"><span>Müşteriye göster</span><button class="anah' + (h.aktif ? '' : ' kapali') + '" id="hAktif"></button></div>' : '') +
      '<div class="hata" id="hHata"></div><button class="ana-d" id="hKaydet">Kaydet</button>');
    var aktif = h.aktif;
    if (h.id) $('hAktif').onclick = function () { aktif = !aktif; this.classList.toggle('kapali', !aktif); };
    $('hKaydet').onclick = function () {
      istek({ islem: 'hizmetKaydet', hizmet: { id: h.id, ad: $('hAd').value, sure: +$('hSure').value, fiyat: $('hFiyat').value.trim(), aktif: aktif } }).then(function (r) {
        if (!r.ok) { $('hHata').textContent = 'Ad en az 2 harf, süre 5-480 dk olmalı.'; return; }
        sayfaKapat(); hizmetleriCiz(r); tost('Kaydedildi');
      });
    };
  }
  $('hizmetEkleD').onclick = function () { hizmetDuzenle(null); };

  // ------------------------------------------------ alt kart
  function sayfaAc(html) { $('sayfaIc').innerHTML = html; $('perde').classList.add('ac'); $('sayfa').classList.add('ac'); }
  function sayfaKapat() { $('perde').classList.remove('ac'); $('sayfa').classList.remove('ac'); }
  $('perde').onclick = sayfaKapat;

  // ------------------------------------------------ toplu iptal (sahte randevu seli)
  $('topluIptalD').onclick = function () {
    if (!d.gun) return;
    var t = d.tarih;
    if (!window.confirm(gunYaz(t) + ' günündeki ÇEVRİMİÇİ alınan tüm randevular iptal edilsin mi?\n\nSizin telefonla eklediğiniz randevular kalır. Bu işlem geri alınamaz.')) return;
    istek({ islem: 'topluIptal', tarih: t }).then(function (r) {
      if (!r.ok) { tost(HATA[r.hata] || 'İptal edilemedi', true); return; }
      $('sinirSerit').hidden = true; gunCiz(r); tost(r.iptalSayisi + ' çevrimiçi randevu iptal edildi');
    }).catch(function () {});
  };

  // ------------------------------------------------ cihazlar (Ayarlar sekmesi)
  function cihazCiz(c) {
    var kap = $('cihazListe'); kap.innerHTML = '';
    if (!c || !c.ok) return;
    (c.cihazlar || []).forEach(function (x) {
      var satir = document.createElement('div'); satir.className = 'cihaz-satir';
      var sol = document.createElement('div');
      sol.textContent = x.ad + (x.bu ? ' (bu telefon)' : '');
      var alt = document.createElement('small');
      alt.textContent = x.durum === 'onayli' ? 'onaylı' + (x.sonGorulme ? ' · son: ' + x.sonGorulme : '') : 'onay bekliyor';
      sol.appendChild(alt); satir.appendChild(sol);
      var dug = document.createElement('div'); dug.className = 'dugmeler';
      if (x.durum === 'bekliyor') {
        var o = document.createElement('button'); o.className = 'mini'; o.textContent = 'Onayla';
        o.onclick = function () { var kod = (window.prompt('Yeni telefonun ekranındaki 4 haneli kodu yazın:') || '').trim(); if (!/^\d{4}$/.test(kod)) { if (kod) tost(HATA.kod, true); return; } istek({ islem: 'cihazOnayla', id: x.id, kod: kod }).then(function (r) { if (r.ok) cihazCiz(r); else tost(HATA[r.hata] || 'Onaylanamadı', true); }).catch(function () {}); };
        dug.appendChild(o);
      }
      var k = document.createElement('button'); k.className = 'mini'; k.textContent = 'Kaldır';
      k.onclick = function () {
        if (!window.confirm(x.ad + (x.bu ? ' (bu telefon)' : '') + ' kaldırılsın mı?' + (x.bu ? '\n\nBu telefonun yönetim yetkisi biter; yeniden onay gerekir.' : ''))) return;
        istek({ islem: 'cihazKaldir', id: x.id }).then(function (r) { if (r.ok) cihazCiz(r); else tost(HATA[r.hata] || 'Kaldırılamadı', true); }).catch(function () {});
      };
      dug.appendChild(k); satir.appendChild(dug); kap.appendChild(satir);
    });
  }

  // ------------------------------------------------ DENEME arka kapısı (yalnız RANDEVU_API boşken)
  var sahte = (function () {
    var simdiD = new Date(); var bugun = simdiD.getFullYear() + '-' + ('0' + (simdiD.getMonth() + 1)).slice(-2) + '-' + ('0' + simdiD.getDate()).slice(-2);
    var simdiDk = Math.max(600, Math.min(simdiD.getHours() * 60 + simdiD.getMinutes(), 1080));
    if (/[?&]saat=(\d{2}:\d{2})/.test(location.search)) simdiDk = dk(RegExp.$1);
    var no = 0; function id() { return 'd' + (++no); }
    var v = {
      hizmetler: [{ id: 'sac', ad: 'Saç', sure: 30, fiyat: '400', aktif: true }, { id: 'sakal', ad: 'Sakal', sure: 20, fiyat: '200', aktif: true }, { id: 'sac-sakal', ad: 'Saç + sakal', sure: 45, fiyat: '550', aktif: true }],
      saatler: GUN_U.map(function (g, i) { return { gun: g, acik: i !== 6, bas: '09:00', bit: '20:00', ara_bas: '12:00', ara_bit: '13:00' }; }),
      randevular: [
        { id: id(), tarih: bugun, bas: '09:00', bit: '09:30', hizmet: 'Saç', ad: 'Mehmet K.', telefon: '05320000001' },
        { id: id(), tarih: bugun, bas: '11:00', bit: '11:20', hizmet: 'Sakal', ad: 'Can D.', telefon: '05320000002' },
        { id: id(), tarih: bugun, bas: '14:00', bit: '14:30', hizmet: 'Saç', ad: 'Emre Y.', telefon: '' },
        { id: id(), tarih: ekle(bugun, 1), bas: '10:00', bit: '10:30', hizmet: 'Saç', ad: 'Ali T.', telefon: '05320000003' },
        { id: id(), tarih: ekle(bugun, -1), bas: '15:00', bit: '15:30', hizmet: 'Saç', ad: 'Burak S.', telefon: '05320000004' },
        { id: id(), tarih: ekle(bugun, -1), bas: '17:30', bit: '17:50', hizmet: 'Sakal', ad: 'Mehmet K.', telefon: '05320000001' }],
      kapali: [], aralik: 30
    };
    function gunAyar(t) { var s = v.saatler[gunNo(t)]; return { acik: s.acik, bas: s.bas, bit: s.bit, araBas: s.ara_bas, araBit: s.ara_bit }; }
    function gun(t) {
      var g = gunAyar(t), r = v.randevular.filter(function (x) { return x.tarih === t; }).sort(function (a, b) { return dk(a.bas) - dk(b.bas); });
      var k = v.kapali.filter(function (x) { return x.tarih === t; }).map(function (x) { return { id: x.id, bas: x.bas || '00:00', bit: x.bit || '24:00', not: x.not, tumGun: !x.bas }; });
      var bos = [];
      if (t >= bugun && g.acik && !k.some(function (x) { return x.tumGun; })) {
        for (var s = dk(g.bas); s + v.aralik <= dk(g.bit); s += v.aralik) {
          if (t === bugun && s < simdiDk) continue;
          var e = s + v.aralik, dolu = [[dk(g.araBas), dk(g.araBit)]].concat(r.map(function (x) { return [dk(x.bas), dk(x.bit)]; }), k.map(function (x) { return [dk(x.bas), dk(x.bit)]; }));
          if (!dolu.some(function (q) { return q[0] !== null && s < q[1] && q[0] < e; })) bos.push(hh(s));
        }
      }
      return { ok: true, tarih: t, simdi: { tarih: bugun, dk: simdiDk }, gun: g, aralik: v.aralik, randevular: r, kapalilar: k, bos: bos };
    }
    return { senkron: function (liste) {
      // asistan randevuları panel biçimine çevrilir; panelden eklenenler ('panel') kalır, eski örnek randevular atılır
      v.randevular = v.randevular.filter(function (x) { return x.kaynak === 'panel'; }).concat((liste || []).filter(function (r) { return r.durum !== 'iptal'; }).map(function (r) {
        return { id: r.id, tarih: r.gun, bas: r.bas, bit: r.bit, hizmet: r.hizmet, ad: r.ad, telefon: r.telefon || '', kaynak: 'asistan' };
      }));
    }, isle: function (b) {
      var pinle = b.pin === '123456'; if (b.jeton === 'demo-jeton') b.pin = '123456';
      if (b.pin !== '123456') return { ok: false, hata: 'pin' };
      switch (b.islem) {
        case 'cikis': return { ok: true };
        case 'giris': return { ok: true, jeton: pinle ? 'demo-jeton' : undefined, dukkan: 'Adıgüzel Kuaför', sinirUyari: /[?&]sinir/.test(location.search) ? 'deneme' : '', pinKisa: /[?&]pinkisa/.test(location.search) };
        case 'gun': return gun(b.tarih || bugun);
        case 'kapat': if (b.bas && dk(b.bas) >= dk(b.bit)) return { ok: false, hata: 'aralik' }; v.kapali.push({ id: id(), tarih: b.tarih, bas: b.bas || '', bit: b.bit || '', not: b.not || '' }); return gun(b.tarih);
        case 'hizliKapat': var bit = b.saat === 'gunsonu' ? gunAyar(bugun).bit : hh(Math.min(Math.floor(simdiDk / 5) * 5 + b.saat * 60, dk(gunAyar(bugun).bit))); v.kapali.push({ id: id(), tarih: bugun, bas: hh(Math.floor(simdiDk / 5) * 5), bit: bit, not: 'hızlı kapatma' }); return gun(bugun);
        case 'ac': var k = v.kapali.filter(function (x) { return x.id === b.id; })[0]; v.kapali = v.kapali.filter(function (x) { return x.id !== b.id; }); return gun(k ? k.tarih : bugun);
        case 'iptal': var r = v.randevular.filter(function (x) { return x.id === b.id; })[0]; v.randevular = v.randevular.filter(function (x) { return x.id !== b.id; }); return gun(r.tarih);
        case 'randevuEkle': var h = v.hizmetler.filter(function (x) { return x.id === b.hizmet; })[0]; var s = dk(b.saat);
          if (v.randevular.some(function (x) { return x.tarih === b.tarih && s < dk(x.bit) && dk(x.bas) < s + h.sure; })) return { ok: false, hata: 'dolu' };
          v.randevular.push({ id: id(), tarih: b.tarih, bas: b.saat, bit: hh(s + h.sure), hizmet: h.ad, ad: b.ad || '(berber ekledi)', telefon: b.telefon, kaynak: 'panel' }); return gun(b.tarih);
        case 'saatler': return { ok: true, saatler: v.saatler, kapaliGunler: v.kapali.filter(function (x) { return !x.bas; }) };
        case 'saatlerKaydet': v.saatler = b.saatler; var c = this.isle({ pin: b.pin, islem: 'saatler' }); c.hatalar = []; return c;
        case 'hizmetler': return { ok: true, aralik: v.aralik, hizmetler: v.hizmetler };
        case 'hizmetKaydet': if (!b.hizmet.ad || b.hizmet.ad.length < 2 || !(b.hizmet.sure >= 5)) return { ok: false, hata: 'girdi' };
          var m = v.hizmetler.filter(function (x) { return x.id === b.hizmet.id; })[0]; if (m) Object.assign(m, b.hizmet); else v.hizmetler.push(Object.assign({ id: id() }, b.hizmet, { aktif: true })); return this.isle({ pin: b.pin, islem: 'hizmetler' });
        case 'aralikKaydet': v.aralik = b.aralik; return this.isle({ pin: b.pin, islem: 'hizmetler' });
        case 'cihazlar': case 'cihazOnayla': case 'cihazKaldir': return { ok: true, cihazlar: [{ id: 'c1', ad: 'Deneme telefonu', durum: 'onayli', sonGorulme: '', kod: '', bu: true }] };
        case 'topluIptal': var say = v.randevular.filter(function (x) { return x.tarih === b.tarih; }).length; v.randevular = v.randevular.filter(function (x) { return x.tarih !== b.tarih; }); var tc = gun(b.tarih); tc.iptalSayisi = say; return tc;
      }
      return { ok: false, hata: 'islem' };
    } };
  })();


  // ------------------------------------------------ ASİSTAN (Lonca Asistan; ayar.js'de ASISTAN_API tanımlıysa görünür)
  var AS = window.ASISTAN_API, ASISTAN = typeof AS === 'string';
  if (!ASISTAN) { $('asDurumYazi').textContent = 'Asistan kurulu değil'; $('soruAyar').hidden = true; }
  if (ASISTAN) $('asSekme').hidden = false;
  // asistan başlığı gerçek durumu gösterir (Madde 3.1): son istek başarılıysa yeşil "Bağlı", başarısızsa gri "Bağlantı yok"
  function asBag(ok) {
    $('asDurum').className = ok ? '' : 'kapali';
    $('asDurumYazi').textContent = ok ? 'Bağlı · müşteri sorularını size getirir' : 'Bağlantı yok · birazdan yeniden denenecek';
  }
  // Apps Script (RANDEVU_API script.google...): uçlar POST {islem:'asistan_<uç>'} (README "Çağrı biçimi"); kimlik (PIN/jeton + cihaz) istek() ile eklenir
  function asAppsIstek(yol, govde, sessiz) { return istek(Object.assign({ islem: 'asistan_' + yol.slice(1).replace(/[\/-]/g, '_'), sessiz: !!sessiz }, govde || {})); }
  // F4: gövdesiz (okuma) çağrı sürerken aynı yol yeniden istenirse aynı söz paylaşılır (Apps Script kilidi çift çağrıyı sıraya dizip süreyi katlıyor)
  var asSuren = {};
  function asIstek(yol, govde) {
    if (govde !== undefined) return asIstekYap(yol, govde);
    // Apps Script'te /durum ve /bildirimler ayrı ayrı turlar yerine TEK 'acilis' çağrısından beslenir (ortak söz; ayrı yol anahtarı)
    if (/script\.google/.test(API) && (yol === '/durum' || yol === '/bildirimler')) {
      if (!asSuren['/acilis']) {
        var pa = asIstekYap('/acilis', undefined), bir = function () { delete asSuren['/acilis']; };
        asSuren['/acilis'] = pa; pa.then(bir, bir);
      }
      return asSuren['/acilis'].then(function (c) { return c && c.ok === false ? c : (yol === '/durum' ? { ok: true, arkaUc: c.arkaUc, durum: c.durum } : { ok: true, bildirimler: c.bildirimler }); });
    }
    if (asSuren[yol]) return asSuren[yol];
    var p = asIstekYap(yol, govde);
    asSuren[yol] = p;
    var birak = function () { delete asSuren[yol]; };
    p.then(birak, birak);
    return p;
  }
  function asIstekYap(yol, govde) {
    if (/script\.google/.test(API)) return asAppsIstek(yol, govde).then(function (c) { asBag(true); return c; }, function (e) { asBag(false); throw e; });
    $('yuk').classList.add('ac');
    var o = govde === undefined ? {} : { method: 'POST', body: JSON.stringify(govde) };
    if (govde !== undefined && !/script.google/.test(AS)) o.headers = { 'Content-Type': 'application/json', 'X-Yonetim': 'yerel-yonetim' }; // yerel sunucu: JSON + berber kimliği (G7, G10); Apps Script'te kimlik PIN + cihaz anahtarıyla gelir
    return fetch(AS + yol, o).then(function (r) { return r.json(); }).then(function (c) { $('yuk').classList.remove('ac'); asBag(true); return c; },
      function (e) { $('yuk').classList.remove('ac'); asBag(false); tost(HATA.ag, true); throw e; });
  }
  // sessiz: bağlantı göstergesine ve toast'a dokunmaz; "olmayabilir" uçlar için (tanışma yoklaması gibi)
  function asSessiz(yol, govde) {
    if (/script\.google/.test(API)) return asAppsIstek(yol, govde, true);
    var o = govde === undefined ? {} : { method: 'POST', body: JSON.stringify(govde), headers: { 'Content-Type': 'application/json', 'X-Yonetim': 'yerel-yonetim' } };
    return fetch(AS + yol, o).then(function (r) { return r.json(); });
  }
  function asRandevuSenkron() {
    return fetch(AS + '/durum').then(function (r) { return r.json(); }).then(function (c) { sahte.senkron((c.durum && c.durum.randevular) || []); }).catch(function () {});
  }
  function asBaloncuk(sinif, metin) {
    var e = document.createElement('div'); e.className = 'as-b ' + sinif; e.textContent = saatNokta(metin); $('asSohbet').appendChild(e);
    $('asSohbet').scrollTop = 1e9; return e;
  }
  // asistanın kendiliğinden yazdığı mesajlar (gece sorusu): sohbet açıksa balon olarak çizilir; açılmamışsa okunmamış kalır
  function asGelen(ciz) {
    if (!ASISTAN || !d.jeton) return;
    if (ciz && !$('asSohbet').childNodes.length) return;
    asSessiz('/berber/gelen').then(function (r) {   // Apps Script'te POST işlemi (çıplak GET CORS'ta düşüyordu)
      if (ciz) (r.mesajlar || []).forEach(function (m) { asBaloncuk('asi', m.metin); });
    }).catch(function () {});
  }
  function asNot(metin) { var e = document.createElement('div'); e.className = 'as-not'; e.textContent = saatNokta(metin); $('asSohbet').appendChild(e); $('asSohbet').scrollTop = 1e9; }
  // sekme rozeti = açık müşteri bildirimleri + bekleyen bilgi önerileri (C1)
  var asBilN = 0, asOneriN = 0;
  function asRozetYaz() { var n = asBilN + asOneriN; $('asSayi').textContent = n; $('asSayi').hidden = !n; }
  function asRozet(n) { asBilN = n; asRozetYaz(); }
  // karar sonrası kartın yerinde 4 sn kalan sade sonuç cümlesi
  // (bildirim kartı testinin kestiği bölümde durur; fonksiyon bildirimi IIFE içinde her yerden erişilir) sunucudan gelen metinlerdeki saatler (09:00) ekranda 09.00 yazılır; veri biçimi (HH:MM) değişmez (Çıra 12.11)
  function saatNokta(m) { return String(m == null ? '' : m).replace(/\b([01]\d|2[0-4]):([0-5]\d)\b/g, '$1.$2'); }
  function asSonucMetni(b, secim, r) {
    var ilet = r.iletildi ? ' Müşteriye bildirildi.' : '';
    if (r.hatalar && r.hatalar.length) return r.hatalar.join(' ') + ilet;
    if (b.tur === 'soru') return 'Cevabınız müşteriye iletildi.' + (r.ogretildi ? ' Balon artık bunu biliyor.' : '');
    if (b.tur === 'randevu_talebi') {
      if (secim === 'Ver') return 'Randevu verildi, müşteriye iletildi.';
      if (secim === 'Verme') return 'Randevu verilmedi, müşteriye iletildi.';
      return 'Müşteriye başka saatler önerildi.';
    }
    if (b.tur === 'iptal_talebi') return secim === 'İptal et' ? 'Randevu iptal edildi, müşteriye iletildi.' : 'Randevu yerinde duruyor, müşteriye iletildi.';
    return 'Gönderildi.';
  }
  function asBekleyenCiz(liste) {
    asRozet(liste.length);
    // denetçi ORTA (SONUC-11): bir kartta cevap/öğret kutusu açıksa yeniden çizme (yazılan cevap silinmesin); yalnız rozet güncellenir
    if ($('asBekleyen').querySelector('.as-satir input:not([type=checkbox])')) return;
    var kap = $('asBekleyen'); kap.innerHTML = '';
    if (!liste.length) { kap.innerHTML = ''; return; }
    liste.forEach(function (b) {
      var k = document.createElement('div'); k.className = 'as-kart';
      k.innerHTML = '<p>' + kacis(saatNokta(b.metin)) + '</p>' + (b.zaman ? '<small>' + kacis(saatNokta(b.zaman)) + '</small>' : '');
      var s = document.createElement('div'); s.className = 'as-satir'; k.appendChild(s);
      var ogret = null;
      function gonder(secim, metin) {
        asIstek('/bildirim/cevap', { id: b.id, secim: secim, metin: metin || '', ogret: !!(ogret && ogret.checked) }).then(function (r) {
          if (r.hatalar && r.hatalar.length && !r.iletildi) { tost(r.hatalar.join(' '), true); return; }
          k.innerHTML = ''; k.className = 'as-kart as-bitti';
          var p = document.createElement('p'); p.className = 'as-sonuc'; p.textContent = saatNokta(asSonucMetni(b, secim, r)); k.appendChild(p);
          asIstek('/bildirimler').then(function (x) { asRozet((x.bildirimler || []).length); }).catch(function () {});
          setTimeout(asYukle, 4000);
        }).catch(function () {});
      }
      (b.dugmeler || []).forEach(function (ad) {
        var d1 = document.createElement('button'); d1.className = 'as-d' + (ad === 'Cevap yaz' ? ' vur' : ''); d1.textContent = ad;
        d1.onclick = function () {
          if (ad !== 'Cevap yaz') { gonder(ad); return; }
          if (k.querySelector('input')) { k.querySelector('input').focus(); return; }
          var gi = document.createElement('input'); gi.placeholder = 'Cevabınız'; gi.autocomplete = 'off';
          var og = document.createElement('label'); og.className = 'as-ogret';
          ogret = document.createElement('input'); ogret.type = 'checkbox'; ogret.checked = true; ogret.id = 'asOgret' + b.id;
          og.appendChild(ogret); og.appendChild(document.createTextNode('Benzer soru gelince balon bu cevabı kendisi versin'));
          var g2 = document.createElement('button'); g2.className = 'as-d vur'; g2.textContent = 'Gönder';
          g2.onclick = function () { if (gi.value.trim()) gonder('Cevap yaz', gi.value.trim()); };
          s.appendChild(gi); s.appendChild(og); s.appendChild(g2); gi.focus();
        };
        s.appendChild(d1);
      });
      kap.appendChild(k);
    });
  }
  function asYukle() { return asIstek('/bildirimler').then(function (r) { var l = r.bildirimler || []; asBekleyenCiz(l); soruKartiCiz(l); notBosGuncelle(); }).catch(function () {}); }
  // ---- C1 + C2: bilgi önerisi kartı ve sabah şeridi (kaynak: GET /durum → durum.bilgi, durum.sabahOzeti, durum.bugun) ----
  var AS_ONERI_ILK = 3, asOneriHepsi = false, asOneriKilit = 0, asOneriSon = null, asSabahKapali = '', asSabahAcik = false, asSonDurum = null;
  // bekleyen öneriler: yeni konu (onerilen) ya da mevcut bilgiye değişiklik önerisi (oneri)
  function asOneriListesi(durum) {
    var o = [];
    ((durum && durum.bilgi) || []).forEach(function (b) {
      if (!b || typeof b.konu !== 'string' || !b.konu) return;
      if (b.onerilen) o.push({ konu: b.konu, yeni: b.deger, eski: null });
      else if (b.oneri && b.oneri.deger != null) o.push({ konu: b.konu, yeni: b.oneri.deger, eski: b.deger });
    });
    return o;
  }
  // sabah şeridi yalnız özetin günü BUGÜN ise (durumun kendi "bugün"ü) ve berber bu cihazda o günü kapatmadıysa görünür
  function asSabahGizliMi(gun) {
    if (asSabahKapali === gun) return true;
    try { return localStorage.getItem('yonetim_sabah_gizli') === gun; } catch (x) { return false; }
  }
  function asSabahGorunur(durum) {
    var o = durum && durum.sabahOzeti;
    return !!(o && typeof o.metin === 'string' && o.metin && o.gun && durum.bugun && o.gun === durum.bugun && !asSabahGizliMi(o.gun));
  }
  function asSabahCiz(durum) {
    var s = $('asSabah'), g = asSabahGorunur(durum);
    s.hidden = !g;
    if (!g) return;
    $('asSabahMetin').textContent = saatNokta(durum.sabahOzeti.metin);
    s.className = 'as-sabah' + (asSabahAcik ? ' acik' : '');
    var p = $('asSabahMetin');
    $('asSabahDevam').hidden = !(asSabahAcik || p.scrollHeight > p.clientHeight + 1 || durum.sabahOzeti.metin.length > 140);
    $('asSabahDevam').textContent = asSabahAcik ? 'daha az' : 'devamı';
  }
  $('asSabahDevam').onclick = function () { asSabahAcik = !asSabahAcik; if (asSonDurum) asSabahCiz(asSonDurum); };
  $('asSabahDuzelt').onclick = function () {
    var g = $('asGiris'); g.value = 'Sabah özetinde düzeltme: '; g.focus();
    try { g.setSelectionRange(g.value.length, g.value.length); } catch (x) {}
  };
  $('asSabahKapat').onclick = function () {
    var gun = asSonDurum && asSonDurum.sabahOzeti && asSonDurum.sabahOzeti.gun;
    if (!gun) return;
    asSabahKapali = gun;   // yazılamasa bile bu açılışta gizli kalır
    try { localStorage.setItem('yonetim_sabah_gizli', gun); } catch (x) {}
    asSabahCiz(asSonDurum);
  };
  function asOneriKarar(k, o, karar) {
    var sonucYaz = function (metin) {
      k.innerHTML = ''; k.className = 'as-kart as-bitti';
      var p = document.createElement('p'); p.className = 'as-sonuc'; p.textContent = metin; k.appendChild(p);
    };
    if (o.karar) return;   // aynı karta ikinci dokunuş (çift tık) ikinci istek yapmaz; düğmeler de hemen kilitlenir
    o.karar = karar; asOneriKilit++;
    Array.prototype.forEach.call(k.querySelectorAll('button'), function (b) { b.disabled = true; });
    asIstek('/berber/bilgi-karari', { konu: o.konu, karar: karar }).then(function (r) {
      if (!r || !r.tamam) {
        asOneriKilit--; o.karar = null;
        Array.prototype.forEach.call(k.querySelectorAll('button'), function (b) { b.disabled = false; });
        tost((r && (r.mesaj || r.hata)) || 'Karar kaydedilemedi.', true); return;
      }
      sonucYaz(karar === 'evet' ? 'Kaydedildi.' : 'Vazgeçildi.');
      setTimeout(function () { k.className = 'as-kart gider'; setTimeout(function () { asOneriKilit--; asDurumYukle(); }, 200); }, 3000);
    }, function () { asOneriKilit--; o.karar = null; Array.prototype.forEach.call(k.querySelectorAll('button'), function (b) { b.disabled = false; }); });
  }
  function asOneriCiz(liste) {
    asOneriN = liste.length; asRozetYaz();
    if (asOneriKilit > 0) return;   // bir karar sürerken (3 sn sonuç yazısı) yeniden çizme
    var kap = $('asOneri'); kap.innerHTML = '';
    var goster = asOneriHepsi ? liste : liste.slice(0, AS_ONERI_ILK);
    goster.forEach(function (o) {
      var k = document.createElement('div'); k.className = 'as-kart';
      var e = document.createElement('small'); e.textContent = 'Asistan öğrenmek istiyor';
      var p = document.createElement('p'); p.textContent = saatNokta(o.konu + ': ' + o.yeni);
      k.appendChild(e); k.appendChild(p);
      if (o.eski != null) { var s = document.createElement('small'); s.className = 'eski'; s.textContent = 'şu an: ' + saatNokta(o.eski); k.appendChild(s); }
      var sat = document.createElement('div'); sat.className = 'as-satir';
      var ev = document.createElement('button'); ev.type = 'button'; ev.className = 'as-d vur'; ev.textContent = 'Evet'; ev.onclick = function () { asOneriKarar(k, o, 'evet'); };
      var ha = document.createElement('button'); ha.type = 'button'; ha.className = 'as-d'; ha.textContent = 'Hayır'; ha.onclick = function () { asOneriKarar(k, o, 'hayir'); };
      sat.appendChild(ev); sat.appendChild(ha); k.appendChild(sat); kap.appendChild(k);
    });
    if (liste.length > AS_ONERI_ILK) {
      var d2 = document.createElement('button'); d2.type = 'button'; d2.className = 'as-daha';
      d2.textContent = asOneriHepsi ? 'daha az göster' : (liste.length - AS_ONERI_ILK) + ' öneri daha';
      d2.onclick = function () { asOneriHepsi = !asOneriHepsi; asOneriCiz(liste); };
      kap.appendChild(d2);
    }
  }
  // F4 (#213): aynı çağrı sürerken ikincisi başlatılmaz (açılışta basla + sekmeAc ikişer kez çağırıyordu; Apps Script kilidi bunları sıraya dizip süreyi katlıyordu)
  var asDurumBekleyen = null, bildirimBekleyen = null;
  function asDurumYukle() {
    if (!ASISTAN) return Promise.resolve();
    if (asDurumBekleyen) return asDurumBekleyen;
    var p = asIstek('/durum').then(function (c) {
      // asistan kapalıysa (ASISTAN_ACIK=0) ya da durum gelmediyse öneri kartı ve sabah şeridi hiç görünmez
      var durum = c && c.durum && !c.hata ? c.durum : null;
      asSonDurum = durum;
      asOneriCiz(durum ? asOneriListesi(durum) : []);
      asSabahCiz(durum);
    }).catch(function () {});
    asDurumBekleyen = p; p.then(function () { asDurumBekleyen = null; });
    return p;
  }
  // bugün ekranındaki müşteri sorusu kartı: ilk açık bildirim; 'Cevapla' cevap kartlarının durduğu Notlar sekmesine götürür
  function soruKartiCiz(liste) {
    var k = $('soruKart'); k.hidden = !liste.length;
    if (!liste.length) return;
    var b = liste[0];
    $('soruBaslik').textContent = (b.tur === 'soru' ? 'Bir müşteri size soruyor' : 'Bir müşteri talebi var') + (b.zaman ? ' · ' + saatNokta(b.zaman) : '') + (liste.length > 1 ? ' · +' + (liste.length - 1) + ' daha' : '');
    $('soruMetin').textContent = saatNokta(b.metin);
  }
  $('soruCevapla').onclick = function () { sekmeAc('notlar'); };
  function bildirimGuncelle() {
    if (!ASISTAN) return Promise.resolve();
    asDurumYukle();   // bekleyen bilgi önerileri de rozete girer (C1)
    if (bildirimBekleyen) return bildirimBekleyen;
    var p = asIstek('/bildirimler').then(function (r) { var l = r.bildirimler || []; asRozet(l.length); soruKartiCiz(l); }).catch(function () {});
    bildirimBekleyen = p; p.then(function () { bildirimBekleyen = null; });
    return p;
  }
  function notBosGuncelle() { $('notBos').hidden = $('asBekleyen').children.length > 0 || $('hatirlatmalar').children.length > 0; }
  // Notlar: yalnız mevcut veri (müşteri soruları + asistanın hatırlatmaları)
  function notlarAc() {
    $('notBos').hidden = true;
    if (!ASISTAN) { $('notBos').hidden = false; return; }
    asYukle();
    asIstek('/durum').then(function (c) {
      var kap = $('hatirlatmalar'); kap.innerHTML = '';
      ((c.durum && c.durum.hatirlatmalar) || []).forEach(function (h) {
        var k = document.createElement('div'); k.className = 'not hat';
        var e = document.createElement('span'); e.className = 'etk'; e.textContent = 'Hatırlatma' + (h.zaman ? ' · ' + saatNokta(h.zaman) : '');
        var p = document.createElement('p'); p.textContent = saatNokta(h.metin);
        k.appendChild(e); k.appendChild(p); kap.appendChild(k);
      });
      notBosGuncelle();
    }).catch(function () {});
  }
  function asOnayKaldir() { var o = $('asOnay'); if (o) o.parentNode.removeChild(o); }
  function asOnayCiz(liste) {
    asOnayKaldir();
    if (!liste || !liste.length) return;
    var k = document.createElement('div'); k.id = 'asOnay'; k.className = 'as-satir'; k.style.alignSelf = 'flex-start';
    liste.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'as-d' + (x.deger === 'evet' ? ' vur' : ''); b.textContent = x.etiket;
      b.onclick = function () {
        asOnayKaldir(); asBaloncuk('ben', x.etiket);
        asIstek('/berber/onay', { deger: x.deger }).then(function (r) {
          asBaloncuk('asi', r.metin || r.hata || 'Cevap alınamadı.');
          if (r.uygulandi) asNot('✓ takvime işlendi');
          asYukle();
        }).catch(function () {});
      };
      k.appendChild(b);
    });
    $('asSohbet').appendChild(k); $('asSohbet').scrollTop = 1e9;
  }
  // ---- C3 TANIŞMA (başlangıç): ilk açılışta asistan saatleri, öğle arasını ve hizmetleri sorar; model yalnız taslak üretir,
  // doğrulama ve Sheets'e yazma sunucudadır (tanisma_taslak / tanisma_kaydet). Burada yalnız konuşma akışı ve özet kartı var.
  var TN_GUN = ['pzt', 'sal', 'car', 'per', 'cum', 'cmt', 'paz'];
  var TN_AD = { pzt: 'Pazartesi', sal: 'Salı', car: 'Çarşamba', per: 'Perşembe', cum: 'Cuma', cmt: 'Cumartesi', paz: 'Pazar' };
  var TN_KISA = { pzt: 'Pzt', sal: 'Sal', car: 'Çar', per: 'Per', cum: 'Cum', cmt: 'Cmt', paz: 'Paz' };
  var TN_BOLUM = ['saat', 'ara', 'hizmet'];
  var TN_ORNEK = {
    saat: 'Hangi günler kaçtan kaça açıksınız? Örnek: hafta içi 9-20, cumartesi 10-18, pazar kapalı',
    ara: 'Öğle arası kaçtan kaça? Yoksa "yok" yazın. Örnek: 12.30-13.30',
    hizmet: 'Hizmetlerinizi süre ve fiyatıyla yazın. Örnek: saç 30 dk 400 TL, sakal 20 dk 200 TL'
  };
  var tn = { aktif: false, bolum: 0, taslak: null, tablo: null, beklenen: null, mesgul: false, yoklandi: false, sonuc: null, ornek: false };
  function tnKopya(x) { return JSON.parse(JSON.stringify(x)); }
  function tnSaatYazi(v) { return v && v.bas ? saatNokta(v.bas) + '-' + saatNokta(v.bit) : 'kapalı'; }
  // ardışık günler aynı saatteyse tek parça: "Pzt-Cum 09.00-20.00, Cmt 10.00-18.00, Paz kapalı"
  function tnSaatOzet(s) {
    var g = [], son = null;
    TN_GUN.forEach(function (k) {
      var t = tnSaatYazi(s && s[k]);
      if (son && son.t === t) son.b = k; else { son = { a: k, b: k, t: t }; g.push(son); }
    });
    return g.map(function (x) { return (x.a === x.b ? TN_KISA[x.a] : TN_KISA[x.a] + '-' + TN_KISA[x.b]) + ' ' + x.t; }).join(', ');
  }
  function tnAraOzet(a) { return a && a.bas ? 'Öğle arası ' + tnSaatYazi(a) : 'Öğle arası yok'; }
  function tnHizmetOzet(h) {
    return (h || []).map(function (x) { return x.ad + ' ' + x.sure + ' dk ' + x.fiyat + ' TL'; }).join(', ') || 'hizmet yok';
  }
  function tnBolumOzeti(b, t) { return b === 'saat' ? tnSaatOzet(t.saatler) : b === 'ara' ? tnAraOzet(t.ara) : tnHizmetOzet(t.hizmetler); }
  function tnBolumAdi(b) { return b === 'saat' ? 'çalışma saatleri' : b === 'ara' ? 'öğle arası' : 'hizmetler'; }
  function tnDugmeler(liste, f) {
    asOnayKaldir();
    var k = document.createElement('div'); k.id = 'asOnay'; k.className = 'as-satir'; k.style.alignSelf = 'flex-start';
    liste.forEach(function (x, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'as-d' + (i === 0 ? ' vur' : ''); b.textContent = x;
      b.onclick = function () { asOnayKaldir(); asBaloncuk('ben', x); f(i === 0); };
      k.appendChild(b);
    });
    $('asSohbet').appendChild(k); $('asSohbet').scrollTop = 1e9;
  }
  function tnYuzey(acik) { var m = $('asistan'); m.className = String(m.className || '').replace(/\s*tn-acik/g, '') + (acik ? ' tn-acik' : ''); }
  function tnBaslik() {
    var e = $('asTanisma'); e.innerHTML = '';
    tnYuzey(tn.aktif);
    if (!tn.aktif) { e.hidden = true; return null; }
    e.hidden = false;
    var s = document.createElement('div'); s.className = 'tn-baslik';
    var y = document.createElement('b'); y.textContent = tn.beklenen === 'ozet' ? 'Tanışma · özet' : 'Tanışma · ' + (tn.bolum + 1) + '/3 ' + tnBolumAdi(TN_BOLUM[tn.bolum] || 'hizmet');
    var b = document.createElement('button'); b.type = 'button'; b.className = 'as-link'; b.textContent = 'Şimdi değil';
    b.onclick = function () { tn.aktif = false; tn.beklenen = null; asOnayKaldir(); tnBaslik(); };
    s.appendChild(y); s.appendChild(b); e.appendChild(s);
    return e;
  }
  function tnBolumSor() {
    var b = TN_BOLUM[tn.bolum];
    tn.ozetGosterildi = false;
    tn.beklenen = tn.ornek ? 'metin' : 'evet-hayir'; tnBaslik();   // (özetten "Baştan sor" ile dönülünce başlık da "1/3"e döner)
    if (tn.ornek) {   // tablodaki kurulum ÖRNEK verisi: "doğru mu?" diye sorulmaz, gerçeği istenir
      asBaloncuk('asi', 'Tabloda ' + tnBolumAdi(b) + ' için kurulumdan kalan örnek veri yazıyor (' + tnBolumOzeti(b, tn.taslak) + '). Gerçeğini yazın. ' + TN_ORNEK[b]);
      return;
    }
    asBaloncuk('asi', 'Tabloda ' + tnBolumAdi(b) + ' şöyle yazıyor: ' + tnBolumOzeti(b, tn.taslak) + '. Doğru mu?');
    tn.beklenen = 'evet-hayir';
    tnDugmeler(['Evet', 'Hayır'], function (evet) {
      if (evet) tnIleri(); else { tn.beklenen = 'metin'; asBaloncuk('asi', TN_ORNEK[b]); }
    });
  }
  function tnIleri() {
    tn.bolum++;
    if (tn.bolum >= TN_BOLUM.length) { tn.beklenen = 'ozet'; asBaloncuk('asi', 'Hepsi tamam. Yukarıdaki özet kartını kontrol edin; bir satıra dokunup düzeltebilirsiniz. Hazırsanız Kaydet\'e basın.'); tnOzetCiz(); return; }
    tnBolumSor();
  }
  // berberin cevabı → model taslak üretir → kod doğrular; geçerliyse "Anladığım: … Doğru mu?"
  function tnCevap(metin) {
    var b = TN_BOLUM[tn.bolum];
    if (tn.mesgul) return;
    tn.mesgul = true; $('asGonder').disabled = true;
    asSessiz('/tanisma/taslak', { bolum: b, metin: metin, taslak: tn.taslak }).then(function (r) {
      tn.mesgul = false; $('asGonder').disabled = false;
      if (r && r.modelsiz) {   // model yok / tavan dolu: elle doldurma
        asBaloncuk('asi', 'Şu an yazıdan anlayamıyorum. Yukarıdaki özet kartından elle doldurabilirsiniz.');
        tn.bolum = TN_BOLUM.length; tn.beklenen = 'ozet'; tnOzetCiz(); return;
      }
      if (!r || r.ok === false || r.anlasilamadi) { asBaloncuk('asi', 'Bunu anlayamadım. ' + TN_ORNEK[b]); return; }
      if (!r.gecerli) { asBaloncuk('asi', ((r.hatalar && r.hatalar[0]) || 'Bunu yazıya geçiremedim.') + ' Tekrar yazar mısınız?'); return; }
      tn.taslak = r.taslak;
      asBaloncuk('asi', 'Anladığım: ' + tnBolumOzeti(b, tn.taslak) + '. Doğru mu?');
      tn.beklenen = 'evet-hayir';
      tnDugmeler(['Evet', 'Hayır'], function (evet) {
        if (evet) tnIleri(); else { tn.beklenen = 'metin'; asBaloncuk('asi', 'Peki, tekrar yazar mısınız? ' + TN_ORNEK[b]); }
      });
    }, function () { tn.mesgul = false; $('asGonder').disabled = false; asBaloncuk('asi', 'Bağlantı kurulamadı, birazdan tekrar deneyin.'); });
  }
  // küçük giriş (dokununca satır yerinde düzenlenir)
  function tnGiris(tip, deger, yer, ek) {
    var g = document.createElement('input'); g.type = tip; g.value = deger == null ? '' : String(deger); if (yer) g.placeholder = yer; g.autocomplete = 'off';
    if (ek) Object.keys(ek).forEach(function (k) { g.setAttribute(k, ek[k]); });
    return g;
  }
  function tnCift(a, b) { var c = document.createElement('div'); c.className = 'tn-cift'; c.appendChild(a); c.appendChild(b); return c; }
  function tnSatir(metin, duzenle) {
    var s = document.createElement('button'); s.type = 'button'; s.className = 'tn-satir'; s.textContent = metin;
    s.onclick = function () { if (!tn.mesgul) duzenle(); };
    return s;
  }
  function tnDuzenKutusu(alt, alanlar, tamam, ekDugme) {
    var k = document.createElement('div'); k.className = 'tn-duzen';
    var et = document.createElement('small'); et.className = 'tn-et'; et.textContent = alt; k.appendChild(et);   // hangi satır düzenleniyor
    alanlar.forEach(function (a) { k.appendChild(a); });
    var sat = document.createElement('div'); sat.className = 'as-satir';
    var t = document.createElement('button'); t.type = 'button'; t.className = 'as-d vur'; t.textContent = 'Tamam';
    t.onclick = function () { tamam(); tn.sonuc = null; tnOzetCiz(); };
    sat.appendChild(t);
    if (ekDugme) { var e = document.createElement('button'); e.type = 'button'; e.className = 'as-d'; e.textContent = ekDugme.ad; e.onclick = function () { ekDugme.f(); tn.sonuc = null; tnOzetCiz(); }; sat.appendChild(e); }
    k.appendChild(sat);
    return k;
  }
  function tnOzetCiz() {
    var e = tnBaslik(); if (!e) return;
    var ilk = tn.beklenen === 'ozet' && !tn.ozetGosterildi; tn.ozetGosterildi = tn.beklenen === 'ozet';
    var kart = document.createElement('div'); kart.className = 'as-kart tn-kart';
    var t = tn.taslak;
    TN_GUN.forEach(function (g) {
      var v = t.saatler && t.saatler[g], satir = tnSatir(TN_AD[g] + ' — ' + tnSaatYazi(v), function () {
        var kapali = document.createElement('label'); kapali.className = 'as-ogret';
        var ck = document.createElement('input'); ck.type = 'checkbox'; ck.checked = !v;
        kapali.appendChild(ck); kapali.appendChild(document.createTextNode('Kapalı'));
        var bas = tnGiris('time', v ? v.bas : '09:00'), bit = tnGiris('time', v ? v.bit : '20:00');
        var kutu = tnDuzenKutusu(TN_AD[g], [kapali, tnCift(bas, bit)], function () { t.saatler[g] = ck.checked ? null : { bas: bas.value, bit: bit.value }; });
        kart.replaceChild(kutu, satir);
      });
      kart.appendChild(satir);
    });
    var araSatir = tnSatir(tnAraOzet(t.ara), function () {
      var yok = document.createElement('label'); yok.className = 'as-ogret';
      var ck = document.createElement('input'); ck.type = 'checkbox'; ck.checked = !t.ara;
      yok.appendChild(ck); yok.appendChild(document.createTextNode('Öğle arası yok'));
      var bas = tnGiris('time', t.ara ? t.ara.bas : '12:30'), bit = tnGiris('time', t.ara ? t.ara.bit : '13:30');
      kart.replaceChild(tnDuzenKutusu('Öğle arası', [yok, tnCift(bas, bit)], function () { t.ara = ck.checked ? null : { bas: bas.value, bit: bit.value }; }), araSatir);
    });
    kart.appendChild(araSatir);
    (t.hizmetler || []).forEach(function (h, i) {
      var satir = tnSatir(h.ad + ' · ' + h.sure + ' dk · ' + h.fiyat + ' TL', function () {
        var ad = tnGiris('text', h.ad, 'Hizmet adı', { maxlength: 40 }), su = tnGiris('text', h.sure, 'Süre (dk)', { inputmode: 'numeric' }), fi = tnGiris('text', h.fiyat, 'Fiyat (TL)', { inputmode: 'decimal' });
        kart.replaceChild(tnDuzenKutusu(h.ad, [ad, tnCift(su, fi)], function () { t.hizmetler[i] = { ad: ad.value, sure: su.value, fiyat: fi.value }; }, { ad: 'Sil', f: function () { t.hizmetler.splice(i, 1); } }), satir);
      });
      kart.appendChild(satir);
    });
    var yeni = tnSatir('+ Hizmet ekle', function () {
      var ad = tnGiris('text', '', 'Hizmet adı', { maxlength: 40 }), su = tnGiris('text', '', 'Süre (dk)', { inputmode: 'numeric' }), fi = tnGiris('text', '', 'Fiyat (TL)', { inputmode: 'decimal' });
      kart.replaceChild(tnDuzenKutusu('Yeni hizmet', [ad, tnCift(su, fi)], function () { t.hizmetler.push({ ad: ad.value, sure: su.value, fiyat: fi.value }); }), yeni);
    });
    kart.appendChild(yeni);
    if (tn.sonuc) { var m = document.createElement('p'); m.className = 'tn-hata'; m.textContent = saatNokta(tn.sonuc); kart.appendChild(m); }
    var alt = document.createElement('div'); alt.className = 'as-satir';
    var kaydet = document.createElement('button'); kaydet.type = 'button'; kaydet.className = 'as-d vur'; kaydet.textContent = 'Kaydet';
    kaydet.onclick = function () { tnKaydet(kaydet); };
    var bastan = document.createElement('button'); bastan.type = 'button'; bastan.className = 'as-d'; bastan.textContent = 'Baştan sor';
    bastan.onclick = function () { if (tn.mesgul) return; tn.bolum = 0; tn.sonuc = null; tn.taslak = tnKopya(tn.tablo); tnBolumSor(); };
    alt.appendChild(kaydet); alt.appendChild(bastan); kart.appendChild(alt);
    e.appendChild(kart);
    if (ilk && e.scrollIntoView) e.scrollIntoView();   // "Yukarıdaki özet kartı": kart ekrana getirilir
  }
  // Kaydet: tek istek; çift dokunuş ikinci istek yapmaz; sunucu reddederse hiçbir şey yazılmamıştır ve hata kartta görünür
  function tnKaydet(dugme) {
    if (tn.mesgul) return;
    tn.mesgul = true; dugme.disabled = true;
    asSessiz('/tanisma/kaydet', { taslak: tn.taslak }).then(function (r) {
      tn.mesgul = false;
      if (r && r.tamam) { tnBitti(r); return; }
      tn.sonuc = (r && r.hatalar && r.hatalar.length) ? r.hatalar.join(' ') : 'Kaydedilemedi. Birazdan tekrar deneyin.';
      tnOzetCiz();
    }, function () { tn.mesgul = false; tn.sonuc = 'Bağlantı kurulamadı; hiçbir şey kaydedilmedi.'; tnOzetCiz(); });
  }
  function tnBitti(r) {
    tn.aktif = false; tn.beklenen = null;
    tnYuzey(false);
    var e = $('asTanisma'); e.innerHTML = ''; e.hidden = false;
    var kart = document.createElement('div'); kart.className = 'as-kart tn-kart';
    var p = document.createElement('p'); p.className = 'as-sonuc'; p.textContent = 'Kaydedildi. Randevu sitesi artık bu saatleri ve fiyatları gösteriyor.';
    var geri = document.createElement('button'); geri.type = 'button'; geri.className = 'as-d'; geri.textContent = 'Eski ayarlara dön';
    geri.onclick = function () {
      geri.disabled = true;
      asSessiz('/tanisma/geri-al', {}).then(function (r) { p.textContent = r && r.tamam ? 'Eski ayarlar geri yüklendi.' : 'Eski ayarlar yüklenemedi.'; geri.hidden = true; }, function () { geri.disabled = false; p.textContent = 'Bağlantı kurulamadı.'; });
    };
    kart.appendChild(p);
    var et = r && r.etkilenen;   // yeni saatlerin dışında kalan, zaten alınmış randevular (silinmedi)
    if (et && et.adet > 0) {
      var u = document.createElement('p'); u.className = 'tn-hata';
      u.textContent = 'Dikkat: ' + et.adet + ' randevu yeni saatlerin dışında kalıyor (' + (et.gunler || []).join(', ') + '). Randevular silinmedi; müşterilerle konuşmanız gerekebilir.';
      kart.appendChild(u);
    }
    kart.appendChild(geri); e.appendChild(kart);
    asBaloncuk('asi', 'Teşekkürler, dükkânınızı tanıdım.');
  }
  function tanismaYokla() {
    if (!ASISTAN || !d.jeton || tn.yoklandi || tn.aktif) return Promise.resolve();
    return asSessiz('/tanisma/durum').then(function (r) {
      if (!r || r.ok === false || r.bitti !== false || !r.tablo) return;   // bitmiş, asistan kapalı ya da uç yok: hiçbir şey görünmez
      tn.yoklandi = true; tn.tablo = r.tablo; tn.ornek = r.ornek === true; tn.taslak = tnKopya(r.tablo); tn.bolum = 0; tn.sonuc = null; tn.aktif = true;
      asBaloncuk('asi', 'Merhaba, ben Lonca Asistan. Önce dükkânınızı tanıyayım; üç kısa soru soracağım.' + (tn.ornek ? ' Tablodaki bilgiler kurulumdan kalan örnek veri görünüyor; gerçeğini sizden öğrenmek istiyorum.' : ''));
      tnBolumSor();
    }, function () {});
  }
  // berberin yazdığı metin tanışma sorusunun cevabıysa true (normal mesaja gitmez); "evet/hayır" yazarsa düğme gibi davranır
  function tnMetinIsle(m) {
    if (!tn.aktif || tn.mesgul || (tn.beklenen !== 'metin' && tn.beklenen !== 'evet-hayir')) return false;
    if (tn.beklenen === 'evet-hayir') {
      var k = String(m).trim().toLowerCase();
      if (/^(evet|doğru|dogru|tamam|e)$/.test(k)) { asOnayKaldir(); tnIleriKisa(true); return true; }
      if (/^(hayır|hayir|yanlış|yanlis|h|değil|degil)$/.test(k)) { asOnayKaldir(); tnIleriKisa(false); return true; }
      asOnayKaldir();
    }
    tn.beklenen = 'metin'; tnCevap(m); return true;
  }
  function tnIleriKisa(evet) {
    var b = TN_BOLUM[tn.bolum];
    if (evet) { if (tn.bolum >= TN_BOLUM.length) return; tnIleri(); } else { tn.beklenen = 'metin'; asBaloncuk('asi', TN_ORNEK[b]); }
  }
  // ---- C3 TANIŞMA (son)
  function asistanAc() {
    if (!ASISTAN) return;
    if (soruAsistanda()) asYukle(); else bildirimGuncelle();
    if (soruAsistanda()) asDurumYukle();   // bildirimGuncelle zaten yükler; ayar açıkken asYukle yolu öneri/şerit için ayrıca
    if (!$('asSohbet').childNodes.length) {
      asIstek('/durum').then(function (c) {
        ((c.durum && c.durum.sonMesajlar) || []).forEach(function (m) { asBaloncuk(m.kim === 'Berber' ? 'ben' : 'asi', m.metin); });
        asGelen(false);
        tanismaYokla();   // C3: geçmiş mesajlar çizildikten SONRA (sıra bozulmasın)
      }).catch(function () {});
    } else { asGelen(true); tanismaYokla(); }
  }
  // öneri çipleri yalnız metni kutuya yazar; göndermek berberin işidir
  Array.prototype.forEach.call($('oneriler').children, function (b) { b.onclick = function () { $('asGiris').value = b.textContent; $('asGiris').focus(); }; });
  $('asForm').onsubmit = function (e) {
    e.preventDefault();
    var m = $('asGiris').value.trim(); if (!m || !ASISTAN) return;
    if (tn.aktif && tnMetinIsle(m)) { $('asGiris').value = ''; asBaloncuk('ben', m); return; }   // C3: tanışma sorusunun cevabı
    $('asGiris').value = ''; asOnayKaldir(); asBaloncuk('ben', m); $('asGonder').disabled = true;
    asIstek('/berber/mesaj', { metin: m }).then(function (r) {
      $('asGonder').disabled = false;
      asBaloncuk('asi', r.metin || r.hata || 'Cevap alınamadı.');
      asOnayCiz(r.dugmeler);
      if (r.uygulandi) asNot('✓ takvime işlendi');
      else if (r.hatalar && r.hatalar.length) asNot('uygulanmadı');
      asYukle();
    }).catch(function () { $('asGonder').disabled = false; });
  };

  // ------------------------------------------------ BİLDİRİM (web push; yalnız kullanıcı dokunuşuyla izin istenir)
  var PUSH_DESTEK = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ANA_EKRAN = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  function b64uBayt(s) {
    var t = (s + '===='.slice(s.length % 4 || 4)).replace(/-/g, '+').replace(/_/g, '/'), r = atob(t), o = new Uint8Array(r.length), i;
    for (i = 0; i < r.length; i++) o[i] = r.charCodeAt(i);
    return o;
  }
  function pushYaz(metin, dugme) { $('pushMetin').textContent = metin; $('pushDugme').hidden = !dugme; }
  function pushDurumuGoster() {
    if (!ASISTAN) return;
    $('pushKart').hidden = false;
    if (IOS && !ANA_EKRAN) { pushYaz('Önce Paylaş → Ana Ekrana Ekle, sonra buradan açın.', false); return; }
    if (!PUSH_DESEK_VAR()) { pushYaz('Bu cihaz bildirimi desteklemiyor.', false); return; }
    if (Notification.permission === 'denied') { pushYaz('Bildirim izni reddedildi. Ayarlar\'dan açabilirsiniz.', false); return; }
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(function (k) { return k.pushManager.getSubscription(); }).then(function (a) {
        if (a) pushYaz('Bildirimler açık: yeni soru ve randevu talepleri telefonunuza düşer.', false);
        else pushYaz('Bildirim izni verildi ama bağlantı kurulmadı.', true);
      }).catch(function () { pushYaz('Bildirimlere izin ver.', true); });
      return;
    }
    pushYaz('Yeni soru ve randevu talebi geldiğinde telefonunuza bildirim düşsün.', true);
  }
  function PUSH_DESEK_VAR() { return PUSH_DESTEK && window.isSecureContext !== false; }
  // Apps Script'te abonelik uçları `asistan_push_anahtar|abone|cik` işlemleridir (PIN + cihaz + jeton istek() ile eklenir); yerelde /push/* uçları
  function pushIstek(yol, govde) {
    if (/script\.google/.test(API)) return istek(Object.assign({ islem: 'asistan_' + yol.slice(1).replace('/', '_') }, govde || {}));
    return asIstek(yol, govde);
  }
  function pushAbonOl() {
    $('pushDugme').disabled = true;
    var sw = navigator.serviceWorker.register('sw.js?api=' + encodeURIComponent(AS));
    // izin yalnız bu dokunuşta istenir
    Notification.requestPermission().then(function (izin) {
      if (izin !== 'granted') { $('pushDugme').disabled = false; pushDurumuGoster(); return; }
      return sw.then(function () { return navigator.serviceWorker.ready; }).then(function (k) {
        return pushIstek('/push/anahtar').then(function (c) {
          return k.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBayt(c.acikAnahtar) });
        });
      }).then(function (a) { return pushIstek('/push/abone', { subscription: a.toJSON() }); }).then(function (r) {
        $('pushDugme').disabled = false;
        if (r && r.tamam) { tost('Bildirimler açıldı'); pushYaz('Bildirimler açık: yeni soru ve randevu talepleri telefonunuza düşer.', false); }
        else { tost('Bildirim bağlantısı kurulamadı', true); pushDurumuGoster(); }
      });
    }).catch(function () { $('pushDugme').disabled = false; tost('Bildirim bağlantısı kurulamadı', true); });
  }
  if (ASISTAN) {
    if (PUSH_DESEK_VAR()) { try { navigator.serviceWorker.register('sw.js?api=' + encodeURIComponent(AS)).then(pushDurumuGoster, pushDurumuGoster); } catch (x) { pushDurumuGoster(); } }
    else pushDurumuGoster();
    $('pushDugme').onclick = pushAbonOl;
  }
  // bekleyen sayısı rozeti: her 30 sn (sayfa görünürken); liste yalnız sekme açıkken çizilir
  setInterval(function () {
    if (!ASISTAN || !d.jeton || document.visibilityState === 'hidden') return;
    asGelen(true);
    if (d.ekran === 'asistan' || d.ekran === 'notlar') asYukle();
    else bildirimGuncelle();
  }, 30000);

  // ------------------------------------------------ açılış
  if (AYAR_YOK) {
    document.body.innerHTML = '<p style="padding:48px 24px;text-align:center;font-size:16px">Ayar dosyası (ayar.js) bulunamadı. Kurulumu kontrol edin.</p>';
    return;
  }
  if (DENEME) $('deneme').hidden = false;
  var kayitli = ''; try { kayitli = localStorage.getItem('yonetim_jeton') || ''; d.cihaz = localStorage.getItem('yonetim_cihaz') || ''; localStorage.removeItem('yonetim_pin'); } catch (x) {}
  if (DENEME && /[?&]oto/.test(location.search)) kayitli = 'demo-jeton';
  if (kayitli) {
    d.jeton = kayitli;
    istek({ islem: 'giris' }).then(function (c) { if (girisSonucu(c, true)) { var m = location.hash.slice(1); if (/^(saatler|hizmetler)$/.test(m)) m = 'ayarlar'; if (/^(ayarlar|asistan|notlar)$/.test(m)) sekmeAc(m); if (DENEME && /[?&]dun/.test(location.search)) setTimeout(function () { gunYukle(ekle(d.gun.simdi.tarih, -1)); }, 400); } }).catch(function () { pinEkrani(); });
  } else pinEkrani();
})();
