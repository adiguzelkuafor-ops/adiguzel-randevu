// Çerçeve kırıcı (BRIEF-G4c P2): yönetim sayfası başka bir sitenin çerçevesinde açılırsa üst sayfa bu adrese götürülür.
// Sayfa, <style id="cerceve-stil"> ile baştan gizlidir; yalnız en üst pencerede (top === self) gösterilir.
// frame-ancestors meta CSP'de çalışmaz (yalnız HTTP başlığında; GitHub Pages başlık vermez), bu yüzden betik kullanılır.
if (top === self) {
  var gizle = document.getElementById('cerceve-stil');
  if (gizle) gizle.parentNode.removeChild(gizle);
} else {
  top.location = self.location;
}
