// Dosya Yolu: backend/src/controllers/userController.js

// 1. GEREKLİ MODÜLLERİN YÜKLENMESİ
// ----------------------------------------------------
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const { updateUserSchema, createUserSchema } = require('../validators/userValidator');
const ErrorResponse = require('../utils/errorResponse'); // Özelleştirilmiş Hata Sınıfımız


// 2. CONTROLLER FONKSİYONLARI
// ----------------------------------------------------
// Tüm fonksiyonlar 'express-async-handler' ile sarmalanmıştır.
// Bu yardımcı araç, async fonksiyonlar içindeki hataları otomatik olarak yakalar
// ve 'next(error)' fonksiyonunu çağırarak merkezi hata yöneticimize (errorHandler.js) devreder.
// Bu sayede her fonksiyona try-catch bloğu yazmaktan kurtuluruz.


/**
 * @desc    Tüm kullanıcıları getirir
 * @route   GET /api/users
 * @access  Public (Örnek olarak, normalde Admin olmalı)
 */
const getAllUsers = asyncHandler(async (req, res, next) => {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    
    res.status(200).json({
        success: true,
        count: result.rowCount,
        data: result.rows
    });
});


/**
 * @desc    ID'ye göre tek bir kullanıcıyı getirir
 * @route   GET /api/users/:id
 * @access  Public (Örnek olarak, normalde Admin veya kullanıcı kendisi olmalı)
 */
const getUserById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
        // Kullanıcı bulunamazsa, 404 hatası oluşturup merkezi yöneticiye pasla.
        return next(new ErrorResponse(`ID'si ${id} olan kullanıcı bulunamadı.`, 404));
    }

    res.status(200).json({
        success: true,
        data: result.rows[0]
    });
});


/**
 * @desc    Yeni bir kullanıcı oluşturur
 * @route   POST /api/users
 * @access  Public
 */
const createUser = asyncHandler(async (req, res, next) => {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
        return next(new ErrorResponse(error.details[0].message, 400));
    }

    const { name, email, password } = value;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const newUserResult = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
            [name, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            data: newUserResult.rows[0]
        });
    } catch (dbError) {
        // Veritabanından gelen unique constraint hatasını yakala (e-posta tekrarı)
        if (dbError.code === '23505') {
            return next(new ErrorResponse('Bu e-posta adresi zaten kayıtlı.', 409)); // 409 Conflict
        }
        // Diğer veritabanı hataları için genel hata yöneticisine devret
        return next(dbError);
    }
});


/**
 * @desc    Mevcut bir kullanıcıyı günceller
 * @route   PATCH /api/users/:id
 * @access  Private (Kullanıcının kendisi veya Admin olmalı)
 */
const updateUser = asyncHandler(async (req, res, next) => {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
        return next(new ErrorResponse(error.details[0].message, 400));
    }

    const { id } = req.params;
    const fieldsToUpdate = value;

    const fields = Object.keys(fieldsToUpdate);
    const values = Object.values(fieldsToUpdate);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, name, email, role, created_at`;
    
    const result = await pool.query(query, [id, ...values]);

    if (result.rows.length === 0) {
        return next(new ErrorResponse(`ID'si ${id} olan kullanıcı bulunamadı.`, 404));
    }

    res.status(200).json({
        success: true,
        data: result.rows[0]
    });
});


/**
 * @desc    Bir kullanıcıyı siler
 * @route   DELETE /api/users/:id
 * @access  Private (Admin olmalı)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
        return next(new ErrorResponse(`ID'si ${id} olan kullanıcı bulunamadı.`, 404));
    }

    res.status(200).json({ 
        success: true, 
        message: 'Kullanıcı başarıyla silindi.' 
    });
});


// 3. DIŞA AKTARMA
// ----------------------------------------------------
module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};