import './style.css';
import { getSeasonData, getEurocupData } from './api.js';
import { findMatchesByTeamNames } from './utils.js';
import { 
    displayStandings, 
    displayFixtures,
    displayEurocupFixtures,
    displayTopStats,
    displayTeams,
    displayBudgets,
    displaySuspendedPlayers,
    displayHeadToHeadResults
} from './ui.js';

// --- UYGULAMA DURUMU VE ÖNBELLEK ---
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
        searchInput: document.getElementById('team-search-input'),
    },
    budgets: {
        container: document.getElementById('budget-container'),
    },
    suspensions: {
        container: document.getElementById('suspended-players-container'),
    },
    h2h: {
        team1Select: document.getElementById('h2h-team1-select'),
        team2Select: document.getElementById('h2h-team2-select'),
        resultsContainer: document.getElementById('h2h-results-container'),
    },
    navigation: {
        sections: document.querySelectorAll('.content-section'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileNavLinks: document.querySelectorAll('.nav-link-mobile'),
        mobileMenu: document.getElementById('mobile-menu'),
        mobileMenuButton: document.getElementById('mobile-menu-button'),
    }
};

// --- YARDIMCI FONKSİYONLAR ---
function populateTeamSelects(selectElement, teams, placeholder) {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.name; // ID yerine benzersiz olan takım ismini kullanıyoruz
        option.textContent = team.name;
        selectElement.append(option);
    });
}

// --- HANDLERS ---
async function updateStandings() {
    const seasonId = DOM.standings.select.value;
    const { teams, fixtures } = AppState.seasons[seasonId];
    displayStandings(DOM.standings.container, teams, fixtures);
}

async function updateFixtures() {
    const seasonId = DOM.fixtures.select.value;
    const { teams, fixtures } = AppState.seasons[seasonId];
    displayFixtures(DOM.fixtures.container, teams, fixtures);
}

async function updateKings() {
    const seasonId = DOM.kings.select.value;
    const { teams, playerStats } = AppState.seasons[seasonId];
    displayTopStats(DOM.kings.scorersContainer, DOM.kings.assistsContainer, DOM.kings.cleanSheetsContainer, teams, playerStats);
}

async function updateEurocup() {
    const cupYear = DOM.eurocup.select.value;
    const { teams, fixtures } = AppState.eurocups[cupYear];
    displayEurocupFixtures(DOM.eurocup.container, teams, fixtures);
}

function handleTeamSearch() {
    const searchTerm = DOM.teams.searchInput.value.toLowerCase();
    const allTeams = AppState.seasons['3']?.teams || [];
    const filteredTeams = allTeams.filter(team => team.name.toLowerCase().includes(searchTerm));
    displayTeams(DOM.teams.container, filteredTeams);
}

function handleH2HSelectionChange() {
    const team1Name = DOM.h2h.team1Select.value;
    const team2Name = DOM.h2h.team2Select.value;
    
    if (!team1Name || !team2Name || team1Name === team2Name) {
        DOM.h2h.resultsContainer.innerHTML = '';
        return;
    }
    
    // Yeni akıllı fonksiyonumuzu çağırıyoruz
    const matches = findMatchesByTeamNames(team1Name, team2Name, AppState.seasons);
    displayHeadToHeadResults(DOM.h2h.resultsContainer, matches, AppState.seasons);
}

// --- NAVİGASYON ---
function showSection(id) {
    DOM.navigation.sections.forEach(section => section.classList.toggle('active', section.id === id));
    const selector = `.nav-link[href="#${id}"]`;
    DOM.navigation.navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(selector)?.classList.add('active');
    if (!DOM.navigation.mobileMenu.classList.contains('hidden')) DOM.navigation.mobileMenu.classList.add('hidden');
}

function handleLinkClick(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href').substring(1);
    showSection(targetId);
    window.history.pushState(null, '', `#${targetId}`);
}

// --- UYGULAMAYI BAŞLATMA ---
async function initializeApp() {
    const [season1Data, season2Data, season3Data, eurocup24Data, eurocup25Data] = await Promise.all([
        getSeasonData('1'), getSeasonData('2'), getSeasonData('3'),
        getEurocupData('24'), getEurocupData('25'),
    ]);
    
    AppState.seasons['1'] = season1Data;
    AppState.seasons['2'] = season2Data;
    AppState.seasons['3'] = season3Data;
    AppState.eurocups['24'] = eurocup24Data;
    AppState.eurocups['25'] = eurocup25Data;
    
    displayTeams(DOM.teams.container, season3Data.teams);
    displayBudgets(DOM.budgets.container, season3Data.teams);
    displaySuspendedPlayers(DOM.suspensions.container, season3Data.teams, season3Data.playerStats);
    updateStandings(); 
    updateFixtures();
    updateKings();
    updateEurocup();

    // İkili Rekabet dropdown'larını tüm sezonlardaki benzersiz takımlarla dolduruyoruz.
    const allTeams = Object.values(AppState.seasons).flatMap(s => s.teams);
    const uniqueTeams = Array.from(new Map(allTeams.map(team => [team.name, team])).values()).sort((a,b) => a.name.localeCompare(b.name));
    
    populateTeamSelects(DOM.h2h.team1Select, uniqueTeams, '1. Takımı Seçin');
    populateTeamSelects(DOM.h2h.team2Select, uniqueTeams, '2. Takımı Seçin');

    // Olay Dinleyicileri
    DOM.standings.select.addEventListener('change', updateStandings);
    DOM.fixtures.select.addEventListener('change', updateFixtures);
    DOM.kings.select.addEventListener('change', updateKings);
    DOM.eurocup.select.addEventListener('change', updateEurocup);
    DOM.teams.searchInput.addEventListener('input', handleTeamSearch);
    DOM.h2h.team1Select.addEventListener('change', handleH2HSelectionChange);
    DOM.h2h.team2Select.addEventListener('change', handleH2HSelectionChange);
    
    // Navigasyon Olay Dinleyicileri
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => DOM.navigation.mobileMenu.classList.toggle('hidden'));
    
    window.addEventListener('popstate', () => showSection(window.location.hash.substring(1) || 'anasayfa'));
    showSection(window.location.hash.substring(1) || 'anasayfa');
    
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    console.log("Uygulama tüm özellikleriyle başarıyla başlatıldı!");
}

initializeApp();