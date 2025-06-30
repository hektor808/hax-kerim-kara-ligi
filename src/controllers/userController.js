// Dosya Yolu: backend/src/controllers/userController.js

const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { updateUserSchema, createUserSchema } = require('../validators/userValidator');

// Tüm kullanıcıları getirir
const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Tüm kullanıcılar getirilirken hata:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// ID'ye göre tek bir kullanıcıyı getirir
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Kullanıcı getirilirken hata:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// Yeni bir kullanıcı oluşturur
const createUser = async (req, res) => {
    try {
        // Gelen veriyi validasyondan geçir
        const { error, value } = createUserSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, password } = value;

        // Şifreyi hash'le
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Yeni kullanıcıyı veritabanına ekle (varsayılan 'user' rolüyle)
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, hashedPassword]
        );

        // Yanıttan şifreyi kaldır
        const { password: _, ...userToReturn } = newUser.rows[0];
        res.status(201).json(userToReturn);

    } catch (error) {
        // E-posta zaten mevcutsa veritabanı unique kısıtlaması hatası verir
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'Bu e-posta adresi zaten kullanılıyor.' });
        }
        console.error('Kullanıcı oluşturulurken hata:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// Mevcut bir kullanıcının bilgilerini günceller
const updateUser = async (req, res) => {
    try {
        // 1. ADIM: Gelen veriyi validasyon şemamızla doğrulama ve temizleme
        const { error, value } = updateUserSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 2. ADIM: Güvenli veriyi ve URL parametresini al
        const { id } = req.params;
        const fieldsToUpdate = value;

        // 3. ADIM: Dinamik ve parametreli SQL sorgusunu oluştur
        const fields = Object.keys(fieldsToUpdate);
        const values = Object.values(fieldsToUpdate);
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

        const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
        
        // 4. ADIM: Sorguyu veritabanında çalıştır
        const result = await pool.query(query, [id, ...values]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // 5. ADIM: Başarılı yanıtı, hassas bilgileri çıkararak döndür
        const { password, ...updatedUser } = result.rows[0];
        res.status(200).json(updatedUser);

    } catch (error) {
        console.error('Kullanıcı güncellenirken hata:', error);
        res.status(500).json({ message: 'Sunucuda beklenmedik bir hata oluştu.' });
    }
};

// Bir kullanıcıyı siler
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        res.status(200).json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
        console.error('Kullanıcı silinirken hata:', error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};


module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};