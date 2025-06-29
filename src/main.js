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
    const cupId = DOM.eurocup.select.value === '24' ? '1' : '2'; // HTML'deki value'ye göre ayarla
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
    // Event Listeners
    DOM.standings.select.addEventListener('change', updateStandings);
    DOM.fixtures.select.addEventListener('change', updateFixtures);
    DOM.kings.select.addEventListener('change', updateKings);
    DOM.eurocup.select.addEventListener('change', updateEurocup);

    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => {
        DOM.navigation.mobileMenu.classList.toggle('hidden');
    });
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1) || 'anasayfa';
        showSection(hash);
    });

    // İlk Yükleme İşlemleri
    // Sabit olan (güncel sezonu gösteren) bölümlerin verisini çek ve göster
    const season3Data = await getSeasonData('3');
    displayTeams(DOM.teams.container, season3Data.teams);
    displayBudgets(DOM.budgets.container, season3Data.teams);
    displaySuspendedPlayers(DOM.suspensions.container, season3Data.teams, season3Data.playerStats);

    // Seçime bağlı bölümleri varsayılan değerleriyle yükle
    await Promise.all([
        updateStandings(),
        updateFixtures(),
        updateKings(),
        updateEurocup()
    ]);

    // Navigasyonu ayarla
    const initialHash = window.location.hash.substring(1) || 'anasayfa';
    showSection(initialHash);

    // Footer yıl
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    console.log("Uygulama en iyi haliyle başarıyla başlatıldı!");
}

// Uygulamayı başlat
initializeApp();