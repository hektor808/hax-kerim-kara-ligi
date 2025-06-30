import './style.css';
import { getSeasonData, getEurocupData } from './api.js';
import { findMatchesByTeamNames } from './utils.js';
import { 
    showLoading, // YENİ
    displayStandings, 
    displayFixtures,
    displayEurocupFixtures,
    displayTopStats,
    displayTeams,
    displayBudgets,
    displaySuspendedPlayers,
    displayHeadToHeadResults,
    openPlayerModal,
    closePlayerModal,
    populatePlayerModal
} from './ui.js';

// DEĞİŞTİRİLDİ: AppState artık bir veri önbelleği (cache) olarak kullanılıyor.
const AppState = {
    seasons: {}, // { '1': season1Data, '2': season2Data }
    eurocups: {}, // { '24': eurocup24Data }
    teams: {} // Tüm sezonlardaki takımların H2H için birleşik listesi
};

const DOM = {
    standings: { select: document.getElementById('seasonSelectStandings'), container: document.getElementById('standings-table-body') },
    fixtures: { select: document.getElementById('seasonSelectFixtures'), container: document.getElementById('fixtures-container') },
    kings: { select: document.getElementById('seasonSelectKings'), container: document.getElementById('kralliklar-container'), scorersContainer: document.getElementById('top-scorers'), assistsContainer: document.getElementById('top-assists'), cleanSheetsContainer: document.getElementById('top-cleansheets') },
    eurocup: { select: document.getElementById('seasonSelectEurocup'), container: document.getElementById('eurocup-fixtures-container') },
    teams: { container: document.getElementById('teams-container'), searchInput: document.getElementById('team-search-input') },
    budgets: { container: document.getElementById('budget-container') },
    suspensions: { container: document.getElementById('suspended-players-container') },
    h2h: { team1Select: document.getElementById('h2h-team1-select'), team2Select: document.getElementById('h2h-team2-select'), resultsContainer: document.getElementById('h2h-results-container') },
    modal: { element: document.getElementById('player-modal') },
    navigation: { sections: document.querySelectorAll('.content-section'), navLinks: document.querySelectorAll('.nav-link'), mobileNavLinks: document.querySelectorAll('.nav-link-mobile'), mobileMenu: document.getElementById('mobile-menu'), mobileMenuButton: document.getElementById('mobile-menu-button') }
};

// --- YENİ: URL YARDIMCI FONKSİYONLARI ---
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        season: params.get('season'),
        cup: params.get('cup')
    };
}

function setUrlParams(newParams, replace = false) {
    const url = new URL(window.location);
    const params = replace ? new URLSearchParams() : new URLSearchParams(url.search);

    for (const key in newParams) {
        if (newParams[key]) {
            params.set(key, newParams[key]);
        } else {
            params.delete(key);
        }
    }
    url.search = params.toString();
    window.history.pushState({}, '', url);
}

// --- YENİ: VERİ ÖNBELLEKLEME VE ÇEKME (LAZY-LOADING) ---
async function getCachedSeasonData(seasonId) {
    if (AppState.seasons[seasonId]) {
        return AppState.seasons[seasonId];
    }
    const data = await getSeasonData(seasonId);
    AppState.seasons[seasonId] = data;
    return data;
}

async function getCachedEurocupData(cupId) {
    if (AppState.eurocups[cupId]) {
        return AppState.eurocups[cupId];
    }
    const data = await getEurocupData(cupId);
    AppState.eurocups[cupId] = data;
    return data;
}


// --- DEĞİŞTİRİLDİ: TÜM UPDATE FONKSİYONLARI LAZY LOADING VE LOADING STATE DESTEKLİYOR ---
async function updateStandings() {
    showLoading(DOM.standings.container);
    const seasonId = DOM.standings.select.value;
    setUrlParams({ season: seasonId });
    try {
        const { teams, fixtures } = await getCachedSeasonData(seasonId);
        displayStandings(DOM.standings.container, teams, fixtures);
    } catch (error) {
        renderError(DOM.standings.container, "Puan durumu yüklenemedi.");
    }
}

async function updateFixtures() {
    showLoading(DOM.fixtures.container);
    const seasonId = DOM.fixtures.select.value;
    setUrlParams({ season: seasonId });
    try {
        const { teams, fixtures } = await getCachedSeasonData(seasonId);
        displayFixtures(DOM.fixtures.container, teams, fixtures);
    } catch (error) {
        renderError(DOM.fixtures.container, "Fikstür yüklenemedi.");
    }
}

async function updateKings() {
    showLoading(DOM.kings.scorersContainer);
    showLoading(DOM.kings.assistsContainer);
    showLoading(DOM.kings.cleanSheetsContainer);
    const seasonId = DOM.kings.select.value;
    setUrlParams({ season: seasonId });
    try {
        const { teams, playerStats } = await getCachedSeasonData(seasonId);
        const topScorers = [...playerStats].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
        displayTopStats(DOM.kings.scorersContainer, 'Gol Krallığı', 'text-yellow-400', topScorers, 'goals', teams, seasonId);
        const topAssists = [...playerStats].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
        displayTopStats(DOM.kings.assistsContainer, 'Asist Krallığı', 'text-green-400', topAssists, 'assists', teams, seasonId);
        const topKeepers = [...playerStats].filter(p => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets);
        displayTopStats(DOM.kings.cleanSheetsContainer, 'Clean Sheet', 'text-cyan-400', topKeepers, 'cleanSheets', teams, seasonId);
    } catch (error) {
        renderError(DOM.kings.container, "Krallıklar yüklenemedi.");
    }
}

async function updateEurocup() {
    showLoading(DOM.eurocup.container);
    const cupId = DOM.eurocup.select.value;
    setUrlParams({ cup: cupId }, true); // Sadece cup parametresi kalsın
    try {
        const { teams, fixtures } = await getCachedEurocupData(cupId);
        displayEurocupFixtures(DOM.eurocup.container, teams, fixtures);
    } catch(error) {
        renderError(DOM.eurocup.container, "Eurocup verisi yüklenemedi.");
    }
}

function handlePlayerClick(event) {
    const clickedListItem = event.target.closest('li[data-season-id]');
    if (!clickedListItem) return;
    const { playerName, seasonId } = clickedListItem.dataset;
    const seasonData = AppState.seasons[seasonId];
    if (!seasonData) return;
    const player = seasonData.playerStats.find(p => p.name === playerName);
    if (!player) return;
    const team = seasonData.teams.find(t => t.id === player.teamId);
    populatePlayerModal(player, team);
    openPlayerModal();
    const closeButton = document.getElementById('modal-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', closePlayerModal, { once: true });
    }
}


// --- DEĞİŞTİRİLDİ: NAVİGASYON ARTIK İÇERİK GÜNCELLEMELERİNİ DE TETİKLİYOR ---
function showSection(id) {
    DOM.navigation.sections.forEach(section => section.classList.toggle('active', section.id === id));
    const selector = `.nav-link[href="#${id}"]`;
    DOM.navigation.navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(selector)?.classList.add('active');
    if (!DOM.navigation.mobileMenu.classList.contains('hidden')) DOM.navigation.mobileMenu.classList.add('hidden');

    // Aktif olan bölüme göre ilgili içeriği güncelle
    switch (id) {
        case 'puan': updateStandings(); break;
        case 'fikstur': updateFixtures(); break;
        case 'kralliklar': updateKings(); break;
        case 'eurocup': updateEurocup(); break;
        // Diğer statik sayfalar için güncelleme gerekmez.
    }
}

function handleLinkClick(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href').substring(1);
    const currentParams = new URLSearchParams(window.location.search);
    // Yeni sekmeye geçerken URL parametrelerini koru
    window.history.pushState({}, '', `${e.currentTarget.getAttribute('href')}?${currentParams.toString()}`);
    showSection(targetId);
}

// --- DEĞİŞTİRİLDİ: BAŞLATMA FONKSİYONU ARTIK URL PARAMETRELERİNİ OKUYOR VE SADECE GEREKLİ VERİYİ ÇEKİYOR ---
async function initializeApp() {
    // URL'den başlangıç parametrelerini oku
    const params = getUrlParams();
    const initialSeason = params.season || '3';
    const initialCup = params.cup || '25';

    // Seçim kutularını URL veya varsayılan değerlere ayarla
    DOM.standings.select.value = initialSeason;
    DOM.fixtures.select.value = initialSeason;
    DOM.kings.select.value = initialSeason;
    DOM.eurocup.select.value = initialCup;

    // Sadece H2H için tüm takımları önceden yükle
    const [s1, s2, s3] = await Promise.all([getCachedSeasonData('1'), getCachedSeasonData('2'), getCachedSeasonData('3')]);
    const allTeams = [...s1.teams, ...s2.teams, ...s3.teams];
    const uniqueTeams = Array.from(new Map(allTeams.map(team => [team.name, team])).values()).sort((a,b) => a.name.localeCompare(b.name));
    function populateTeamSelects(selectElement, teams, placeholder) {
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.name;
            option.textContent = team.name;
            selectElement.append(option);
        });
    }
    populateTeamSelects(DOM.h2h.team1Select, uniqueTeams, '1. Takımı Seçin');
    populateTeamSelects(DOM.h2h.team2Select, uniqueTeams, '2. Takımı Seçin');

    // Statik içeriği yükle (Bütçeler, Cezalar vs. varsayılan sezonu kullanır)
    displayTeams(DOM.teams.container, s3.teams);
    displayBudgets(DOM.budgets.container, s3.teams);
    displaySuspendedPlayers(DOM.suspensions.container, s3.teams, s3.playerStats);

    // Olay Dinleyicileri
    DOM.standings.select.addEventListener('change', updateStandings);
    DOM.fixtures.select.addEventListener('change', updateFixtures);
    DOM.kings.select.addEventListener('change', updateKings);
    DOM.eurocup.select.addEventListener('change', updateEurocup);
    DOM.kings.container.addEventListener('click', handlePlayerClick);
    // Diğer dinleyiciler...
    DOM.teams.searchInput.addEventListener('input', () => displayTeams(DOM.teams.container, s3.teams.filter(team => team.name.toLowerCase().includes(DOM.teams.searchInput.value.toLowerCase()))));
    DOM.h2h.team1Select.addEventListener('change', () => findMatchesByTeamNames(DOM.h2h.team1Select.value, DOM.h2h.team2Select.value, AppState.seasons));
    DOM.h2h.team2Select.addEventListener('change', () => findMatchesByTeamNames(DOM.h2h.team1Select.value, DOM.h2h.team2Select.value, AppState.seasons));
    DOM.modal.element.addEventListener('click', (e) => { if (e.target.id === 'player-modal') closePlayerModal(); });
    
    // Navigasyon
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => DOM.navigation.mobileMenu.classList.toggle('hidden'));
    
    // Geri/İleri butonları için
    window.addEventListener('popstate', () => {
        const params = getUrlParams();
        const hash = window.location.hash.substring(1) || 'anasayfa';
        // Dropdownları URL'e göre tekrar senkronize et
        DOM.standings.select.value = params.season || '3';
        DOM.fixtures.select.value = params.season || '3';
        DOM.kings.select.value = params.season || '3';
        DOM.eurocup.select.value = params.cup || '25';
        showSection(hash);
    });
    
    // Başlangıç sayfasını göster
    showSection(window.location.hash.substring(1) || 'anasayfa');
    
    document.getElementById('current-year').textContent = new Date().getFullYear();
    console.log("Uygulama Gelişmiş Modda Başlatıldı: Lazy loading, URL state ve loading göstergeleri aktif.");
}

initializeApp();