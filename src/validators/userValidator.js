// Dosya Yolu: backend/src/validators/userValidator.js

const Joi = require('joi');

/**
 * Kullanıcı güncelleme (kullanıcının kendi yapacağı) işlemi için validasyon şeması.
 * Sadece izin verilen alanları tanımlar ve 'role' gibi bilinmeyen ve hassas alanların
 * isteğe dahil edilmesi durumunda otomatik olarak ayıklanmasını sağlar.
 */
const updateUserSchema = Joi.object({
    // İsim, bir string olmalı, en az 3, en fazla 50 karakter uzunluğunda olabilir.
    name: Joi.string().min(3).max(50),
    
    // E-posta, geçerli bir e-posta formatında olmalıdır.
    email: Joi.string().email()
})
// .min(1) kuralı, istek gövdesinin boş olmamasını, yani en az bir geçerli 
// alanın (name veya email) güncellenmek üzere gönderilmesini zorunlu kılar.
.min(1)
// Hata mesajını daha anlaşılır hale getiriyoruz.
.messages({
    'object.min': 'Güncellenmek için en az bir alan (name veya email) gereklidir.'
});

/**
 * Yeni kullanıcı oluşturma işlemi için validasyon şeması.
 * Tüm gerekli alanların varlığını ve formatını kontrol eder.
 */
const createUserSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
    // Not: 'role' alanı burada kasıtlı olarak yer almaz. 
    // Yeni kullanıcılar her zaman varsayılan 'user' rolü ile oluşturulmalıdır.
});


module.exports = {
    updateUserSchema,
    createUserSchema
};