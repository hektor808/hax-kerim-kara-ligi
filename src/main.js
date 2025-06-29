import './style.css';
import { getSeasonData, getEurocupData } from './api.js';
import { 
    displayStandings, 
    displayFixtures,
    displayEurocupFixtures,
    displayTopStats,
    displayTeams,
    displayBudgets,
    displaySuspendedPlayers
} from './ui.js';

// --- UYGULAMA DURUMU VE ÖNBELLEK (STATE & CACHE) ---
// Sunucudan çekilen verileri burada saklayarak gereksiz ağ isteklerini önlüyoruz.
const AppState = {
    seasons: {},
    eurocups: {},
};

// --- DOM ELEMENTLERİ ---
// HTML'deki elementlere kolayca erişmek için tek bir merkezi nesne.
const DOM = {
    standings: {
        select: document.getElementById('seasonSelectStandings'),
        container: document.getElementById('standings-table-body'),
    },
    fixtures: {
        select: document.getElementById('seasonSelectFixtures'),
        container: document.getElementById('fixtures-container'),
    },
    kings: {
        select: document.getElementById('seasonSelectKings'),
        scorersContainer: document.getElementById('top-scorers'),
        assistsContainer: document.getElementById('top-assists'),
        cleanSheetsContainer: document.getElementById('top-cleansheets'),
    },
    eurocup: {
        select: document.getElementById('seasonSelectEurocup'),
        container: document.getElementById('eurocup-fixtures-container'),
    },
    teams: {
        container: document.getElementById('teams-container'),
        searchInput: document.getElementById('team-search-input'),
    },
    budgets: {
        container: document.getElementById('budget-container'),
    },
    suspensions: {
        container: document.getElementById('suspended-players-container'),
    },
    navigation: {
        sections: document.querySelectorAll('.content-section'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileNavLinks: document.querySelectorAll('.nav-link-mobile'),
        mobileMenu: document.getElementById('mobile-menu'),
        mobileMenuButton: document.getElementById('mobile-menu-button'),
    }
};

// --- HANDLERS (OLAY YÖNETİCİLERİ) ---

// Dropdown menülerden bir sezon seçildiğinde ilgili bölümü günceller.
async function updateStandings() {
    const seasonId = DOM.standings.select.value;
    if (!AppState.seasons[seasonId]) {
        AppState.seasons[seasonId] = await getSeasonData(seasonId);
    }
    const { teams, fixtures } = AppState.seasons[seasonId];
    displayStandings(DOM.standings.container, teams, fixtures);
}

async function updateFixtures() {
    const seasonId = DOM.fixtures.select.value;
    if (!AppState.seasons[seasonId]) {
        AppState.seasons[seasonId] = await getSeasonData(seasonId);
    }
    const { teams, fixtures } = AppState.seasons[seasonId];
    displayFixtures(DOM.fixtures.container, teams, fixtures);
}

async function updateKings() {
    const seasonId = DOM.kings.select.value;
    if (!AppState.seasons[seasonId]) {
        AppState.seasons[seasonId] = await getSeasonData(seasonId);
    }
    const { teams, playerStats } = AppState.seasons[seasonId];
    displayTopStats(
        DOM.kings.scorersContainer,
        DOM.kings.assistsContainer,
        DOM.kings.cleanSheetsContainer,
        teams,
        playerStats
    );
}

async function updateEurocup() {
    const cupYear = DOM.eurocup.select.value;
    if (!AppState.eurocups[cupYear]) {
        AppState.eurocups[cupYear] = await getEurocupData(cupYear);
    }
    const { teams, fixtures } = AppState.eurocups[cupYear];
    displayEurocupFixtures(DOM.eurocup.container, teams, fixtures);
}

// Takım arama kutusuna yazı yazıldığında takımları filtreler.
function handleTeamSearch() {
    const searchTerm = DOM.teams.searchInput.value.toLowerCase();
    // Arama sadece güncel sezon (Sezon 3) takımları için çalışır.
    const allTeams = AppState.seasons['3']?.teams || [];

    const filteredTeams = allTeams.filter(team => 
        team.name.toLowerCase().includes(searchTerm)
    );

    displayTeams(DOM.teams.container, filteredTeams);
}

// --- NAVİGASYON ---
function showSection(id) {
    DOM.navigation.sections.forEach(section => {
        section.classList.toggle('active', section.id === id);
    });
    const selector = `.nav-link[href="#${id}"]`;
    DOM.navigation.navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(selector)?.classList.add('active');
    if (!DOM.navigation.mobileMenu.classList.contains('hidden')) {
        DOM.navigation.mobileMenu.classList.add('hidden');
    }
}

function handleLinkClick(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href').substring(1);
    showSection(targetId);
    window.history.pushState(null, '', `#${targetId}`);
}

// --- UYGULAMAYI BAŞLATMA FONKSİYONU ---
async function initializeApp() {
    // Varsayılan olarak gösterilecek sezon ve turnuva ID'leri
    const initialSeasonId = '3';
    const initialEurocupId = '25';

    // Sayfa ilk yüklendiğinde gerekli tüm verileri paralel olarak çek.
    // Bu, birden çok gereksiz ağ isteğini önler.
    const [seasonData, eurocupData] = await Promise.all([
        getSeasonData(initialSeasonId),
        getEurocupData(initialEurocupId)
    ]);
    
    // Çekilen verileri ileride kullanmak üzere önbelleğe al.
    AppState.seasons[initialSeasonId] = seasonData;
    AppState.eurocups[initialEurocupId] = eurocupData;

    // Arayüzü önceden çekilmiş verilerle doldurarak hızlı bir ilk gösterim sağla.
    displayTeams(DOM.teams.container, seasonData.teams);
    displayBudgets(DOM.budgets.container, seasonData.teams);
    displaySuspendedPlayers(DOM.suspensions.container, seasonData.teams, seasonData.playerStats);
    displayStandings(DOM.standings.container, seasonData.teams, seasonData.fixtures);
    displayFixtures(DOM.fixtures.container, seasonData.teams, seasonData.fixtures);
    displayTopStats(DOM.kings.scorersContainer, DOM.kings.assistsContainer, DOM.kings.cleanSheetsContainer, seasonData.teams, seasonData.playerStats);
    displayEurocupFixtures(DOM.eurocup.container, eurocupData.teams, eurocupData.fixtures);

    // Olay Dinleyicilerini (Event Listeners) Kur
    DOM.standings.select.addEventListener('change', updateStandings);
    DOM.fixtures.select.addEventListener('change', updateFixtures);
    DOM.kings.select.addEventListener('change', updateKings);
    DOM.eurocup.select.addEventListener('change', updateEurocup);
    DOM.teams.searchInput.addEventListener('input', handleTeamSearch);

    // Navigasyon Olay Dinleyicileri
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => {
        DOM.navigation.mobileMenu.classList.toggle('hidden');
    });
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1) || 'anasayfa';
        showSection(hash);
    });
    
    // Sayfa ilk açıldığında URL'ye göre doğru bölümü göster
    const initialHash = window.location.hash.substring(1) || 'anasayfa';
    showSection(initialHash);
    
    // Footer'daki yılı güncelle
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    console.log("Uygulama tüm iyileştirmelerle başarıyla başlatıldı!");
}

// Uygulamayı başlat
initializeApp();