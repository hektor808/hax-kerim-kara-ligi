# HAX Kerim Kara League - Web Platformu

![HAX Kerim Kara League](public/img/logo.png) Bu proje, HAX Kerim Kara Haxball Ligi'nin resmi puan durumu, fikstür, istatistikler ve diğer tüm bilgilerini barındıran modern bir web uygulamasıdır.

**Canlı Demo:** [https://hektor808.github.io/hax-kerim-kara-ligi/](https://hektor808.github.io/hax-kerim-kara-ligi/)

---

## ✨ Özellikler

* Tüm sezonlar için dinamik olarak güncellenen **Puan Durumu**.
* Sezon bazında geçmiş ve gelecek maçları gösteren **Fikstür**.
* Gol, asist ve clean sheet krallarını listeleyen **Krallıklar**.
* Güncel takım kadroları, kaptanları ve bütçeleri.
* Eurocup turnuvası fikstürü ve sonuçları.
* İki takım arasında tüm sezonları kapsayan **İkili Rekabet (Head-to-Head)** istatistikleri.
* Takımlar sayfasında canlı arama özelliği.
* Tamamen mobil uyumlu ve modern bir arayüz.

---

## 🛠️ Kullanılan Teknolojiler

* **Vite:** Hızlı ve modern bir geliştirme ortamı ve derleme aracı.
* **Vanilla JavaScript (ES6+):** Projenin temel mantığı için modern JavaScript.
* **Tailwind CSS:** Hızlı ve pratik arayüz geliştirme için.
* **ESLint & Prettier:** Kod kalitesi ve tutarlı formatlama için.
* **Vitest:** Kritik fonksiyonlar için otomatik birim testleri.
* **GitHub Actions & Pages:** Otomatik CI/CD ve ücretsiz hosting için.

---

## 🚀 Yerel Geliştirme Ortamını Kurma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

1.  **Projeyi klonlayın:**
    ```bash
    git clone [https://github.com/hektor808/hax-kerim-kara-ligi.git](https://github.com/hektor808/hax-kerim-kara-ligi.git)
    ```

2.  **Proje dizinine girin:**
    ```bash
    cd hax-kerim-kara-ligi
    ```

3.  **Gerekli paketleri yükleyin:**
    ```bash
    npm install
    ```

4.  **Geliştirme sunucusunu başlatın:**
    ```bash
    npm run dev
    ```
    Bu komuttan sonra proje `http://localhost:5173` gibi bir adreste çalışmaya başlayacaktır.

---

## ✅ Testleri Çalıştırma

Projenin kritik fonksiyonlarının doğru çalıştığını doğrulamak için:

```bash
npm run test