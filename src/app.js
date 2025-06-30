// Dosya Yolu: backend/src/app.js

// 1. GEREKLİ MODÜLLERİN YÜKLENMESİ
// ----------------------------------------------------
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Rota tanımlamalarımızı import ediyoruz.
const userRoutes = require('./routes/userRoutes');

// Oluşturduğumuz merkezi hata yönetimi middleware'ini import ediyoruz.
const errorHandler = require('./middleware/errorHandler');


// 2. UYGULAMA KURULUMU
// ----------------------------------------------------
// .env dosyasındaki ortam değişkenlerini yükle (process.env üzerinden erişmek için)
// Bu satır, diğer kodlardan önce çalışmalıdır.
dotenv.config();

// Express uygulamasını başlat
const app = express();

// Port'u ortam değişkenlerinden al, eğer tanımlı değilse 3001 kullan
const PORT = process.env.PORT || 3001;


// 3. TEMEL ARA KATMANLAR (MIDDLEWARES)
// ----------------------------------------------------
// Cross-Origin Resource Sharing (CORS) middleware'ini etkinleştir.
// Bu, frontend (React) uygulamasının backend'e istek atabilmesi için gereklidir.
app.use(cors());

// Gelen JSON formatındaki istek gövdelerini (request bodies) parse etmek için.
app.use(express.json());

// URL-encoded formatındaki verileri parse etmek için (form gönderileri vb.).
app.use(express.urlencoded({ extended: true }));


// 4. BASİT İSTEK LOG'LAMA MIDDLEWARE'İ
// ----------------------------------------------------
// Gelen her isteğin metodunu ve yolunu konsola yazdıran basit bir loglayıcı.
// Debug sürecinde çok yardımcı olur.
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});


// 5. API ROTALARININ TANIMLANMASI
// ----------------------------------------------------
// /api/users ile başlayan tüm istekleri userRoutes dosyasının yönetmesini sağla.
app.use('/api/users', userRoutes);


// 6. 404 (NOT FOUND) HATALARI İÇİN YAKALAYICI
// ----------------------------------------------------
// Yukarıdaki rotalardan hiçbiriyle eşleşmeyen tüm istekler için bu middleware çalışır.
// Bir 404 hatası oluşturup merkezi hata yöneticisine gönderir.
app.all('*', (req, res, next) => {
    const err = new Error(`'${req.originalUrl}' yolu sunucuda bulunamadı.`);
    err.statusCode = 404;
    next(err);
});


// 7. MERKEZİ HATA YÖNETİCİSİ (GLOBAL ERROR HANDLER)
// ----------------------------------------------------
// ÖNEMLİ: Bu middleware, mutlaka ve mutlaka tüm diğer 'app.use()' ve
// rota tanımlamalarından SONRA gelmelidir. Express bu şekilde çalışır.
// Controller'lardan 'next(error)' ile gönderilen tüm hatalar buraya düşer.
app.use(errorHandler);


// 8. SUNUCUNUN BAŞLATILMASI
// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
    console.log(`Ortam (Environment): ${process.env.NODE_ENV || 'development'}`);
});


// 9. DIŞA AKTARMA (TESTLER İÇİN)
// ----------------------------------------------------
// Supertest gibi test kütüphanelerinin uygulamayı import edip
// testleri çalıştırması için bu satır gereklidir.
module.exports = app;