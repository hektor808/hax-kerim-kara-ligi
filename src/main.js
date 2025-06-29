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

// --- STATE & CACHE ---
const AppState = {
    seasons: {},
    eurocups: {},
};

// --- DOM ELEMENTLERİ ---
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

// --- HANDLERS (Olay Yöneticileri) ---
// Bu fonksiyonlar artık veriyi önbellekten (cache) alarak gereksiz API isteklerini önler.
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
    // GÜNCELLENDİ: İlk yüklemede veriler sadece bir kez çekilir ve önbelleğe alınır.
    const initialSeasonId = '3';
    const initialEurocupId = '25';

    // Verileri paralel olarak çek
    const [seasonData, eurocupData] = await Promise.all([
        getSeasonData(initialSeasonId),
        getEurocupData(initialEurocupId)
    ]);
    
    // Verileri önbelleğe al
    AppState.seasons[initialSeasonId] = seasonData;
    AppState.eurocups[initialEurocupId] = eurocupData;

    // Arayüzü önceden çekilmiş verilerle doldur
    displayTeams(DOM.teams.container, seasonData.teams);
    displayBudgets(DOM.budgets.container, seasonData.teams);
    displaySuspendedPlayers(DOM.suspensions.container, seasonData.teams, seasonData.playerStats);
    displayStandings(DOM.standings.container, seasonData.teams, seasonData.fixtures);
    displayFixtures(DOM.fixtures.container, seasonData.teams, seasonData.fixtures);
    displayTopStats(DOM.kings.scorersContainer, DOM.kings.assistsContainer, DOM.kings.cleanSheetsContainer, seasonData.teams, seasonData.playerStats);
    displayEurocupFixtures(DOM.eurocup.container, eurocupData.teams, eurocupData.fixtures);

    // Event Listeners
    DOM.standings.select.addEventListener('change', updateStandings);
    DOM.fixtures.select.addEventListener('change', updateFixtures);
    DOM.kings.select.addEventListener('change', updateKings);
    DOM.eurocup.select.addEventListener('change', updateEurocup);

    // Navigasyon Event Listeners
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => {
        DOM.navigation.mobileMenu.classList.toggle('hidden');
    });
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1) || 'anasayfa';
        showSection(hash);
    });
    
    // Sayfa ilk açıldığında doğru bölümü göster
    const initialHash = window.location.hash.substring(1) || 'anasayfa';
    showSection(initialHash);
    
    document.getElementById('current-year').textContent = new Date().getFullYear();
    console.log("Uygulama optimize edilmiş ve en iyi haliyle başlatıldı!");
}

// Uygulamayı başlat
initializeApp();