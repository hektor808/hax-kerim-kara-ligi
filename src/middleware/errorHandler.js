// Dosya Yolu: backend/src/middleware/errorHandler.js

/**
 * Merkezi Hata Yönetimi Middleware'i.
 * Express'te bir route handler'da 'next(error)' çağrıldığında bu fonksiyon tetiklenir.
 * Tüm hataları tek bir yerden yöneterek kod tekrarını önler ve tutarlı yanıtlar sağlar.
 */
const errorHandler = (err, req, res, next) => {
    // Hatanın durum kodunu belirle. Eğer hatada bir statusCode belirtilmemişse,
    // bu bir sunucu hatasıdır, 500 (Internal Server Error) kullan.
    const statusCode = err.statusCode || 500;

    // Hatanın mesajını belirle.
    const message = err.message || 'Sunucuda beklenmedik bir hata oluştu.';

    // Geliştirme ortamındaysak, hatanın tamamını konsola yazdır.
    // Bu, debug için çok önemlidir.
    if (process.env.NODE_ENV !== 'production') {
        console.error('HATA YAKALANDI 💥:', err);
    }

    // Kullanıcıya standart bir formatta hata yanıtı gönder.
    // Production ortamında, güvenlik nedeniyle hatanın teknik detaylarını (stack trace)
    // kullanıcıya asla göndermeyiz. Sadece mesajı göndeririz.
    res.status(statusCode).json({
        success: false,
        statusCode: statusCode,
        message: message,
        // Production'da değilsek, debug için stack trace'i ekleyebiliriz.
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
};

module.exports = errorHandler;