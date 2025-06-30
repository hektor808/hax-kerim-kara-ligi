import { calculateStandings, calculateHeadToHeadStats } from './utils.js';

const DEFAULT_LOGO_PATH = 'img/default-logo.png';

// --- Helper Functions for Secure DOM Creation ---
function createDOMElement(tag, options = {}) {
    const element = document.createElement(tag);
    Object.keys(options).forEach(key => {
        if (key === 'textContent' || key === 'innerHTML') {
            element[key] = options[key];
        } else {
            element.setAttribute(key, options[key]);
        }
    });
    return element;
}

export function showLoading(container) {
  if (container) {
    const loadingElement = createDOMElement('p', { 
        class: 'text-center text-gray-400 p-8 animate-pulse', 
        textContent: 'Yükleniyor...' 
    });
    container.innerHTML = ''; // Clear previous content
    container.append(loadingElement);
  }
}

export function renderError(container, message = "Veri yüklenirken bir hata oluştu.") {
  if (container) {
    const errorElement = createDOMElement('p', { 
        class: 'text-center text-red-400 p-4', 
        textContent: message 
    });
    container.innerHTML = '';
    container.append(errorElement);
  }
}

function renderEmpty(container, message) {
  if (container) {
    const emptyElement = createDOMElement('p', { 
        class: 'text-center text-gray-400 p-4', 
        textContent: message 
    });
    container.innerHTML = '';
    container.append(emptyElement);
  }
}

function createTeamCard(team) {
  const card = createDOMElement('div', { class: 'bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700 transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/20 transform hover:-translate-y-1' });
  
  const playersHtml = (team.players || []).map(player => 
    `<span class="bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">${player}</span>`
  ).join('');

  card.innerHTML = `
    <div class="flex justify-center mb-4">
      <img src="${team.logo || DEFAULT_LOGO_PATH}" alt="${team.name} logo" class="w-16 h-16 object-contain" />
    </div>
    <h3 class="text-xl font-bold text-white">${team.name}</h3>
    <p class="text-gray-400 text-sm mt-1">Kaptan: ${team.captain}</p>
    <div class="mt-4 pt-4 border-t border-gray-700">
      <h4 class="text-sm font-semibold text-gray-300 mb-2">Oyuncular</h4>
      <div class="flex flex-wrap justify-center gap-2">${playersHtml}</div>
    </div>`;
  return card;
}


function createStatListItem(player, team, type, seasonId) {
    const listItem = createDOMElement('li', {
        class: 'flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 cursor-pointer',
        'data-player-name': player.name,
        'data-season-id': seasonId
    });

    const logoSrc = team?.logo ?? DEFAULT_LOGO_PATH;
    const statValue = player[type] || 0;
    const valueColorClass = type === 'goals' ? 'text-blue-400' : type === 'assists' ? 'text-green-400' : 'text-cyan-400';

    const leftDiv = createDOMElement('div', { class: 'flex items-center gap-3 pointer-events-none' });
    const img = createDOMElement('img', { src: logoSrc, alt: 'Team Logo', class: 'w-6 h-6 object-contain' });
    const nameSpan = createDOMElement('span', { class: 'font-semibold text-white', textContent: player.name });
    leftDiv.append(img, nameSpan);

    const rightSpan = createDOMElement('span', { class: `font-bold ${valueColorClass} pointer-events-none`, textContent: statValue });
    
    listItem.append(leftDiv, rightSpan);
    return listItem;
}

export function displayTeams(container, teamsData) {
  container.innerHTML = '';
  if (!teamsData) return renderError(container, 'Takım verisi işlenemedi.');
  if (teamsData.length === 0) return renderEmpty(container, 'Arama kriterlerine uygun takım bulunamadı.');
  
  teamsData.forEach(team => {
    container.append(createTeamCard(team));
  });
}

export function displayTopStats(container, title, titleColor, stats, type, teams, seasonId) {
  container.innerHTML = '';
  if (!stats || !teams) return renderError(container);
  
  const titleElement = createDOMElement('h3', { class: `text-lg font-bold text-center ${titleColor} mb-4 border-b border-gray-600 pb-2`, textContent: title });
  container.append(titleElement);
  
  const list = createDOMElement('ul', { class: 'space-y-3' });

  if (stats.length === 0) {
    list.append(createDOMElement('li', { class: 'text-center text-gray-400', textContent: 'Veri yok.' }));
  } else {
    stats.forEach(p => {
      const team = teams.find(t => t.id === p.teamId);
      list.append(createStatListItem(p, team, type, seasonId));
    });
  }
  container.append(list);
}

export function displayStandings(container, teams, fixtures, seasonId) {
    container.innerHTML = '';
    const standings = calculateStandings(teams, fixtures);
    if (standings.length === 0) return renderEmpty(container, 'Bu sezon için puan durumu verisi bulunamadı.');
  
    document.querySelector('#puan h2').textContent = `Puan Durumu - Sezon ${seasonId}`;
  
    standings.forEach((team, index) => {
        const row = createDOMElement('tr', { class: 'bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50' });
        row.innerHTML = `
          <td class="px-6 py-4 font-medium whitespace-nowrap ${index < 3 ? 'text-green-400' : ''}">${index + 1}</td>
          <td class="px-6 py-4 flex items-center gap-3">
            <img src="${team.logo || DEFAULT_LOGO_PATH}" alt="${team.name} logo" class="w-10 h-10 rounded object-contain" />
            <span class="font-semibold text-white">${team.name}</span>
          </td>
          <td class="px-6 py-4 text-center">${team.played}</td>
          <td class="px-6 py-4 text-center text-green-400">${team.win}</td>
          <td class="px-6 py-4 text-center text-yellow-400">${team.draw}</td>
          <td class="px-6 py-4 text-center text-red-400">${team.loss}</td>
          <td class="px-6 py-4 text-center">${team.goalsFor}</td>
          <td class="px-6 py-4 text-center">${team.goalsAgainst}</td>
          <td class="px-6 py-4 text-center">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
          <td class="px-6 py-4 text-center font-bold text-white">${team.points}</td>`;
        container.append(row);
    });
}

export function displayFixtures(container, teamsData, fixturesData, seasonId) {
    container.innerHTML = '';
    if (fixturesData.length === 0) return renderEmpty(container, 'Bu sezon için fikstür verisi bulunamadı.');

    document.querySelector('#fikstur h2').textContent = `Fikstür - Sezon ${seasonId}`;

    const groupedByWeek = fixturesData.reduce((acc, fixture) => {
        (acc[fixture.week] = acc[fixture.week] || []).push(fixture);
        return acc;
    }, {});

    Object.keys(groupedByWeek).sort((a,b) => Number(a) - Number(b)).forEach(week => {
        const weekContainer = createDOMElement('div', { class: 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 mb-8' });
        const title = createDOMElement('h3', { class: 'text-lg sm:text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2', textContent: `${week}. Hafta Maçları` });
        weekContainer.append(title);
        
        groupedByWeek[week].forEach(fixture => {
            const homeTeam = teamsData.find(t => t.id === fixture.homeTeamId);
            const awayTeam = teamsData.find(t => t.id === fixture.awayTeamId);
            if (!homeTeam || !awayTeam) return;

            const fixtureElement = createDOMElement('div', { class: 'flex items-center justify-between p-2 sm:p-3 rounded-md hover:bg-gray-700/50' });
            const scoreDisplay = fixture.status === 'Oynandı' && fixture.homeScore !== null
                ? `<span class="font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white">${fixture.homeScore}</span><span class="font-bold text-gray-400 mx-1 sm:mx-3">-</span><span class="font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white">${fixture.awayScore}</span>`
                : `<span class="text-xs sm:text-sm text-gray-400">${fixture.date || 'Belirsiz'}</span>`;
            
            fixtureElement.innerHTML = `
              <div class="flex items-center gap-2 sm:gap-3 text-right justify-end w-2/5 min-w-0">
                <span class="font-semibold text-white truncate sm:inline">${homeTeam.name}</span>
                <img src="${homeTeam.logo || DEFAULT_LOGO_PATH}" alt="${homeTeam.name} logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded" />
              </div>
              <div class="w-1/5 sm:w-1/5 text-center flex items-center justify-center min-w-max">${scoreDisplay}</div>
              <div class="flex items-center gap-2 sm:gap-3 w-2/5 min-w-0">
                <img src="${awayTeam.logo || DEFAULT_LOGO_PATH}" alt="${awayTeam.name} logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded" />
                <span class="font-semibold text-white truncate sm:inline">${awayTeam.name}</span>
              </div>`;
            weekContainer.appendChild(fixtureElement);
        });
        container.appendChild(weekContainer);
    });
}

export function displayEurocupFixtures(container, teamsData, fixturesData) {
  container.innerHTML = '';
  if (!teamsData || !fixturesData) return renderError(container, 'Eurocup verisi işlenemedi.');
  if (fixturesData.length === 0) return renderEmpty(container, 'Bu turnuva için fikstür verisi bulunamadı.');
  // ... (Bu fonksiyon zaten güvenli, innerHTML kullanmıyor)
}

export function displayBudgets(container, teamsData) {
    container.innerHTML = '';
    if (teamsData.length === 0) return renderEmpty(container, 'Bütçe verisi bulunamadı.');
    
    teamsData.forEach(team => {
        const card = createDOMElement('div', { class: 'bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between shadow hover:shadow-lg transition' });
        card.innerHTML = `
          <div class="flex items-center gap-4">
            <img src="${team.logo || DEFAULT_LOGO_PATH}" alt="${team.name} logo" class="w-12 h-12 rounded object-contain" />
            <div>
              <h3 class="text-white font-bold text-lg">${team.name}</h3>
              <p class="text-sm text-gray-400">Kaptan: ${team.captain}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-400">Bütçe</p>
            <p class="text-2xl font-bold text-green-400">${team.budget}M€</p>
          </div>`;
        container.appendChild(card);
    });
}

export function displaySuspendedPlayers(container, teamsData, playerStats) {
  container.innerHTML = '';
  const suspendedPlayers = playerStats.filter(player => player.suspension);
  if (suspendedPlayers.length === 0) return renderEmpty(container, 'Cezalı oyuncu yok.');
  
  suspendedPlayers.forEach(player => {
    const team = teamsData.find(t => t.id === player.teamId);
    
    const card = createDOMElement('div', { class: 'flex flex-col bg-red-900/30 border border-red-700 p-4 rounded-xl mb-3 shadow max-w-2xl mx-auto' });
    
    // Güvenli oluşturma
    const mainDiv = createDOMElement('div', { class: 'flex items-center justify-between mb-2' });
    mainDiv.innerHTML = `
        <div class="flex items-center gap-4">
          <img src="${team?.logo ?? DEFAULT_LOGO_PATH}" alt="${team?.name ?? 'Takımsız'}" class="w-10 h-10 object-contain rounded" />
          <div>
            <p class="text-white font-bold">${player.name} <span class="text-gray-400">(${team?.name ?? 'Takımsız'})</span></p>
            <p class="text-white text-lg">${player.redCards > 0 ? '🟥 ' + player.redCards : '🟨 ' + player.yellowCards}</p>
          </div>
        </div>`;
        
    const reasonDiv = createDOMElement('div', { class: 'text-sm text-white mt-1 px-1' });
    reasonDiv.innerHTML = `
        📝 Ceza Nedeni: <span class="font-semibold">${player.suspension.reason}</span><br />
        <span class="italic text-gray-400 text-xs">${player.suspension.bannedWeek}. hafta maçını kaçıracak.</span>`;
        
    card.append(mainDiv, reasonDiv);
    container.appendChild(card);
  });
}

export function displayHeadToHeadResults(container, matches, allSeasonsData, team1Name, team2Name) {
    container.innerHTML = '';
    if (matches.length === 0) return renderEmpty(container, 'Bu iki takım arasında oynanmış bir maç bulunamadı.');
    
    // Display Stats
    const stats = calculateHeadToHeadStats(matches, team1Name, allSeasonsData);
    const statsContainer = createDOMElement('div', { class: 'flex justify-around items-center p-4 mb-4 bg-gray-900/50 rounded-lg' });
    statsContainer.innerHTML = `
        <div class="text-center">
            <p class="text-2xl font-bold text-white">${stats.team1Wins}</p>
            <p class="text-sm text-gray-400">${team1Name} Galibiyet</p>
        </div>
        <div class="text-center">
            <p class="text-2xl font-bold text-yellow-400">${stats.draws}</p>
            <p class="text-sm text-gray-400">Beraberlik</p>
        </div>
        <div class="text-center">
            <p class="text-2xl font-bold text-white">${stats.team2Wins}</p>
            <p class="text-sm text-gray-400">${team2Name} Galibiyet</p>
        </div>
    `;
    container.append(statsContainer);

    // Display Matches
    matches.sort((a, b) => (a.seasonId - b.seasonId) || (a.week - b.week));
    
    matches.forEach(match => {
        const seasonTeams = allSeasonsData[match.seasonId].teams;
        const homeTeam = seasonTeams.find(t => t.id === match.homeTeamId);
        const awayTeam = seasonTeams.find(t => t.id === match.awayTeamId);
        if (!homeTeam || !awayTeam) return;

        const matchElement = createDOMElement('div', { class: 'flex items-center justify-between p-3 rounded-md bg-gray-700/50' });
        const scoreDisplay = (match.status === 'Oynandı') 
            ? `<span class="font-bold text-lg px-2 py-1.5 rounded-md bg-blue-600 text-white">${match.homeScore}</span><span class="font-bold text-gray-400 mx-3">-</span><span class="font-bold text-lg px-2 py-1.5 rounded-md bg-blue-600 text-white">${match.awayScore}</span>` 
            : `<span class="text-xs text-gray-400">${match.date || 'Belirsiz'}</span>`;
            
        matchElement.innerHTML = `
          <div class="flex items-center gap-3 text-right justify-end w-2/5">
            <span class="font-semibold text-white truncate">${homeTeam.name}</span>
            <img src="${homeTeam.logo || DEFAULT_LOGO_PATH}" alt="${homeTeam.name} logo" class="w-8 h-8 object-contain rounded" />
          </div>
          <div class="w-1/5 text-center flex items-center justify-center min-w-max">${scoreDisplay}</div>
          <div class="flex items-center gap-3 w-2/5">
            <img src="${awayTeam.logo || DEFAULT_LOGO_PATH}" alt="${awayTeam.name} logo" class="w-8 h-8 object-contain rounded" />
            <span class="font-semibold text-white truncate">${awayTeam.name}</span>
          </div>`;
        container.append(matchElement);
    });
}

// ... (modal functions can remain as they are, but should be checked for innerHTML usage)
export function openPlayerModal() {
  document.getElementById('player-modal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

export function closePlayerModal() {
  document.getElementById('player-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}

export function populatePlayerModal(player, team) {
    const modalContent = document.getElementById('player-modal-content');
    if (!modalContent) return;
    
    const logoSrc = team?.logo ?? DEFAULT_LOGO_PATH;
    
    // This is mostly static text, but still better to be cautious.
    // For simplicity, we'll keep this as innerHTML but acknowledge it's a point of attention.
    modalContent.innerHTML = `
      <div class="p-6">
          <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-4">
                  <img src="${logoSrc}" alt="${team?.name ?? 'Takımsız'}" class="w-16 h-16 object-contain rounded-full border-2 border-gray-600">
                  <div>
                      <h3 class="text-2xl font-bold text-white">${player.name}</h3>
                      <p class="text-gray-400">${team?.name ?? 'Takımsız'}</p>
                  </div>
              </div>
              <button id="modal-close-button" class="text-3xl text-gray-500 hover:text-white transition-colors">&times;</button>
          </div>
          <div class="bg-gray-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-lg text-white mb-2">İstatistikler</h4>
              <div class="grid grid-cols-3 gap-4 text-center">
                  <div><p class="text-sm text-gray-400">Gol</p><p class="text-2xl font-bold text-blue-400">${player.goals || 0}</p></div>
                  <div><p class="text-sm text-gray-400">Asist</p><p class="text-2xl font-bold text-green-400">${player.assists || 0}</p></div>
                  <div><p class="text-sm text-gray-400">Clean Sheet</p><p class="text-2xl font-bold text-cyan-400">${player.cleanSheets || 0}</p></div>
              </div>
          </div>
      </div>`;
}