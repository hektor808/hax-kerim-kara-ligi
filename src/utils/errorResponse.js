// Dosya Yolu: backend/src/utils/errorResponse.js

/**
 * Proje genelinde tutarlı ve yönetilebilir hatalar oluşturmak için
 * kullanılan özelleştirilmiş hata sınıfı.
 * Standart Error sınıfını, bir statusCode özelliği ekleyerek genişletir.
 * * Kullanım: next(new ErrorResponse('Kullanıcı bulunamadı', 404));
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message); // Üst sınıfın (Error) constructor'ını çağırır
    this.statusCode = statusCode; // Kendi durum kodumuzu ekleriz
  }
}

module.exports = ErrorResponse;