// src/api.js

/**
 * Belirtilen lig sezonuna ait verileri JSON dosyasından çeker.
 * @param {string} seasonId - Sezon ID'si ('1', '2', '3').
 * @returns {Promise<Object>} - Sezon verisini içeren promise.
 */
export async function getSeasonData(seasonId) {
    try {
        // DÜZELTME: Statik göreceli yol yerine, Vite'ın base URL'ini de içeren dinamik bir yol oluşturuldu.
        // import.meta.env.BASE_URL, vite.config.js'deki 'base' değerini alır ('/hax-kerim-kara-ligi/').
        // Bu sayede istek, hem yerel geliştirme ortamında hem de canlı sunucuda doğru URL'e yapılır.
        const response = await fetch(`${import.meta.env.BASE_URL}data/season${seasonId}.json`);
        if (!response.ok) {
            throw new Error(`Veri dosyası bulunamadı: season${seasonId}.json`);
        }
        return await response.json();
    } catch (error) {
        console.error("Lig verisi yüklenirken hata:", error);
        return { teams: [], fixtures: [], playerStats: [] }; // Hata durumunda boş veri dön
    }
}

/**
 * Belirtilen Eurocup sezonuna ait verileri JSON dosyasından çeker.
 * @param {string} cupId - Kupa ID'si ('24' veya '25').
 * @returns {Promise<Object>} - Kupa verisini içeren promise.
 */
export async function getEurocupData(cupId) {
    try {
        // DÜZELTME: Aynı mantık Eurocup verileri için de uygulandı.
        // Bu, projenin farklı ortamlarda (localhost, GitHub Pages vb.) sorunsuz çalışmasını garanti eder.
        const response = await fetch(`${import.meta.env.BASE_URL}data/eurocup${cupId}.json`);
        if (!response.ok) {
            throw new Error(`Veri dosyası bulunamadı: eurocup${cupId}.json`);
        }
        return await response.json();
    } catch (error) {
        console.error("Eurocup verisi yüklenirken hata:", error);
        return { teams: [], fixtures: [] };
    }
}