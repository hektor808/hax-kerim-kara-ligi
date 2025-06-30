import './style.css';
import { getSeasonData, getEurocupData } from './api.js';
import { findMatchesByTeamNames } from './utils.js';
import { 
    displayStandings, 
    displayFixtures,
    displayEurocupFixtures,
    displayTopStats, // Değiştirilen fonksiyonun importu
    displayTeams,
    displayBudgets,
    displaySuspendedPlayers,
    displayHeadToHeadResults,
    openPlayerModal,
    closePlayerModal,
    populatePlayerModal
} from './ui.js';

const AppState = { seasons: {}, eurocups: {} };

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

function populateTeamSelects(selectElement, teams, placeholder) {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.name;
        option.textContent = team.name;
        selectElement.append(option);
    });
}

// --- HANDLERS ---
async function updateStandings() { const seasonId = DOM.standings.select.value; const { teams, fixtures } = AppState.seasons[seasonId]; displayStandings(DOM.standings.container, teams, fixtures); }
async function updateFixtures() { const seasonId = DOM.fixtures.select.value; const { teams, fixtures } = AppState.seasons[seasonId]; displayFixtures(DOM.fixtures.container, teams, fixtures); }
async function updateEurocup() { const cupYear = DOM.eurocup.select.value; const { teams, fixtures } = AppState.eurocups[cupYear]; displayEurocupFixtures(DOM.eurocup.container, teams, fixtures); }
function handleTeamSearch() { const searchTerm = DOM.teams.searchInput.value.toLowerCase(); const allTeams = AppState.seasons['3']?.teams || []; const filteredTeams = allTeams.filter(team => team.name.toLowerCase().includes(searchTerm)); displayTeams(DOM.teams.container, filteredTeams); }

/**
 * DEĞİŞTİRİLDİ: Bu fonksiyon artık Krallıklar listelerindeki her bir istatistik türünü
 * ayrı ayrı render etmek için ui.js'deki yeni, modüler displayTopStats fonksiyonunu çağırır.
 * Bu, kod tekrarını azaltır ve mantığı basitleştirir.
 */
async function updateKings() { 
    const seasonId = DOM.kings.select.value; 
    const { teams, playerStats } = AppState.seasons[seasonId];

    // Gol Krallığı
    const topScorers = [...playerStats].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
    displayTopStats(DOM.kings.scorersContainer, 'Gol Krallığı', 'text-yellow-400', topScorers, 'goals', teams, seasonId);

    // Asist Krallığı
    const topAssists = [...playerStats].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
    displayTopStats(DOM.kings.assistsContainer, 'Asist Krallığı', 'text-green-400', topAssists, 'assists', teams, seasonId);

    // Clean Sheet
    const topKeepers = [...playerStats].filter(p => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets);
    displayTopStats(DOM.kings.cleanSheetsContainer, 'Clean Sheet', 'text-cyan-400', topKeepers, 'cleanSheets', teams, seasonId);
}

function handleH2HSelectionChange() {
    const team1Name = DOM.h2h.team1Select.value;
    const team2Name = DOM.h2h.team2Select.value;
    if (!team1Name || !team2Name || team1Name === team2Name) {
        DOM.h2h.resultsContainer.innerHTML = ''; return;
    }
    const matches = findMatchesByTeamNames(team1Name, team2Name, AppState.seasons);
    displayHeadToHeadResults(DOM.h2h.resultsContainer, matches, AppState.seasons);
}

/**
 * DEĞİŞTİRİLDİ: Fonksiyon artık global arama yapmak yerine, tıklanan DOM elementine
 * daha önce gömülmüş olan `data-season-id` ve `data-player-name` bilgilerini okur.
 * Bu, doğru sezondaki doğru oyuncunun bilgilerinin getirilmesini %100 garanti eder.
 */
function handlePlayerClick(event) {
    const clickedListItem = event.target.closest('li[data-season-id]');
    if (!clickedListItem) return;
    
    // Gerekli bağlamı doğrudan DOM'dan oku.
    const { playerName, seasonId } = clickedListItem.dataset;
    const seasonData = AppState.seasons[seasonId];
    
    if (!seasonData) return; // Güvenlik kontrolü

    const player = seasonData.playerStats.find(p => p.name === playerName);
    if (!player) return;
    
    // Takımı da doğru sezonun verileri içinde ara.
    const team = seasonData.teams.find(t => t.id === player.teamId);

    populatePlayerModal(player, team);
    openPlayerModal();
    
    // Modal içeriği her seferinde yeniden oluştuğu için, kapatma butonuna olay dinleyicisini
    // burada eklemek en güvenlisidir. { once: true } bellek sızıntısını önler.
    const closeButton = document.getElementById('modal-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', closePlayerModal, { once: true });
    }
}

// --- NAVİGASYON ---
function showSection(id) { DOM.navigation.sections.forEach(section => section.classList.toggle('active', section.id === id)); const selector = `.nav-link[href="#${id}"]`; DOM.navigation.navLinks.forEach(link => link.classList.remove('active')); document.querySelector(selector)?.classList.add('active'); if (!DOM.navigation.mobileMenu.classList.contains('hidden')) DOM.navigation.mobileMenu.classList.add('hidden'); }
function handleLinkClick(e) { e.preventDefault(); const targetId = e.currentTarget.getAttribute('href').substring(1); showSection(targetId); window.history.pushState(null, '', `#${targetId}`); }

// --- UYGULAMAYI BAŞLATMA ---
async function initializeApp() {
    const [season1Data, season2Data, season3Data, eurocup24Data, eurocup25Data] = await Promise.all([ getSeasonData('1'), getSeasonData('2'), getSeasonData('3'), getEurocupData('24'), getEurocupData('25'), ]);
    AppState.seasons['1'] = season1Data; AppState.seasons['2'] = season2Data; AppState.seasons['3'] = season3Data;
    AppState.eurocups['24'] = eurocup24Data; AppState.eurocups['25'] = eurocup25Data;
    
    displayTeams(DOM.teams.container, season3Data.teams);
    displayBudgets(DOM.budgets.container, season3Data.teams);
    displaySuspendedPlayers(DOM.suspensions.container, season3Data.teams, season3Data.playerStats);
    updateStandings(); updateFixtures(); updateKings(); updateEurocup();

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
    
    // Krallıklar container'ına olay dinleyicisi ekleniyor (event delegation)
    DOM.kings.container.addEventListener('click', handlePlayerClick);
    
    DOM.modal.element.addEventListener('click', (e) => { if (e.target.id === 'player-modal') closePlayerModal(); });
    
    // Navigasyon
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => DOM.navigation.mobileMenu.classList.toggle('hidden'));
    
    window.addEventListener('popstate', () => showSection(window.location.hash.substring(1) || 'anasayfa'));
    showSection(window.location.hash.substring(1) || 'anasayfa');
    
    document.getElementById('current-year').textContent = new Date().getFullYear();
    console.log("Uygulama başarıyla başlatıldı ve veri bütünlüğü sorunu giderildi!");
}

initializeApp();