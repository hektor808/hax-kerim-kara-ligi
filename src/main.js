// src/main.js

// Gerekli modülleri ve fonksiyonları import ediyoruz.
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

/**
 * Uygulamanın genel durumunu (state) yöneten merkezi nesne.
 * Önbellekler (cache) ve kullanıcı seçimleri burada tutulur.
 */
const AppState = {
  seasonCache: new Map(),
  eurocupCache: new Map(),
  allSeasonsData: {},
  activeFixtureFilter: 'all', // Fikstür filtresinin mevcut durumunu saklar.
};

/**
 * Sık kullanılan DOM elemanlarını barındıran merkezi nesne.
 * Kod tekrarını önler ve DOM erişimini tek bir yerden yönetir.
 */
const DOM = {
    standings: { select: document.getElementById('seasonSelectStandings'), container: document.getElementById('standings-table-body') },
    fixtures: { 
        select: document.getElementById('seasonSelectFixtures'), 
        container: document.getElementById('fixtures-container'),
        filters: document.getElementById('fixture-filters') // Yeni filtre butonları
    },
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

// --- VERİ YÖNETİMİ ---

/**
 * Veriyi önbellekten (cache) getiren veya yoksa fetch eden genel bir yardımcı fonksiyon.
 * @param {Map} cache - Verinin saklandığı Map nesnesi.
 * @param {string} id - Verinin anahtarı (örn: '1' veya '24').
 * @param {Function} fetchFunction - Veri bulunamazsa çağrılacak olan asenkron fetch fonksiyonu.
 * @returns {Promise<Object>} İstenen veri.
 */
async function getCachedData(cache, id, fetchFunction) {
    if (cache.has(id)) return cache.get(id);
    const data = await fetchFunction(id);
    cache.set(id, data);
    return data;
}
const getCachedSeasonData = (seasonId) => getCachedData(AppState.seasonCache, seasonId, getSeasonData);
const getCachedEurocupData = (cupId) => getCachedData(AppState.eurocupCache, cupId, getEurocupData);

// --- URL YÖNETİMİ ---

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return { 
    season: params.get('season') || '3', // Varsayılan sezon
    cup: params.get('cup') || '25'        // Varsayılan kupa
  };
}

function updateUrl(hash, paramsToSet = {}, replaceParams = false) {
    const url = new URL(window.location);
    const params = replaceParams ? new URLSearchParams() : new URLSearchParams(url.search);
    Object.entries(paramsToSet).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
    });
    url.search = params.toString();
    url.hash = hash;
    if (window.location.href !== url.href) {
        window.history.pushState({}, '', url);
    }
}

// --- BÖLÜM GÜNCELLEME FONKSİYONLARI ---

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
    displayFixtures(DOM.fixtures.container, teams, fixtures, seasonId, AppState.activeFixtureFilter);
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
        const { teams } = await getCachedSeasonData('3'); // Her zaman en güncel sezon takımlarını gösterir
        const searchInput = DOM.teams.searchInput.value.toLowerCase();
        const filteredTeams = teams.filter(team => team.name.toLowerCase().includes(searchInput));
        displayTeams(DOM.teams.container, filteredTeams);
    } catch(e) {
        console.error('Takımlar yüklenirken hata:', e);
        renderError(DOM.teams.container, "Takımlar yüklenemedi.");
    }
}

// --- NAVİGASYON ---

const sectionUpdaters = {
    'puan': updateStandings,
    'fikstur': updateFixtures,
    'kralliklar': updateDynamicSeasonSections,
    'butceler': updateDynamicSeasonSections,
    'cezalar': updateDynamicSeasonSections,
    'eurocup': updateEurocup,
    'h2h': updateHeadToHead,
    'takimlar': updateTeams,
    'anasayfa': (id) => updateUrl(`#${id}`),
    'kurallar': (id) => updateUrl(`#${id}`),
    'muze': (id) => updateUrl(`#${id}`),
};

function showSection(id) {
    DOM.navigation.sections.forEach(section => section.classList.toggle('active', section.id === id));
    DOM.navigation.navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    DOM.navigation.mobileNavLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    
    if (!DOM.navigation.mobileMenu.classList.contains('hidden')) {
        DOM.navigation.mobileMenu.classList.add('hidden');
    }

    const updater = sectionUpdaters[id];
    if (updater) {
        updater(id);
    }
}

// --- OLAY YÖNETİCİLERİ (EVENT HANDLERS) ---

function handleLinkClick(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href').substring(1);
    showSection(targetId);
}

function handlePageLoadOrPopState() {
    const hash = window.location.hash.substring(1) || 'anasayfa';
    const params = getUrlParams();
    DOM.standings.select.value = params.season;
    DOM.fixtures.select.value = params.season;
    DOM.kings.select.value = params.season;
    DOM.eurocup.select.value = params.cup;
    showSection(hash);
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
        console.error('Oyuncu modal bilgileri yüklenirken hata:', error);
        alert('Oyuncu bilgileri yüklenemedi.');
    }
}

// --- UYGULAMA BAŞLATMA ---

/**
 * Tüm event listener'ları merkezi olarak tanımlar ve DOM elemanlarına bağlar.
 */
function _addEventListeners() {
    // Navigasyon linkleri
    DOM.navigation.navLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileNavLinks.forEach(link => link.addEventListener('click', handleLinkClick));
    DOM.navigation.mobileMenuButton.addEventListener('click', () => DOM.navigation.mobileMenu.classList.toggle('hidden'));

    // Sayfa geçmişi (ileri/geri butonları)
    window.addEventListener('popstate', handlePageLoadOrPopState);

    // Sezon seçim menüleri
    [DOM.standings.select, DOM.fixtures.select, DOM.kings.select].forEach(sel => {
        sel.addEventListener('change', () => showSection(window.location.hash.substring(1) || 'puan'));
    });
    DOM.eurocup.select.addEventListener('change', () => showSection('eurocup'));
    
    // Fikstür filtre butonları
    DOM.fixtures.filters.addEventListener('click', (e) => {
        const button = e.target.closest('.fixture-filter-btn');
        if (!button) return;

        DOM.fixtures.filters.querySelectorAll('.fixture-filter-btn').forEach(btn => btn.classList.remove('active-filter'));
        button.classList.add('active-filter');

        AppState.activeFixtureFilter = button.dataset.filter;
        updateFixtures('fikstur');
    });

    // İkili Rekabet (H2H) menüleri
    const h2hHandler = () => {
        const team1 = DOM.h2h.team1Select.value;
        const team2 = DOM.h2h.team2Select.value;
        // Aynı takımın seçilmesini engelle
        for (const option of DOM.h2h.team2Select.options) { option.disabled = (option.value === team1 && team1 !== ""); }
        for (const option of DOM.h2h.team1Select.options) { option.disabled = (option.value === team2 && team2 !== ""); }
        showSection('h2h');
    };
    DOM.h2h.team1Select.addEventListener('change', h2hHandler);
    DOM.h2h.team2Select.addEventListener('change', h2hHandler);

    // Takım arama input'u
    DOM.teams.searchInput.addEventListener('input', () => updateTeams('takimlar'));

    // Modal yönetimi
    DOM.kings.container.addEventListener('click', handlePlayerClick);
    DOM.modal.element.addEventListener('click', (e) => { if (e.target.id === 'player-modal') closePlayerModal(); });
    
    // Yıl bilgisini footer'a ekle
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

/**
 * H2H bölümündeki takım seçim menülerini tüm sezonlardaki takımlarla doldurur.
 */
async function _populateH2HSelects() {
    try {
        const seasonIds = ['1', '2', '3'];
        const seasonPromises = seasonIds.map(id => getCachedSeasonData(id));
        const seasons = await Promise.all(seasonPromises);
        
        seasons.forEach((data, index) => {
            AppState.allSeasonsData[seasonIds[index]] = data;
        });

        const allTeams = Object.values(AppState.allSeasonsData).flatMap(s => s.teams);
        const uniqueTeams = Array.from(new Map(allTeams.map(team => [team.name, team])).values()).sort((a,b) => a.name.localeCompare(b.name));
        
        const populateSelect = (selectElement, placeholder) => {
            selectElement.innerHTML = `<option value="">${placeholder}</option>`;
            uniqueTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.name;
                option.textContent = team.name;
                selectElement.append(option);
            });
        };

        populateSelect(DOM.h2h.team1Select, '1. Takımı Seçin');
        populateSelect(DOM.h2h.team2Select, '2. Takımı Seçin');
    } catch (error) {
        console.error('H2H için başlangıç verileri yüklenirken kritik hata:', error);
        DOM.h2h.team1Select.innerHTML = '<option value="">Takımlar yüklenemedi</option>';
        DOM.h2h.team2Select.innerHTML = '<option value="">Takımlar yüklenemedi</option>';
    }
}

/**
 * Uygulamayı başlatan ana fonksiyon.
 */
async function initializeApp() {
    console.log('Uygulama başlatıldı: v2.0 - Filtreleme ve Refactoring');
    
    // Önce H2H menülerini dolduruyoruz, çünkü bu işlem asenkron.
    await _populateH2HSelects();

    // Ardından tüm event listener'ları bağlıyoruz.
    _addEventListeners();
    
    // Sayfa ilk yüklendiğinde URL'e göre doğru bölümü ve veriyi gösteriyoruz.
    handlePageLoadOrPopState();
}

// Uygulamayı başlat!
initializeApp();