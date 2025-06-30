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
};

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
    select: document.getElementById('seasonSelectKings'), // Bu seçici artık diğerlerini de kontrol edecek
    container: document.getElementById('kralliklar-container'),
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
  budgets: { container: document.getElementById('budget-container') },
  suspensions: {
    container: document.getElementById('suspended-players-container'),
  },
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

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return { season: params.get('season'), cup: params.get('cup') };
}

function setUrlParams(newParams, replace = false) {
  const url = new URL(window.location);
  const params = replace ? new URLSearchParams() : new URLSearchParams(url.search);
  for (const key in newParams) {
    newParams[key] ? params.set(key, newParams[key]) : params.delete(key);
  }
  url.search = params.toString();
  window.history.pushState({}, '', url);
}

async function getCachedData(cache, id, fetchFunction) {
  const cacheEntry = cache.get(id);
  if (cacheEntry) {
    if (cacheEntry.status === 'success') return cacheEntry.data;
    if (cacheEntry.status === 'loading') return cacheEntry.promise;
    if (cacheEntry.status === 'error') throw cacheEntry.error;
  }
  const promise = fetchFunction(id);
  cache.set(id, { status: 'loading', promise });
  try {
    const data = await promise;
    cache.set(id, { status: 'success', data });
    return data;
  } catch (error) {
    cache.set(id, { status: 'error', error });
    throw error;
  }
}

const getCachedSeasonData = (seasonId) => getCachedData(AppState.seasonCache, seasonId, getSeasonData);
const getCachedEurocupData = (cupId) => getCachedData(AppState.eurocupCache, cupId, getEurocupData);

async function updateStandings() {
  const seasonId = DOM.standings.select.value;
  setUrlParams({ season: seasonId });
  showLoading(DOM.standings.container);
  try {
    const { teams, fixtures } = await getCachedSeasonData(seasonId);
    displayStandings(DOM.standings.container, teams, fixtures);
  } catch (error) {
    console.error('Puan durumu yüklenirken hata:', error);
    renderError(DOM.standings.container, 'Puan durumu yüklenemedi.');
  }
}

async function updateFixtures() {
  const seasonId = DOM.fixtures.select.value;
  setUrlParams({ season: seasonId });
  showLoading(DOM.fixtures.container);
  try {
    const { teams, fixtures } = await getCachedSeasonData(seasonId);
    displayFixtures(DOM.fixtures.container, teams, fixtures);
  } catch (error) {
    console.error('Fikstür yüklenirken hata:', error);
    renderError(DOM.fixtures.container, 'Fikstür yüklenemedi.');
  }
}

// DÜZELTME: Bu fonksiyon artık Krallıklar, Bütçeler ve Cezaları güncelleyecek
async function updateDynamicSeasonSections() {
  const seasonId = DOM.kings.select.value;
  setUrlParams({ season: seasonId });
  showLoading(DOM.kings.scorersContainer);
  showLoading(DOM.kings.assistsContainer);
  showLoading(DOM.kings.cleanSheetsContainer);
  showLoading(DOM.budgets.container);
  showLoading(DOM.suspensions.container);

  try {
    const { teams, playerStats } = await getCachedSeasonData(seasonId);
    // Krallıklar
    const topScorers = [...playerStats].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals);
    const topAssists = [...playerStats].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists);
    const topKeepers = [...playerStats].filter((p) => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets);
    displayTopStats(DOM.kings.scorersContainer, 'Gol Krallığı', 'text-yellow-400', topScorers, 'goals', teams, seasonId);
    displayTopStats(DOM.kings.assistsContainer, 'Asist Krallığı', 'text-green-400', topAssists, 'assists', teams, seasonId);
    displayTopStats(DOM.kings.cleanSheetsContainer, 'Clean Sheet', 'text-cyan-400', topKeepers, 'cleanSheets', teams, seasonId);
    // Bütçeler
    displayBudgets(DOM.budgets.container, teams);
    // Cezalar
    displaySuspendedPlayers(DOM.suspensions.container, teams, playerStats);
  } catch (error) {
    console.error('Dinamik sezon verileri yüklenirken hata:', error);
    renderError(DOM.kings.container, 'Krallıklar yüklenemedi.');
    renderError(DOM.budgets.container, 'Bütçeler yüklenemedi.');
    renderError(DOM.suspensions.container, 'Cezalı bilgisi yüklenemedi.');
  }
}

async function updateEurocup() {
  const cupId = DOM.eurocup.select.value;
  setUrlParams({ cup: cupId }, true);
  showLoading(DOM.eurocup.container);
  try {
    const { teams, fixtures } = await getCachedEurocupData(cupId);
    displayEurocupFixtures(DOM.eurocup.container, teams, fixtures);
  } catch (error) {
    console.error('Eurocup verisi yüklenirken hata:', error);
    renderError(DOM.eurocup.container, 'Eurocup verisi yüklenemedi.');
  }
}

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
    console.error('Oyuncu detayı getirilirken hata:', error);
    alert('Oyuncu bilgileri yüklenemedi.');
  }
}

function syncH2hDropdowns(sourceSelect, targetSelect) {
  const selectedValue = sourceSelect.value;
  if (targetSelect.value === selectedValue) {
    targetSelect.value = "";
  }
  for (const option of targetSelect.options) {
    option.disabled = (option.value === selectedValue && selectedValue !== "");
  }
}

async function updateHeadToHead() {
  const team1Name = DOM.h2h.team1Select.value;
  const team2Name = DOM.h2h.team2Select.value;

  if (!team1Name || !team2Name) {
    // DÜZELTME: Kullanıcıya geri bildirim ver
    DOM.h2h.resultsContainer.innerHTML = `<p class="text-center text-gray-400 p-4">Karşılaşma geçmişini görmek için lütfen iki farklı takım seçin.</p>`;
    return;
  }
  if (team1Name === team2Name) { // Bu durum UI tarafından engellendi ama bir güvenlik katmanı
      return; 
  }

  showLoading(DOM.h2h.resultsContainer);
  try {
    const seasons = ['1', '2', '3'];
    await Promise.all(seasons.map(id => getCachedSeasonData(id)));
    const allSeasonsData = Object.fromEntries(seasons.map(id => [id, AppState.seasonCache.get(id).data]));
    const matches = findMatchesByTeamNames(team1Name, team2Name, allSeasonsData);
    displayHeadToHeadResults(DOM.h2h.resultsContainer, matches, allSeasonsData);
  } catch (error) {
    console.error('İkili rekabet verisi yüklenirken hata:', error);
    renderError(DOM.h2h.resultsContainer, 'Maç geçmişi yüklenemedi.');
  }
}

function showSection(id) {
  DOM.navigation.sections.forEach(section => section.classList.toggle('active', section.id === id));
  DOM.navigation.navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
  if (!DOM.navigation.mobileMenu.classList.contains('hidden')) {
    DOM.navigation.mobileMenu.classList.add('hidden');
  }

  // DÜZELTME: Dinamik bölümlerin tetiklenmesi
  switch (id) {
    case 'puan': updateStandings(); break;
    case 'fikstur': updateFixtures(); break;
    case 'kralliklar':
    case 'butceler':
    case 'cezalar':
      updateDynamicSeasonSections(); break;
    case 'eurocup': updateEurocup(); break;
  }
}

function handleLinkClick(e) {
  e.preventDefault();
  const targetId = e.currentTarget.getAttribute('href').substring(1);
  const currentParams = new URLSearchParams(window.location.search);
  window.history.pushState({}, '', `${e.currentTarget.getAttribute('href')}?${currentParams.toString()}`);
  showSection(targetId);
}

async function initializeApp() {
  console.log('Uygulama başlatıldı: Tüm iyileştirmeler aktif.');

  const params = getUrlParams();
  const initialSeason = params.season || '3';
  const initialCup = params.cup || '25';

  DOM.standings.select.value = initialSeason;
  DOM.fixtures.select.value = initialSeason;
  DOM.kings.select.value = initialSeason; // Bu artık diğerlerini de kontrol ediyor
  DOM.eurocup.select.value = initialCup;
  
  // DÜZELTME: Takımlar sayfası için veriyi önbelleğe al
  const teamDataPromise = getCachedSeasonData('3');

  try {
    const defaultTeamData = await teamDataPromise;
    displayTeams(DOM.teams.container, defaultTeamData.teams);
  } catch (e) {
      renderError(DOM.teams.container, "Takımlar yüklenemedi.");
  }

  // H2H için verileri arka planda çek
  try {
    const seasons = ['1', '2', '3'];
    const seasonResults = await Promise.all(seasons.map(id => getCachedSeasonData(id)));
    const allTeams = seasonResults.flatMap(s => s.teams);
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
  } catch (error) {
    console.error('H2H için takım verileri yüklenirken kritik hata:', error);
  }

  // --- OLAY DİNLEYİCİLERİ ---
  DOM.standings.select.addEventListener('change', updateStandings);
  DOM.fixtures.select.addEventListener('change', updateFixtures);
  DOM.eurocup.select.addEventListener('change', updateEurocup);
  DOM.kings.select.addEventListener('change', updateDynamicSeasonSections); // Tek fonksiyonu çağır
  DOM.kings.container.addEventListener('click', handlePlayerClick);
  DOM.modal.element.addEventListener('click', (e) => { if (e.target.id === 'player-modal') closePlayerModal(); });
  
  DOM.h2h.team1Select.addEventListener('change', () => {
    syncH2hDropdowns(DOM.h2h.team1Select, DOM.h2h.team2Select);
    updateHeadToHead();
  });
  DOM.h2h.team2Select.addEventListener('change', () => {
    syncH2hDropdowns(DOM.h2h.team2Select, DOM.h2h.team1Select);
    updateHeadToHead();
  });
  
  // DÜZELTME: Takım arama artık önbellekten çalışır, verimsiz ağ isteği yapmaz
  DOM.teams.searchInput.addEventListener('input', async () => {
    const searchInput = DOM.teams.searchInput.value.toLowerCase();
    try {
        const seasonData = await teamDataPromise; // Başta çekilen veriyi kullan
        const filteredTeams = seasonData.teams.filter(team => team.name.toLowerCase().includes(searchInput));
        displayTeams(DOM.teams.container, filteredTeams);
    } catch (e) {
        renderError(DOM.teams.container, "Arama sırasında bir hata oluştu.");
    }
  });
  
  DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
  DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
  DOM.navigation.mobileMenuButton.addEventListener('click', () => DOM.navigation.mobileMenu.classList.toggle('hidden'));
  
  window.addEventListener('popstate', () => {
    const params = getUrlParams();
    const hash = window.location.hash.substring(1) || 'anasayfa';
    DOM.standings.select.value = params.season || '3';
    DOM.fixtures.select.value = params.season || '3';
    DOM.kings.select.value = params.season || '3';
    DOM.eurocup.select.value = params.cup || '25';
    showSection(hash);
  });
  
  showSection(window.location.hash.substring(1) || 'anasayfa');
  document.getElementById('current-year').textContent = new Date().getFullYear();
}

initializeApp();