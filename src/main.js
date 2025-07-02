import './style.css';
import { getSeasonData, getEurocupData } from './api.js';
import { findMatchesByTeamNames } from './utils.js';
import {
  showLoading,
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
  populatePlayerModal,
  renderError,
} from './ui.js';

const AppState = {
  seasonCache: new Map(),
  eurocupCache: new Map(),
  allSeasonsData: {},
};

const DOM = {
    standings: { select: document.getElementById('seasonSelectStandings'), container: document.getElementById('standings-table-body') },
    fixtures: { select: document.getElementById('seasonSelectFixtures'), container: document.getElementById('fixtures-container') },
    kings: {
        select: document.getElementById('seasonSelectKings'),
        container: document.getElementById('kralliklar-container'),
        scorersContainer: document.getElementById('top-scorers'),
        assistsContainer: document.getElementById('top-assists'),
        cleanSheetsContainer: document.getElementById('top-cleansheets'),
    },
    eurocup: { select: document.getElementById('seasonSelectEurocup'), container: document.getElementById('eurocup-fixtures-container') },
    teams: { container: document.getElementById('teams-container'), searchInput: document.getElementById('team-search-input') },
    budgets: { container: document.getElementById('budget-container') },
    suspensions: { container: document.getElementById('suspended-players-container') },
    h2h: {
        team1Select: document.getElementById('h2h-team1-select'),
        team2Select: document.getElementById('h2h-team2-select'),
        resultsContainer: document.getElementById('h2h-results-container'),
    },
    modal: { element: document.getElementById('player-modal') },
    navigation: {
        sections: document.querySelectorAll('.content-section'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileNavLinks: document.querySelectorAll('.nav-link-mobile'),
        mobileMenu: document.getElementById('mobile-menu'),
        mobileMenuButton: document.getElementById('mobile-menu-button'),
    },
};

// --- URL Management ---
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return { season: params.get('season'), cup: params.get('cup') };
}

function updateUrl(hash, paramsToSet = {}, replaceParams = false) {
    const url = new URL(window.location);
    const params = replaceParams ? new URLSearchParams() : new URLSearchParams(url.search);
    Object.keys(paramsToSet).forEach(key => {
        const value = paramsToSet[key];
        if (value) params.set(key, value);
        else params.delete(key);
    });
    url.search = params.toString();
    url.hash = hash;
    if (window.location.href !== url.href) {
        window.history.pushState({}, '', url);
    }
}

// --- Data Fetching & Caching ---
async function getCachedData(cache, id, fetchFunction) {
    if (cache.has(id)) return cache.get(id);
    try {
        const data = await fetchFunction(id);
        cache.set(id, data);
        return data;
    } catch (error) {
        console.error(`Error fetching data for id ${id}:`, error);
        throw error; // Re-throw to be caught by callers
    }
}
const getCachedSeasonData = (seasonId) => getCachedData(AppState.seasonCache, seasonId, getSeasonData);
const getCachedEurocupData = (cupId) => getCachedData(AppState.eurocupCache, cupId, getEurocupData);

// --- UI Update Functions ---
async function updateStandings(id) {
  const seasonId = DOM.standings.select.value;
  updateUrl(`#${id}`, { season: seasonId }, true);
  showLoading(DOM.standings.container);
  try {
    const { teams, fixtures } = await getCachedSeasonData(seasonId);
    displayStandings(DOM.standings.container, teams, fixtures, seasonId);
  } catch (error) {
    console.error('Puan durumu yüklenirken hata:', error);
    renderError(DOM.standings.container, 'Puan durumu yüklenemedi.');
  }
}

async function updateFixtures(id) {
  const seasonId = DOM.fixtures.select.value;
  updateUrl(`#${id}`, { season: seasonId }, true);
  showLoading(DOM.fixtures.container);
  try {
    const { teams, fixtures } = await getCachedSeasonData(seasonId);
    displayFixtures(DOM.fixtures.container, teams, fixtures, seasonId);
  } catch (error) {
    console.error('Fikstür yüklenirken hata:', error);
    renderError(DOM.fixtures.container, 'Fikstür yüklenemedi.');
  }
}

async function updateDynamicSeasonSections(id) {
  const seasonId = DOM.kings.select.value;
  updateUrl(`#${id}`, { season: seasonId }, true);
  showLoading(DOM.kings.scorersContainer);
  showLoading(DOM.kings.assistsContainer);
  showLoading(DOM.kings.cleanSheetsContainer);
  showLoading(DOM.budgets.container);
  showLoading(DOM.suspensions.container);
  try {
    const { teams, playerStats } = await getCachedSeasonData(seasonId);
    displayTopStats(DOM.kings.scorersContainer, 'Gol Krallığı', 'text-yellow-400', [...playerStats].sort((a, b) => b.goals - a.goals), 'goals', teams, seasonId);
    displayTopStats(DOM.kings.assistsContainer, 'Asist Krallığı', 'text-green-400', [...playerStats].sort((a, b) => b.assists - a.assists), 'assists', teams, seasonId);
    displayTopStats(DOM.kings.cleanSheetsContainer, 'Clean Sheet', 'text-cyan-400', [...playerStats].sort((a, b) => b.cleanSheets - a.cleanSheets), 'cleanSheets', teams, seasonId);
    displayBudgets(DOM.budgets.container, teams);
    displaySuspendedPlayers(DOM.suspensions.container, teams, playerStats);
  } catch (error) {
    console.error('Dinamik sezon verileri yüklenirken hata:', error);
    renderError(DOM.kings.container, 'Krallıklar yüklenemedi.');
    renderError(DOM.budgets.container, 'Bütçeler yüklenemedi.');
    renderError(DOM.suspensions.container, 'Cezalı bilgisi yüklenemedi.');
  }
}

async function updateEurocup(id) {
  const cupId = DOM.eurocup.select.value;
  updateUrl(`#${id}`, { cup: cupId }, true);
  showLoading(DOM.eurocup.container);
  try {
    const { teams, fixtures } = await getCachedEurocupData(cupId);
    displayEurocupFixtures(DOM.eurocup.container, teams, fixtures);
  } catch (error) {
    console.error('Eurocup verisi yüklenirken hata:', error);
    renderError(DOM.eurocup.container, 'Eurocup verisi yüklenemedi.');
  }
}

async function updateHeadToHead(id) {
    updateUrl(`#${id}`);
    const team1Name = DOM.h2h.team1Select.value;
    const team2Name = DOM.h2h.team2Select.value;
    if (!team1Name || !team2Name) {
        DOM.h2h.resultsContainer.innerHTML = `<p class="text-center text-gray-400 p-4">Karşılaşma geçmişini görmek için lütfen iki farklı takım seçin.</p>`;
        return;
    }
    showLoading(DOM.h2h.resultsContainer);
    try {
        const matches = findMatchesByTeamNames(team1Name, team2Name, AppState.allSeasonsData);
        displayHeadToHeadResults(DOM.h2h.resultsContainer, matches, AppState.allSeasonsData, team1Name, team2Name);
    } catch (error) {
        console.error('Maç geçmişi yüklenirken hata:', error);
        renderError(DOM.h2h.resultsContainer, 'Maç geçmişi yüklenemedi.');
    }
}

async function updateTeams(id) {
    updateUrl(`#${id}`);
    showLoading(DOM.teams.container);
    try {
        const { teams } = await getCachedSeasonData('3'); // Always show latest season's teams
        displayTeams(DOM.teams.container, teams);
    } catch(e) {
        console.error('Takımlar yüklenirken hata:', e);
        renderError(DOM.teams.container, "Takımlar yüklenemedi.");
    }
}

// --- Navigation & Page Management ---
const sectionUpdaters = {
    'puan': updateStandings,
    'fikstur': updateFixtures,
    'kralliklar': updateDynamicSeasonSections,
    'butceler': updateDynamicSeasonSections,
    'cezalar': updateDynamicSeasonSections,
    'eurocup': updateEurocup,
    'h2h': updateHeadToHead,
    'takimlar': updateTeams,
    'anasayfa': (id) => updateUrl(`#${id}`, { season: null, cup: null }, false),
    'kurallar': (id) => updateUrl(`#${id}`, { season: null, cup: null }, false),
    'muze': (id) => updateUrl(`#${id}`, { season: null, cup: null }, false),
};

function showSection(id) {
    DOM.navigation.sections.forEach(section => section.classList.toggle('active', section.id === id));
    DOM.navigation.navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    if (!DOM.navigation.mobileMenu.classList.contains('hidden')) {
        DOM.navigation.mobileMenu.classList.add('hidden');
    }
    const updater = sectionUpdaters[id];
    if (updater) updater(id);
}

// --- Event Handlers ---
async function handlePlayerClick(event) {
    const clickedListItem = event.target.closest('li[data-season-id]');
    if (!clickedListItem) return;
    const { playerName, seasonId } = clickedListItem.dataset;
    try {
        const seasonData = await getCachedSeasonData(seasonId);
        const player = seasonData.playerStats.find((p) => p.name === playerName);
        if (!player) return;
        const team = seasonData.teams.find((t) => t.id === player.teamId);
        populatePlayerModal(player, team);
        openPlayerModal();
        document.getElementById('modal-close-button')?.addEventListener('click', closePlayerModal, { once: true });
    } catch (error) {
        console.error('Oyuncu modal bilgileri yüklenirken hata:', error);
        alert('Oyuncu bilgileri yüklenemedi.');
    }
}

function handleLinkClick(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href').substring(1);
    showSection(targetId);
}

function handlePageLoadOrPopState() {
    const hash = window.location.hash.substring(1) || 'anasayfa';
    const params = getUrlParams();
    DOM.standings.select.value = params.season || '3';
    DOM.fixtures.select.value = params.season || '3';
    DOM.kings.select.value = params.season || '3';
    DOM.eurocup.select.value = params.cup || '25';
    showSection(hash);
}

// --- Application Initialization ---
async function initializeApp() {
    console.log('Uygulama başlatıldı: Refactor edilmiş ve sağlamlaştırılmış versiyon.');

    try {
        const seasonIds = ['1', '2', '3'];
        const seasonPromises = seasonIds.map(id => getCachedSeasonData(id));
        const seasons = await Promise.all(seasonPromises);
        seasons.forEach((data, index) => {
            AppState.allSeasonsData[seasonIds[index]] = data;
        });

        const allTeams = Object.values(AppState.allSeasonsData).flatMap(s => s.teams);
        const uniqueTeams = Array.from(new Map(allTeams.map(team => [team.name, team])).values()).sort((a,b) => a.name.localeCompare(b.name));
        
        const populateTeamSelects = (selectElement, teams, placeholder) => {
            selectElement.innerHTML = `<option value="">${placeholder}</option>`;
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.name;
                option.textContent = team.name;
                selectElement.append(option);
            });
        };
        populateTeamSelects(DOM.h2h.team1Select, uniqueTeams, '1. Takımı Seçin');
        populateTeamSelects(DOM.h2h.team2Select, uniqueTeams, '2. Takımı Seçin');
    } catch (error) {
        console.error('H2H için başlangıç verileri yüklenirken kritik hata:', error);
        DOM.h2h.team1Select.innerHTML = '<option value="">Takımlar yüklenemedi</option>';
        DOM.h2h.team2Select.innerHTML = '<option value="">Takımlar yüklenemedi</option>';
    }

    // --- Event Listeners ---
    [DOM.standings.select, DOM.fixtures.select, DOM.kings.select].forEach(sel => {
        sel.addEventListener('change', () => showSection(window.location.hash.substring(1) || 'puan'));
    });
    DOM.eurocup.select.addEventListener('change', () => showSection('eurocup'));
    
    DOM.kings.container.addEventListener('click', handlePlayerClick);
    DOM.modal.element.addEventListener('click', (e) => { if (e.target.id === 'player-modal') closePlayerModal(); });
    
    const h2hHandler = () => {
        syncH2hDropdowns(DOM.h2h.team1Select, DOM.h2h.team2Select);
        syncH2hDropdowns(DOM.h2h.team2Select, DOM.h2h.team1Select);
        showSection('h2h');
    };
    DOM.h2h.team1Select.addEventListener('change', h2hHandler);
    DOM.h2h.team2Select.addEventListener('change', h2hHandler);

    DOM.teams.searchInput.addEventListener('input', async (e) => {
        const searchInput = e.target.value.toLowerCase();
        try {
            const { teams } = await getCachedSeasonData('3');
            const filteredTeams = teams.filter(team => team.name.toLowerCase().includes(searchInput));
            displayTeams(DOM.teams.container, filteredTeams);
        } catch (err) {
            console.error('Takım arama sırasında hata:', err);
            renderError(DOM.teams.container, "Arama sırasında bir hata oluştu.");
        }
    });
    
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => DOM.navigation.mobileMenu.classList.toggle('hidden'));
    
    window.addEventListener('popstate', handlePageLoadOrPopState);
    
    handlePageLoadOrPopState();
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

function syncH2hDropdowns(sourceSelect, targetSelect) {
    const selectedValue = sourceSelect.value;
    for (const option of targetSelect.options) {
        option.disabled = (option.value === selectedValue && selectedValue !== "");
    }
}

initializeApp();