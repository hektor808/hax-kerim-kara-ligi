/**
 * Belirtilen lig sezonuna ait verileri JSON dosyasından çeker.
 * @param {string} seasonId - Sezon ID'si ('1', '2', '3').
 * @returns {Promise<Object>} - Sezon verisini içeren promise.
 */
export async function getSeasonData(seasonId) {
    try {
        // BAŞINDAKİ / KALDIRILDI, YERİNE ./ EKLENDİ
        const response = await fetch(`./data/season${seasonId}.json`);
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
        // BAŞINDAKİ / KALDIRILDI, YERİNE ./ EKLENDİ
        const response = await fetch(`./data/eurocup${cupId}.json`);
        if (!response.ok) {
            throw new Error(`Veri dosyası bulunamadı: eurocup${cupId}.json`);
        }
        return await response.json();
    } catch (error) {
        console.error("Eurocup verisi yüklenirken hata:", error);
        return { teams: [], fixtures: [] };
    }
}