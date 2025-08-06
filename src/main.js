/*
  src/main.js
  Improvements summary (see bottom for explanations):
  - Readability/Maintainability: unified helpers, stricter null-safety, smaller functions, early-returns, centralized constants
  - Performance: keep in-flight de-dup, add microtask batching, minor memoization helpers, reduce DOM thrash, reuse URLSearchParams
  - Patterns: single update runner, idempotent URL updates, immutable config, explicit guards, narrow try/catch
  - Error handling: consistent renderError, graceful empty states, detailed logs, defensive optional chains
*/

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

/* ---------- CONSTANTS ---------- */

const DEFAULTS = Object.freeze({
  season: '3',
  cup: '25',
  h2hSeasons: ['1', '2', '3'],
});

const SECTION_IDS = Object.freeze([
  'puan',
  'fikstur',
  'kralliklar',
  'butceler',
  'cezalar',
  'eurocup',
  'h2h',
  'takimlar',
  'anasayfa',
  'kurallar',
  'muze',
]);

const TEXTS = Object.freeze({
  errors: {
    loadGeneric: 'Veri yüklenemedi.',
    standings: 'Puan durumu yüklenemedi.',
    fixtures: 'Fikstür yüklenemedi.',
    dynamic: 'Dinamik sezon verileri yüklenemedi.',
    eurocup: 'Eurocup verisi yüklenemedi.',
    h2h: 'Maç geçmişi yüklenemedi.',
    h2hSelectTwo: 'Karşılaşma geçmişini görmek için lütfen iki farklı takım seçin.',
    h2hDifferentTeams: 'Lütfen iki farklı takım seçin.',
    playerModal: 'Oyuncu bilgileri yüklenemedi.',
  },
  h2h: {
    team1Placeholder: '1. Takımı Seçin',
    team2Placeholder: '2. Takımı Seçin',
    teamsFailed: 'Takımlar yüklenemedi',
  },
  topStats: {
    scorers: 'Gol Krallığı',
    assists: 'Asist Krallığı',
    cleanSheets: 'Clean Sheet',
  },
  console: {
    appStart: 'Uygulama başlatıldı: v2.3 - Daha sağlam ve performanslı',
    h2hInitFail: 'H2H için başlangıç verileri yüklenirken kritik hata:',
    playerNotFound: 'Oyuncu bulunamadı:',
    playerModalError: 'Oyuncu modal bilgileri yüklenirken hata:',
  },
});

/* ---------- STATE ---------- */

const AppState = {
  seasonCache: new Map(),  // seasonId -> data
  eurocupCache: new Map(), // cupId -> data
  inflight: {
    season: new Map(),     // seasonId -> Promise
    cup: new Map(),        // cupId -> Promise
  },
  allSeasonsData: {},      // seasonId -> data (for H2H)
  activeFixtureFilter: 'all',
};

/* ---------- SAFE DOM HELPERS ---------- */

const byId = (id) => document.getElementById(id);
const must = (el, name) => {
  if (!el) throw new Error(`Required DOM element missing: ${name}`);
  return el;
};
const safeText = (value) => (value == null ? '' : String(value));

const DOM = {
  standings: {
    select: byId('seasonSelectStandings'),
    container: byId('standings-table-body'),
  },
  fixtures: {
    select: byId('seasonSelectFixtures'),
    container: byId('fixtures-container'),
    filters: byId('fixture-filters'),
  },
  kings: {
    select: byId('seasonSelectKings'),
    container: byId('kralliklar-container'),
    scorersContainer: byId('top-scorers'),
    assistsContainer: byId('top-assists'),
    cleanSheetsContainer: byId('top-cleansheets'),
  },
  eurocup: {
    select: byId('seasonSelectEurocup'),
    container: byId('eurocup-fixtures-container'),
  },
  teams: {
    container: byId('teams-container'),
    searchInput: byId('team-search-input'),
  },
  budgets: { container: byId('budget-container') },
  suspensions: { container: byId('suspended-players-container') },
  h2h: {
    team1Select: byId('h2h-team1-select'),
    team2Select: byId('h2h-team2-select'),
    resultsContainer: byId('h2h-results-container'),
  },
  modal: { element: byId('player-modal') },
  navigation: {
    sections: document.querySelectorAll('.content-section'),
    navLinks: document.querySelectorAll('.nav-link'),
    mobileNavLinks: document.querySelectorAll('.nav-link-mobile'),
    mobileMenu: byId('mobile-menu'),
    mobileMenuButton: byId('mobile-menu-button'),
  },
};

/* ---------- DATA (CACHE + IN-FLIGHT MERGING) ---------- */

async function getCachedData(cache, inflightMap, key, fetchFn) {
  if (cache.has(key)) return cache.get(key);
  if (inflightMap.has(key)) return inflightMap.get(key);

  const p = (async () => {
    try {
      const data = await fetchFn(key);
      cache.set(key, data);
      return data;
    } finally {
      inflightMap.delete(key);
    }
  })();

  inflightMap.set(key, p);
  return p;
}

const getCachedSeasonData = (seasonId) =>
  getCachedData(AppState.seasonCache, AppState.inflight.season, seasonId, getSeasonData);

const getCachedEurocupData = (cupId) =>
  getCachedData(AppState.eurocupCache, AppState.inflight.cup, cupId, getEurocupData);

/* ---------- URL MANAGEMENT ---------- */

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    season: params.get('season') || DEFAULTS.season,
    cup: params.get('cup') || DEFAULTS.cup,
  };
}

function updateUrl(hash, paramsToSet = {}, replaceParams = false) {
  const url = new URL(window.location.href);
  const params = replaceParams ? new URLSearchParams() : new URLSearchParams(url.search);

  for (const [key, value] of Object.entries(paramsToSet)) {
    if (value != null && value !== '') params.set(key, String(value));
    else params.delete(key);
  }

  url.search = params.toString();
  url.hash = hash;

  if (window.location.href !== url.href) {
    window.history.pushState({}, '', url);
  }
}

/* ---------- UNIFIED UPDATE RUNNER ---------- */

async function runSectionUpdate({
  hashId,
  loadingTargets = [],
  urlParams = {},
  replaceParams = true,
  task,
  onErrorMessage = TEXTS.errors.loadGeneric,
}) {
  updateUrl(`#${hashId}`, urlParams, replaceParams);
  loadingTargets.forEach((el) => el && showLoading(el));

  try {
    await task();
  } catch (error) {
    console.error(`[${hashId}] update failed:`, error);
    loadingTargets.forEach((el) => el && renderError(el, onErrorMessage));
  }
}

/* ---------- SECTION UPDATERS ---------- */

async function updateStandings(id) {
  const seasonId = DOM.standings.select?.value || DEFAULTS.season;

  await runSectionUpdate({
    hashId: id,
    loadingTargets: [DOM.standings.container],
    urlParams: { season: seasonId },
    onErrorMessage: TEXTS.errors.standings,
    task: async () => {
      const data = await getCachedSeasonData(seasonId);
      const teams = data?.teams ?? [];
      const fixtures = data?.fixtures ?? [];
      displayStandings(must(DOM.standings.container, 'standings container'), teams, fixtures, seasonId);
    },
  });
}

async function updateFixtures(id) {
  const seasonId = DOM.fixtures.select?.value || DEFAULTS.season;

  await runSectionUpdate({
    hashId: id,
    loadingTargets: [DOM.fixtures.container],
    urlParams: { season: seasonId },
    onErrorMessage: TEXTS.errors.fixtures,
    task: async () => {
      const data = await getCachedSeasonData(seasonId);
      const teams = data?.teams ?? [];
      const fixtures = data?.fixtures ?? [];
      displayFixtures(
        must(DOM.fixtures.container, 'fixtures container'),
        teams,
        fixtures,
        seasonId,
        AppState.activeFixtureFilter
      );
    },
  });
}

function createTopStatsRenderers(containers, teams, playerStats, seasonId) {
  const safeStats = Array.isArray(playerStats) ? playerStats : [];
  // Small stable sort helper
  const sortedBy = (key) => [...safeStats].sort((a, b) => (b?.[key] || 0) - (a?.[key] || 0));

  return [
    () => displayTopStats(containers.scorersContainer, TEXTS.topStats.scorers, 'text-yellow-400', sortedBy('goals'), 'goals', teams, seasonId),
    () => displayTopStats(containers.assistsContainer, TEXTS.topStats.assists, 'text-green-400', sortedBy('assists'), 'assists', teams, seasonId),
    () => displayTopStats(containers.cleanSheetsContainer, TEXTS.topStats.cleanSheets, 'text-cyan-400', sortedBy('cleanSheets'), 'cleanSheets', teams, seasonId),
  ];
}

async function updateDynamicSeasonSections(id) {
  const seasonId = DOM.kings.select?.value || DEFAULTS.season;

  await runSectionUpdate({
    hashId: id,
    loadingTargets: [
      DOM.kings.scorersContainer,
      DOM.kings.assistsContainer,
      DOM.kings.cleanSheetsContainer,
      DOM.budgets.container,
      DOM.suspensions.container,
    ],
    urlParams: { season: seasonId },
    onErrorMessage: TEXTS.errors.dynamic,
    task: async () => {
      const data = await getCachedSeasonData(seasonId);
      const teams = data?.teams ?? [];
      const playerStats = data?.playerStats ?? [];

      // Microtask scheduling helps coalesce paints in some browsers
      const renderers = createTopStatsRenderers(DOM.kings, teams, playerStats, seasonId);
      renderers.forEach((fn) => Promise.resolve().then(fn));

      displayBudgets(must(DOM.budgets.container, 'budget container'), teams);
      displaySuspendedPlayers(must(DOM.suspensions.container, 'suspended players container'), teams, playerStats);
    },
  });
}

async function updateEurocup(id) {
  const cupId = DOM.eurocup.select?.value || DEFAULTS.cup;

  await runSectionUpdate({
    hashId: id,
    loadingTargets: [DOM.eurocup.container],
    urlParams: { cup: cupId },
    onErrorMessage: TEXTS.errors.eurocup,
    task: async () => {
      const data = await getCachedEurocupData(cupId);
      const teams = data?.teams ?? [];
      const fixtures = data?.fixtures ?? [];
      displayEurocupFixtures(must(DOM.eurocup.container, 'eurocup container'), teams, fixtures);
    },
  });
}

async function updateHeadToHead(id) {
  const team1Name = DOM.h2h.team1Select?.value || '';
  const team2Name = DOM.h2h.team2Select?.value || '';
  const container = must(DOM.h2h.resultsContainer, 'h2h results container');

  if (!team1Name || !team2Name) {
    container.innerHTML = `<p class="text-center text-gray-400 p-4">${TEXTS.errors.h2hSelectTwo}</p>`;
    updateUrl(`#${id}`);
    return;
  }
  if (team1Name === team2Name) {
    renderError(container, TEXTS.errors.h2hDifferentTeams);
    updateUrl(`#${id}`);
    return;
  }

  await runSectionUpdate({
    hashId: id,
    loadingTargets: [container],
    urlParams: {},
    replaceParams: false,
    onErrorMessage: TEXTS.errors.h2h,
    task: async () => {
      const matches = findMatchesByTeamNames(team1Name, team2Name, AppState.allSeasonsData) ?? [];
      displayHeadToHeadResults(container, matches, AppState.allSeasonsData, team1Name, team2Name);
    },
  });
}

async function updateTeams(id) {
  await runSectionUpdate({
    hashId: id,
    loadingTargets: [DOM.teams.container],
    urlParams: {},
    replaceParams: false,
    onErrorMessage: TEXTS.errors.loadGeneric,
    task: async () => {
      const data = await getCachedSeasonData(DEFAULTS.season);
      const teams = data?.teams ?? [];
      const q = safeText(DOM.teams.searchInput?.value).trim().toLowerCase();
      const filtered = q ? teams.filter((t) => t?.name?.toLowerCase().includes(q)) : teams;
      displayTeams(must(DOM.teams.container, 'teams container'), filtered);
    },
  });
}

/* ---------- NAVIGATION ---------- */

const sectionUpdaters = {
  puan: updateStandings,
  fikstur: updateFixtures,
  kralliklar: updateDynamicSeasonSections,
  butceler: updateDynamicSeasonSections,
  cezalar: updateDynamicSeasonSections,
  eurocup: updateEurocup,
  h2h: updateHeadToHead,
  takimlar: updateTeams,
  anasayfa: (id) => updateUrl(`#${id}`),
  kurallar: (id) => updateUrl(`#${id}`),
  muze: (id) => updateUrl(`#${id}`),
};

function showSection(id) {
  if (!SECTION_IDS.includes(id)) return;

  // Toggle sections
  DOM.navigation.sections.forEach((section) =>
    section.classList.toggle('active', section.id === id),
  );

  // Mark active links
  const markActive = (link) => {
    const isActive = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', isActive);
  };
  DOM.navigation.navLinks.forEach(markActive);
  DOM.navigation.mobileNavLinks.forEach(markActive);

  // Close mobile menu if open
  if (DOM.navigation.mobileMenu && !DOM.navigation.mobileMenu.classList.contains('hidden')) {
    DOM.navigation.mobileMenu.classList.add('hidden');
  }

  const updater = sectionUpdaters[id];
  if (typeof updater === 'function') {
    void updater(id);
  }
}

/* ---------- EVENT HANDLERS ---------- */

function handleLinkClick(e) {
  e.preventDefault();
  const href = e.currentTarget.getAttribute('href') || '';
  const targetId = href.startsWith('#') ? href.slice(1) : href;
  showSection(targetId);
}

function syncSelectsFromUrlParams() {
  const params = getUrlParams();
  if (DOM.standings.select) DOM.standings.select.value = params.season;
  if (DOM.fixtures.select) DOM.fixtures.select.value = params.season;
  if (DOM.kings.select) DOM.kings.select.value = params.season;
  if (DOM.eurocup.select) DOM.eurocup.select.value = params.cup;
}

function handlePageLoadOrPopState() {
  const hash = (window.location.hash || '').slice(1) || 'anasayfa';
  syncSelectsFromUrlParams();
  showSection(hash);
}

async function handlePlayerClick(event) {
  const li = event.target.closest('li[data-season-id]');
  if (!li) return;

  const playerName = li.dataset.playerName;
  const seasonId = li.dataset.seasonId;
  if (!playerName || !seasonId) return;

  try {
    const seasonData = await getCachedSeasonData(seasonId);
    const player = seasonData?.playerStats?.find?.((p) => p.name === playerName);
    if (!player) {
      console.warn(TEXTS.console.playerNotFound, playerName);
      return;
    }

    const team = seasonData?.teams?.find?.((t) => t.id === player.teamId);
    populatePlayerModal(player, team);
    openPlayerModal();
    const closeBtn = byId('modal-close-button');
    if (closeBtn) closeBtn.addEventListener('click', closePlayerModal, { once: true });
  } catch (error) {
    console.error(TEXTS.console.playerModalError, error);
    renderError(must(DOM.kings.container, 'kings container'), TEXTS.errors.playerModal);
  }
}

/* ---------- INIT ---------- */

function addEventListeners() {
  // Navigation
  DOM.navigation.navLinks.forEach((link) => link.addEventListener('click', handleLinkClick));
  DOM.navigation.mobileNavLinks.forEach((link) => link.addEventListener('click', handleLinkClick));
  DOM.navigation.mobileMenuButton?.addEventListener('click', () =>
    DOM.navigation.mobileMenu?.classList.toggle('hidden'),
  );

  // History
  window.addEventListener('popstate', handlePageLoadOrPopState);

  // Season selects
  [DOM.standings.select, DOM.fixtures.select, DOM.kings.select]
    .filter(Boolean)
    .forEach((sel) => sel.addEventListener('change', () => {
      const currentHash = (window.location.hash || '').slice(1) || 'puan';
      showSection(currentHash);
    }));

  // Eurocup select
  DOM.eurocup.select?.addEventListener('change', () => showSection('eurocup'));

  // Fixture filters
  DOM.fixtures.filters?.addEventListener('click', (e) => {
    const button = e.target.closest('.fixture-filter-btn');
    if (!button) return;

    // Single pass class toggling
    DOM.fixtures.filters.querySelectorAll('.fixture-filter-btn').forEach((btn) =>
      btn.classList.toggle('active-filter', btn === button),
    );

    AppState.activeFixtureFilter = button.dataset.filter || 'all';
    void updateFixtures('fikstur');
  });

  // H2H select sync + guard
  const h2hHandler = () => {
    const team1 = DOM.h2h.team1Select?.value || '';
    const team2 = DOM.h2h.team2Select?.value || '';

    if (DOM.h2h.team2Select) {
      for (const option of DOM.h2h.team2Select.options) {
        option.disabled = option.value === team1 && team1 !== '';
      }
    }
    if (DOM.h2h.team1Select) {
      for (const option of DOM.h2h.team1Select.options) {
        option.disabled = option.value === team2 && team2 !== '';
      }
    }
    showSection('h2h');
  };
  DOM.h2h.team1Select?.addEventListener('change', h2hHandler);
  DOM.h2h.team2Select?.addEventListener('change', h2hHandler);

  // Team search (lightweight; no debounce needed unless dataset grows)
  DOM.teams.searchInput?.addEventListener('input', () => void updateTeams('takimlar'));

  // Modal delegation
  DOM.kings.container?.addEventListener('click', handlePlayerClick);
  DOM.modal.element?.addEventListener('click', (e) => {
    if (e.target?.id === 'player-modal') closePlayerModal();
  });

  // Footer year (avoid optional chaining on the LHS)
  const currentYearEl = byId('current-year');
  if (currentYearEl) {
    currentYearEl.textContent = String(new Date().getFullYear());
  }
}

/**
 * Populate H2H selects with unique teams across configured seasons.
 */
async function populateH2HSelects() {
  try {
    const seasons = await Promise.all(DEFAULTS.h2hSeasons.map((id) => getCachedSeasonData(id)));

    seasons.forEach((data, idx) => {
      AppState.allSeasonsData[DEFAULTS.h2hSeasons[idx]] = data;
    });

    const allTeams = Object.values(AppState.allSeasonsData).flatMap((s) => s?.teams || []);
    const uniqueTeams = Array.from(new Map(allTeams.map((t) => [t?.name, t])).values())
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    const populate = (selectEl, placeholder) => {
      if (!selectEl) return;
      // Use DocumentFragment to minimize reflows
      const frag = document.createDocumentFragment();
      const first = document.createElement('option');
      first.value = '';
      first.textContent = placeholder;
      frag.appendChild(first);

      for (const team of uniqueTeams) {
        const opt = document.createElement('option');
        opt.value = team.name;
        opt.textContent = team.name;
        frag.appendChild(opt);
      }
      selectEl.innerHTML = '';
      selectEl.appendChild(frag);
    };

    populate(DOM.h2h.team1Select, TEXTS.h2h.team1Placeholder);
    populate(DOM.h2h.team2Select, TEXTS.h2h.team2Placeholder);
  } catch (error) {
    console.error(TEXTS.console.h2hInitFail, error);
    if (DOM.h2h.team1Select) DOM.h2h.team1Select.innerHTML = `<option value="">${TEXTS.h2h.teamsFailed}</option>`;
    if (DOM.h2h.team2Select) DOM.h2h.team2Select.innerHTML = `<option value="">${TEXTS.h2h.teamsFailed}</option>`;
  }
}

/* ---------- APP START ---------- */

async function initializeApp() {
  console.log(TEXTS.console.appStart);

  await populateH2HSelects();
  addEventListeners();
  handlePageLoadOrPopState();

  // Lint-safe footer year update (avoid optional chaining on LHS)
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

initializeApp();

/* ---------- EXPLANATIONS ----------
1) Readability/Maintainability
- Centralized copy: added TEXTS constant to avoid string duplication and ease future i18n.
- Extracted safeText helper to normalize undefined/null to empty string.
- Early returns preserved; section updaters kept small and focused.
- Narrowed responsibilities: showSection only toggles UI and invokes the correct updater.
- Strengthened must() usage for critical containers to fail-fast if markup regresses.

2) Performance
- Kept in-flight dedupe for season/cup fetches and caches.
- Microtask batching for top stats rendering to coalesce paints.
- Reduced DOM thrash: H2H select population uses DocumentFragment and single replace.
- Avoid unnecessary URL pushState: only pushes when the href actually changes.
- Single-pass toggles for fixture filter buttons.

3) Best Practices & Patterns
- Immutable configuration via Object.freeze for DEFAULTS, SECTION_IDS, TEXTS.
- Unified update runner (runSectionUpdate) to standardize loading and error handling.
- Defensive optional chaining wherever data may be missing.
- Idempotent URL updates via updateUrl().
- Consistent event handler patterns and null checks before property reads.

4) Error Handling & Edge Cases
- Consistent renderError messages via TEXTS.errors.
- Graceful empty states for H2H when teams not selected or same team selected.
- Defensive search in player modal loader; logs missing player and guards addEventListener.
- Catch-all logging with context for each section via runSectionUpdate.
- Guarded DOM node access with must() where required and optional chaining elsewhere.

Notes
- Behavior and UI contract preserved.
- Debounce for team search intentionally omitted; add if dataset grows significantly.
--------------------------------------------------------------------- */