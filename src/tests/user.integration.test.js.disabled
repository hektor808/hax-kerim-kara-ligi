// Dosya Yolu: backend/src/tests/user.integration.test.js

const request = require('supertest');
const app = require('../app'); // Express app'inizin export edildiği ana dosya (app.js veya index.js olabilir)
const pool = require('../config/db'); // Veritabanı bağlantısı
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('User API - Security Tests', () => {

    let testUser;
    let testToken;

    // Her testten önce veritabanını temiz bir duruma getir ve bir test kullanıcısı oluştur
    beforeAll(async () => {
        await pool.query('DELETE FROM users'); // Önceki testlerden kalan kullanıcıları temizle

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        const res = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
            ['Test User', 'test@example.com', hashedPassword, 'user']
        );
        testUser = res.rows[0];

        // Bu kullanıcı için geçerli bir token oluştur
        testToken = jwt.sign({ id: testUser.id, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    // Testler bittikten sonra veritabanı bağlantısını kapat
    afterAll(async () => {
        await pool.end();
    });

    // --- EN KRİTİK TEST ---
    it('should NOT allow a standard user to update their role to "admin"', async () => {
        
        // GIVEN: Standart bir kullanıcı, kendi adını güncellerken isteğe 'role: "admin"' ekler
        const maliciousPayload = {
            name: 'Updated Name by User',
            role: 'admin' // Kötü niyetli deneme
        };

        // WHEN: Kullanıcı, kendi bilgilerini güncellemek için PATCH isteği atar
        const response = await request(app)
            .patch(`/api/users/${testUser.id}`)
            .set('Authorization', `Bearer ${testToken}`)
            .send(maliciousPayload);

        // THEN: API, isteği başarılı olarak kabul etmeli (çünkü 'name' geçerli bir alan)
        expect(response.statusCode).toBe(200);
        // VE dönen yanıtta kullanıcının rolü hala 'user' olmalı
        expect(response.body.role).toBe('user');
        // VE dönen yanıtta isim güncellenmiş olmalı
        expect(response.body.name).toBe('Updated Name by User');

        // AND (En Önemli Doğrulama): Veritabanını doğrudan kontrol et
        const dbCheck = await pool.query('SELECT role FROM users WHERE id = $1', [testUser.id]);
        const userRoleInDb = dbCheck.rows[0].role;
        
        // Veritabanındaki rolün KESİNLİKLE değişmediğini doğrula
        expect(userRoleInDb).toBe('user');
    });

});