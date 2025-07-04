/**
 * @file HAX Kerim Kara Ligi için tüm UI (Kullanıcı Arayüzü) oluşturma ve yönetme fonksiyonlarını içerir.
 * @description Bu dosya, güvenlik ve en iyi pratikler göz önünde bulundurularak yazılmıştır.
 * Dinamik verileri DOM'a enjekte etmek için 'innerHTML' yerine güvenli DOM oluşturma teknikleri kullanılır.
 * Bu, Cross-Site Scripting (XSS) saldırılarını önler.
 */

import { calculateStandings, calculateHeadToHeadStats } from './utils.js';

const DEFAULT_LOGO_PATH = 'img/default-logo.png';

// --- TEMEL VE GÜVENLİ DOM YARDIMCI FONKSİYONLARI ---

/**
 * Belirtilen etiket ve seçeneklerle güvenli bir DOM elemanı oluşturur.
 * Veri atamaları için 'textContent' kullanarak XSS zafiyetlerini önler.
 * @param {string} tag - Oluşturulacak HTML etiketi (örn: 'div', 'p', 'img').
 * @param {object} [options={}] - Elemana eklenecek özellikler.
 * @returns {HTMLElement} Oluşturulan DOM elemanı.
 */
function createDOMElement(tag, options = {}) {
    const element = document.createElement(tag);
    for (const key in options) {
        if (key === 'textContent') {
            element.textContent = options[key];
        } else if (key === 'dataset') {
            Object.assign(element.dataset, options[key]);
        } else {
            element.setAttribute(key, options[key]);
        }
    }
    return element;
}

/**
 * Bir konteyner elemanını temizler ve içine birden çok çocuk eleman ekler.
 * Performans için DocumentFragment kullanır.
 * @param {HTMLElement} container - İçeriği güncellenecek olan konteyner.
 * @param {Array<HTMLElement>} children - Konteynere eklenecek elemanlar dizisi.
 */
function updateContainer(container, children) {
    if (!container) return;
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    children.forEach(child => fragment.appendChild(child));
    container.appendChild(fragment);
}


// --- DURUM GÖSTERGE FONKSİYONLARI ---

export function showLoading(container) {
  const loadingElement = createDOMElement('p', { class: 'text-center text-gray-400 p-8 animate-pulse', textContent: 'Yükleniyor...' });
  updateContainer(container, [loadingElement]);
}

export function renderError(container, message = "Veri yüklenirken bir hata oluştu.") {
  const errorElement = createDOMElement('p', { class: 'text-center text-red-400 p-4', textContent: message });
  updateContainer(container, [errorElement]);
}

function renderEmpty(container, message) {
  const emptyElement = createDOMElement('p', { class: 'text-center text-gray-400 p-4', textContent: message });
  updateContainer(container, [emptyElement]);
}


// --- UI BİLEŞENİ OLUŞTURMA FONKSİYONLARI ---

function createTeamCard(team) {
  const card = createDOMElement('div', { class: 'bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700 transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/20 transform hover:-translate-y-1' });
  const playersContainer = createDOMElement('div', { class: 'flex flex-wrap justify-center gap-2' });
  (team.players || []).forEach(player => {
    playersContainer.append(createDOMElement('span', { class: 'bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full', textContent: player }));
  });
  
  const imgContainer = createDOMElement('div', { class: 'flex justify-center mb-4' });
  imgContainer.append(createDOMElement('img', { src: team.logo || DEFAULT_LOGO_PATH, alt: `${team.name} logo`, class: 'w-16 h-16 object-contain' }));
  
  const detailsDiv = createDOMElement('div', { class: 'mt-4 pt-4 border-t border-gray-700' });
  detailsDiv.append(
    createDOMElement('h4', { class: 'text-sm font-semibold text-gray-300 mb-2', textContent: 'Oyuncular' }),
    playersContainer
  );

  card.append(
    imgContainer,
    createDOMElement('h3', { class: 'text-xl font-bold text-white', textContent: team.name }),
    createDOMElement('p', { class: 'text-gray-400 text-sm mt-1', textContent: `Kaptan: ${team.captain}` }),
    detailsDiv
  );
  return card;
}

function createStatListItem(player, team, type, seasonId) {
    const valueColorClass = { goals: 'text-blue-400', assists: 'text-green-400', cleanSheets: 'text-cyan-400' }[type] || 'text-white';
    const listItem = createDOMElement('li', { class: 'flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 cursor-pointer', dataset: { playerName: player.name, seasonId: seasonId } });
    const leftDiv = createDOMElement('div', { class: 'flex items-center gap-3 pointer-events-none' });
    leftDiv.append(
        createDOMElement('img', { src: team?.logo ?? DEFAULT_LOGO_PATH, alt: 'Team Logo', class: 'w-6 h-6 object-contain' }),
        createDOMElement('span', { class: 'font-semibold text-white', textContent: player.name })
    );
    listItem.append(leftDiv, createDOMElement('span', { class: `font-bold ${valueColorClass} pointer-events-none`, textContent: player[type] || 0 }));
    return listItem;
}


// --- ANA BÖLÜM GÜNCELLEME FONKSİYONLARI ---

export function displayTeams(container, teamsData) {
  if (!teamsData) return renderError(container, 'Takım verisi işlenemedi.');
  if (teamsData.length === 0) return renderEmpty(container, 'Arama kriterlerine uygun takım bulunamadı.');
  updateContainer(container, teamsData.map(createTeamCard));
}

export function displayTopStats(container, title, titleColor, stats, type, teams, seasonId) {
  if (!stats || !teams) return renderError(container);
  const titleElement = createDOMElement('h3', { class: `text-lg font-bold text-center ${titleColor} mb-4 border-b border-gray-600 pb-2`, textContent: title });
  const list = createDOMElement('ul', { class: 'space-y-3' });
  if (stats.length === 0) {
    list.append(createDOMElement('li', { class: 'text-center text-gray-400', textContent: 'Veri yok.' }));
  } else {
    stats.forEach(p => {
      const team = teams.find(t => t.id === p.teamId);
      list.append(createStatListItem(p, team, type, seasonId));
    });
  }
  updateContainer(container, [titleElement, list]);
}

export function displayStandings(container, teams, fixtures, seasonId) {
    const standings = calculateStandings(teams, fixtures);
    if (standings.length === 0) return renderEmpty(container, 'Bu sezon için puan durumu verisi bulunamadı.');
    document.querySelector('#puan h2').textContent = `Puan Durumu - Sezon ${seasonId}`;
    const rows = standings.map((team, index) => {
        const row = createDOMElement('tr', { class: 'bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50' });
        
        const teamCell = createDOMElement('td', { class: 'px-6 py-4 flex items-center gap-3' });
        teamCell.append(
            createDOMElement('img', { src: team.logo || DEFAULT_LOGO_PATH, alt: `${team.name} logo`, class: 'w-10 h-10 rounded object-contain' }),
            createDOMElement('span', { class: 'font-semibold text-white', textContent: team.name })
        );

        row.append(
          createDOMElement('td', { class: `px-6 py-4 font-medium whitespace-nowrap ${index < 3 ? 'text-green-400' : ''}`, textContent: index + 1 }),
          teamCell,
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: team.played }),
          createDOMElement('td', { class: 'px-6 py-4 text-center font-bold text-green-400', textContent: team.win }),
          createDOMElement('td', { class: 'px-6 py-4 text-center font-bold text-yellow-400', textContent: team.draw }),
          createDOMElement('td', { class: 'px-6 py-4 text-center font-bold text-red-500', textContent: team.loss }),
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: team.goalsFor }),
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: team.goalsAgainst }),
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: `${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}` }),
          createDOMElement('td', { class: 'px-6 py-4 text-center font-bold text-white', textContent: team.points })
        );
        return row;
    });
    updateContainer(container, rows);
}

function createFixtureElement(fixture, teamsData, isEurocup = false) {
    const homeTeam = teamsData.find(t => t.id === fixture.homeTeamId);
    const awayTeam = teamsData.find(t => t.id === fixture.awayTeamId);
    if (!homeTeam || !awayTeam) return null;

    const fixtureElement = createDOMElement('div', { class: 'flex items-center justify-between p-2 sm:p-3 rounded-md' + (isEurocup ? '' : ' hover:bg-gray-700/50') });
    
    const createTeamDiv = (team, align) => {
        const div = createDOMElement('div', { class: `flex items-center gap-2 sm:gap-3 w-2/5 min-w-0 ${align === 'right' ? 'text-right justify-end' : ''}`});
        const name = createDOMElement('span', { class: 'font-semibold text-white truncate sm:inline', textContent: team.name });
        const logo = createDOMElement('img', { src: team.logo || DEFAULT_LOGO_PATH, alt: `${team.name} logo`, class: 'w-6 h-6 sm:w-8 sm:h-8 object-contain rounded' });
        div.append(...(align === 'right' ? [name, logo] : [logo, name]));
        return div;
    };
    
    const scoreDiv = createDOMElement('div', { class: 'w-1/5 sm:w-1/5 text-center flex items-center justify-center min-w-max' });
    
    if (fixture.status === 'Oynandı' && fixture.homeScore !== null) {
              scoreDiv.append(
            createDOMElement('span', { class: 'font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white', textContent: fixture.homeScore }),
            createDOMElement('span', { class: 'font-bold text-gray-400 mx-1 sm:mx-3', textContent: '-' }),
            createDOMElement('span', { class: 'font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white', textContent: fixture.awayScore })
        );
        
    } else {
        scoreDiv.append(createDOMElement('span', { class: 'text-xs sm:text-sm text-gray-400', textContent: fixture.date || 'Belirsiz' }));
    }

    fixtureElement.append(createTeamDiv(homeTeam, 'right'), scoreDiv, createTeamDiv(awayTeam, 'left'));
    return fixtureElement;
}

export function displayFixtures(container, teamsData, fixturesData, seasonId, filter = 'all') {
    // Başlığı sezona göre dinamik olarak güncelliyoruz.
    document.querySelector('#fikstur h2').textContent = `Fikstür - Sezon ${seasonId}`;

    // Gelen filtre parametresine göre fikstür verisini süzüyoruz.
    let filteredFixtures = fixturesData;
    if (filter === 'played') {
        filteredFixtures = fixturesData.filter(f => f.status === 'Oynandı');
    } else if (filter === 'unplayed') {
        filteredFixtures = fixturesData.filter(f => f.status !== 'Oynandı');
    }

    // Eğer filtrelenmiş veri veya ham veri boş ise, kullanıcıya uygun bir mesaj gösterip fonksiyondan çıkıyoruz.
    if (filteredFixtures.length === 0) {
        const message = filter === 'all' 
            ? 'Bu sezon için fikstür verisi bulunamadı.' 
            : 'Bu filtreye uygun maç bulunamadı.';
        return renderEmpty(container, message);
    }

    // Filtrelenmiş fikstürleri haftalara göre grupluyoruz.
    const groupedByWeek = filteredFixtures.reduce((acc, f) => {
        const week = f.week || 'Diğer'; // Olası 'week' tanımsızlığına karşı koruma
        if (!acc[week]) {
            acc[week] = [];
        }
        acc[week].push(f);
        return acc;
    }, {});

    // Haftaları sayısal olarak sıralayarak her bir hafta için bir maç kartı oluşturuyoruz.
    const weekContainers = Object.keys(groupedByWeek)
        .sort((a, b) => Number(a) - Number(b))
        .map(week => {
            const weekContainer = createDOMElement('div', { class: 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 mb-8' });
            weekContainer.append(
                createDOMElement('h3', { 
                    class: 'text-lg sm:text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2', 
                    textContent: `${week}. Hafta Maçları` 
                })
            );
            
            // O haftanın maçlarını `createFixtureElement` ile oluşturup konteynere ekliyoruz.
            groupedByWeek[week].forEach(fixture => {
                const fixtureElement = createFixtureElement(fixture, teamsData);
                if (fixtureElement) {
                    weekContainer.appendChild(fixtureElement);
                }
            });
            return weekContainer;
        });

    // Oluşturulan tüm hafta konteynerlerini ana konteynere tek seferde ekliyoruz.
    updateContainer(container, weekContainers);
}

export function displayEurocupFixtures(container, teamsData, fixturesData) {
    if (!teamsData || !fixturesData || fixturesData.length === 0) return renderEmpty(container, 'Bu turnuva için fikstür verisi bulunamadı.');
    const groupedByStage = fixturesData.reduce((acc, f) => ({...acc, [f.stageName || 'Diğer']: [...(acc[f.stageName || 'Diğer'] || []), f]}), {});
    const stageOrder = ['Yarı Final', "3.'lük Maçı", 'Final'];
    const stageContainers = stageOrder.map(stageName => {
        if (!groupedByStage[stageName]) return null;
        const stageContainer = createDOMElement('div', { class: 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 mb-8' });
        stageContainer.append(createDOMElement('h3', { class: 'text-lg sm:text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2', textContent: stageName }));
        groupedByStage[stageName].map(f => createFixtureElement(f, teamsData, true)).forEach(el => el && stageContainer.appendChild(el));
        return stageContainer;
    }).filter(Boolean);
    updateContainer(container, stageContainers);
}

export function displayBudgets(container, teamsData) {
    if (teamsData.length === 0) return renderEmpty(container, 'Bütçe verisi bulunamadı.');
    const budgetCards = teamsData.map(team => {
        const card = createDOMElement('div', { class: 'bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between shadow hover:shadow-lg transition' });
        
        const teamInfoDiv = createDOMElement('div', { class: 'flex items-center gap-4' });
        const textContainer = createDOMElement('div'); // Yazılar için bir konteyner oluşturuluyor

        // Takım ve kaptan adını oluşturan elementler bu yeni konteynere ekleniyor
        textContainer.append(
            createDOMElement('h3', { class: 'text-white font-bold text-lg', textContent: team.name }),
            createDOMElement('p', { class: 'text-sm text-gray-400', textContent: `Kaptan: ${team.captain}` })
        );

        // Logo ve yazı konteyneri ana bilgi div'ine ekleniyor
        teamInfoDiv.append(
            createDOMElement('img', { src: team.logo || 'img/default-logo.png', alt: `${team.name} logo`, class: 'w-12 h-12 rounded object-contain' }),
            textContainer
        );

        const budgetDiv = createDOMElement('div', { class: 'text-right' });
        budgetDiv.append(
            createDOMElement('p', { class: 'text-sm text-gray-400', textContent: 'Bütçe' }),
            createDOMElement('p', { class: 'text-2xl font-bold text-green-400', textContent: `${team.budget}M€` })
        );
        
        card.append(teamInfoDiv, budgetDiv);
        return card;
    });
    updateContainer(container, budgetCards);
}

export function displaySuspendedPlayers(container, teamsData, playerStats) {
  const suspendedPlayers = playerStats.filter(p => p.suspension);
  if (suspendedPlayers.length === 0) return renderEmpty(container, 'Cezalı oyuncu yok.');
  const suspendedCards = suspendedPlayers.map(player => {
    const team = teamsData.find(t => t.id === player.teamId);
    const card = createDOMElement('div', { class: 'flex flex-col bg-red-900/30 border border-red-700 p-4 rounded-xl mb-3 shadow max-w-2xl mx-auto' });
    const mainDiv = createDOMElement('div', { class: 'flex items-center justify-between mb-2' });
    const playerInfo = createDOMElement('div', { class: 'flex items-center gap-4' });
    playerInfo.append(
      createDOMElement('img', { src: team?.logo ?? DEFAULT_LOGO_PATH, alt: team?.name ?? 'Takımsız', class: 'w-10 h-10 object-contain rounded' }),
      createDOMElement('div', {}, [
        createDOMElement('p', { class: 'text-white font-bold', textContent: `${player.name} (${team?.name ?? 'Takımsız'})` }),
        createDOMElement('p', { class: 'text-white text-lg', textContent: player.redCards > 0 ? `🟥 ${player.redCards}` : `🟨 ${player.yellowCards}` })
      ])
    );
    mainDiv.append(playerInfo);
    const reasonDiv = createDOMElement('div', { class: 'text-sm text-white mt-1 px-1' });
    reasonDiv.append(
      createDOMElement('span', {textContent: `📝 Ceza Nedeni: `}),
      createDOMElement('span', {class: 'font-semibold', textContent: player.suspension.reason}),
      createDOMElement('br'),
      createDOMElement('span', {class: 'italic text-gray-400 text-xs', textContent: `${player.suspension.bannedWeek}. hafta maçını kaçıracak.`}),
    );
    card.append(mainDiv, reasonDiv);
    return card;
  });
  updateContainer(container, suspendedCards);
}

export function displayHeadToHeadResults(container, matches, allSeasonsData, team1Name, team2Name) {
    if (matches.length === 0) return renderEmpty(container, 'Bu iki takım arasında oynanmış bir maç bulunamadı.');
    const stats = calculateHeadToHeadStats(matches, team1Name, allSeasonsData);
    const statsContainer = createDOMElement('div', { class: 'flex justify-around items-center p-4 mb-4 bg-gray-900/50 rounded-lg' });
    const createStatDiv = (value, label) => {
      const div = createDOMElement('div', {class: 'text-center'});
      div.append(
        createDOMElement('p', {class: 'text-2xl font-bold text-white', textContent: value}),
        createDOMElement('p', {class: 'text-sm text-gray-400', textContent: label}),
      );
      return div;
    }
    statsContainer.append(
      createStatDiv(stats.team1Wins, `${team1Name} Galibiyet`),
      createStatDiv(stats.draws, 'Beraberlik'),
      createStatDiv(stats.team2Wins, `${team2Name} Galibiyet`),
    );
    const matchElements = matches
        .sort((a, b) => (a.seasonId - b.seasonId) || (a.week - b.week))
        .map(match => createFixtureElement(match, allSeasonsData[match.seasonId].teams));
    updateContainer(container, [statsContainer, ...matchElements]);
}


// --- MODAL YÖNETİM FONKSİYONLARI ---

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
    const createStatDiv = (label, value, color) => {
        const div = createDOMElement('div');
        div.append(
            createDOMElement('p', { class: 'text-sm text-gray-400', textContent: label }),
            createDOMElement('p', { class: `text-2xl font-bold ${color}`, textContent: value || 0 })
        );
        return div;
    };
    const playerInfoDiv = createDOMElement('div', { class: 'flex items-center gap-4' });
    playerInfoDiv.append(
      createDOMElement('img', { src: team?.logo ?? DEFAULT_LOGO_PATH, alt: team?.name ?? 'Takımsız', class: 'w-16 h-16 object-contain rounded-full border-2 border-gray-600' }),
      createDOMElement('div', {}, [
        createDOMElement('h3', { class: 'text-2xl font-bold text-white', textContent: player.name }),
        createDOMElement('p', { class: 'text-gray-400', textContent: team?.name ?? 'Takımsız' })
      ])
    );
    const statsGrid = createDOMElement('div', { class: 'grid grid-cols-3 gap-4 text-center' });
    statsGrid.append(
        createStatDiv('Gol', player.goals, 'text-blue-400'),
        createStatDiv('Asist', player.assists, 'text-green-400'),
        createStatDiv('Clean Sheet', player.cleanSheets, 'text-cyan-400')
    );
    const containerDiv = createDOMElement('div', { class: 'p-6' });
    containerDiv.append(
      createDOMElement('div', { class: 'flex items-center justify-between mb-4' }, [
        playerInfoDiv,
        createDOMElement('button', { id: 'modal-close-button', class: 'text-3xl text-gray-500 hover:text-white transition-colors', textContent: '×' })
      ]),
      createDOMElement('div', { class: 'bg-gray-900/50 p-4 rounded-lg' }, [
        createDOMElement('h4', { class: 'font-semibold text-lg text-white mb-2', textContent: 'İstatistikler' }),
        statsGrid
      ])
    );
    updateContainer(modalContent, [containerDiv]);
}