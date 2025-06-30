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
 * @param {object} options - Elemana eklenecek özellikler.
 * @property {string} [options.class] - Elemanın CSS sınıfları.
 * @property {string} [options.textContent] - Elemanın metin içeriği (güvenli).
 * @property {string} [options.src] - 'img' etiketleri için kaynak URL'i.
 * @property {string} [options.alt] - 'img' etiketleri için alternatif metin.
 * @property {string} [options.id] - Elemanın ID'si.
 * @property {object} [options.dataset] - Elemana eklenecek 'data-*' özellikleri.
 * @returns {HTMLElement} Oluşturulan DOM elemanı.
 */
function createDOMElement(tag, options = {}) {
    const element = document.createElement(tag);
    for (const key in options) {
        if (key === 'textContent') {
            element.textContent = options[key];
        } else if (key === 'dataset') {
            Object.assign(element.dataset, options[key]);
        } 
        else {
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
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    children.forEach(child => fragment.appendChild(child));
    container.appendChild(fragment);
}


// --- DURUM GÖSTERGE FONKSİYONLARI ---

/**
 * Konteyner içine "Yükleniyor..." mesajı yerleştirir.
 * @param {HTMLElement} container - Mesajın gösterileceği konteyner.
 */
export function showLoading(container) {
  if (!container) return;
  const loadingElement = createDOMElement('p', {
      class: 'text-center text-gray-400 p-8 animate-pulse',
      textContent: 'Yükleniyor...'
  });
  updateContainer(container, [loadingElement]);
}

/**
 * Konteyner içine bir hata mesajı yerleştirir.
 * @param {HTMLElement} container - Mesajın gösterileceği konteyner.
 * @param {string} [message] - Gösterilecek hata mesajı.
 */
export function renderError(container, message = "Veri yüklenirken bir hata oluştu.") {
  if (!container) return;
  const errorElement = createDOMElement('p', {
      class: 'text-center text-red-400 p-4',
      textContent: message
  });
  updateContainer(container, [errorElement]);
}

/**
 * Konteyner içine "veri yok" veya benzeri bir boş durum mesajı yerleştirir.
 * @param {HTMLElement} container - Mesajın gösterileceği konteyner.
 * @param {string} message - Gösterilecek mesaj.
 */
function renderEmpty(container, message) {
  if (!container) return;
  const emptyElement = createDOMElement('p', {
      class: 'text-center text-gray-400 p-4',
      textContent: message
  });
  updateContainer(container, [emptyElement]);
}


// --- UI BİLEŞENİ OLUŞTURMA FONKSİYONLARI ---

/**
 * Bir takım için bilgi kartı (card) DOM elemanı oluşturur.
 * @param {object} team - Takım verisi.
 * @returns {HTMLElement} Oluşturulan takım kartı.
 */
function createTeamCard(team) {
  const card = createDOMElement('div', { class: 'bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700 transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/20 transform hover:-translate-y-1' });

  const playersContainer = createDOMElement('div', { class: 'flex flex-wrap justify-center gap-2' });
  (team.players || []).forEach(player => {
    playersContainer.append(createDOMElement('span', {
      class: 'bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full',
      textContent: player
    }));
  });
  
  card.append(
    createDOMElement('div', { class: 'flex justify-center mb-4' }, [
      createDOMElement('img', { src: team.logo || DEFAULT_LOGO_PATH, alt: `${team.name} logo`, class: 'w-16 h-16 object-contain' })
    ]),
    createDOMElement('h3', { class: 'text-xl font-bold text-white', textContent: team.name }),
    createDOMElement('p', { class: 'text-gray-400 text-sm mt-1', textContent: `Kaptan: ${team.captain}` }),
    createDOMElement('div', { class: 'mt-4 pt-4 border-t border-gray-700' }, [
      createDOMElement('h4', { class: 'text-sm font-semibold text-gray-300 mb-2', textContent: 'Oyuncular' }),
      playersContainer
    ])
  );
  
  return card;
}

/**
 * Krallıklar listesi için tek bir oyuncu satırı oluşturur.
 * @param {object} player - Oyuncu istatistik verisi.
 * @param {object} team - Oyuncunun takımı.
 * @param {'goals'|'assists'|'cleanSheets'} type - Gösterilecek istatistik türü.
 * @param {string} seasonId - Sezon ID'si.
 * @returns {HTMLElement} Oluşturulan liste elemanı.
 */
function createStatListItem(player, team, type, seasonId) {
    const valueColorClass = {
        goals: 'text-blue-400',
        assists: 'text-green-400',
        cleanSheets: 'text-cyan-400'
    }[type] || 'text-white';

    const listItem = createDOMElement('li', {
        class: 'flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 cursor-pointer',
        dataset: { playerName: player.name, seasonId: seasonId }
    });

    const leftDiv = createDOMElement('div', { class: 'flex items-center gap-3 pointer-events-none' });
    leftDiv.append(
        createDOMElement('img', { src: team?.logo ?? DEFAULT_LOGO_PATH, alt: 'Team Logo', class: 'w-6 h-6 object-contain' }),
        createDOMElement('span', { class: 'font-semibold text-white', textContent: player.name })
    );

    const rightSpan = createDOMElement('span', { class: `font-bold ${valueColorClass} pointer-events-none`, textContent: player[type] || 0 });

    listItem.append(leftDiv, rightSpan);
    return listItem;
}


// --- ANA BÖLÜM GÜNCELLEME FONKSİYONLARI ---

/**
 * Takımlar bölümünü render eder.
 * @param {HTMLElement} container - Takım kartlarının ekleneceği konteyner.
 * @param {Array<object>} teamsData - Takım verileri dizisi.
 */
export function displayTeams(container, teamsData) {
  if (!teamsData) return renderError(container, 'Takım verisi işlenemedi.');
  if (teamsData.length === 0) return renderEmpty(container, 'Arama kriterlerine uygun takım bulunamadı.');
  updateContainer(container, teamsData.map(createTeamCard));
}

/**
 * Gol, Asist veya Clean Sheet krallığı bölümünü render eder.
 * @param {HTMLElement} container - Bölümün render edileceği konteyner.
 * @param {string} title - Bölüm başlığı.
 * @param {string} titleColor - Başlık rengi için CSS sınıfı.
 * @param {Array<object>} stats - Sıralanmış oyuncu istatistikleri.
 * @param {'goals'|'assists'|'cleanSheets'} type - İstatistik türü.
 * @param {Array<object>} teams - Tüm takımların listesi.
 * @param {string} seasonId - Sezon ID'si.
 */
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

/**
 * Puan durumu tablosunu render eder.
 * @param {HTMLElement} container - Tablo body'sinin (`tbody`) render edileceği eleman.
 * @param {Array<object>} teams - Takımlar verisi.
 * @param {Array<object>} fixtures - Fikstür verisi.
 * @param {string} seasonId - Sezon ID'si.
 */
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
          createDOMElement('td', { class: 'px-6 py-4 text-center text-green-400', textContent: team.win }),
          createDOMElement('td', { class: 'px-6 py-4 text-center text-yellow-400', textContent: team.draw }),
          createDOMElement('td', { class: 'px-6 py-4 text-center text-red-400', textContent: team.loss }),
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: team.goalsFor }),
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: team.goalsAgainst }),
          createDOMElement('td', { class: 'px-6 py-4 text-center', textContent: `${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}` }),
          createDOMElement('td', { class: 'px-6 py-4 text-center font-bold text-white', textContent: team.points })
        );
        return row;
    });
    updateContainer(container, rows);
}

/**
 * Fikstür bölümünü haftalara göre gruplayarak render eder.
 * @param {HTMLElement} container - Fikstürün render edileceği konteyner.
 * @param {Array<object>} teamsData - Takımlar verisi.
 * @param {Array<object>} fixturesData - Fikstür verisi.
 * @param {string} seasonId - Sezon ID'si.
 */
export function displayFixtures(container, teamsData, fixturesData, seasonId) {
    if (fixturesData.length === 0) return renderEmpty(container, 'Bu sezon için fikstür verisi bulunamadı.');

    document.querySelector('#fikstur h2').textContent = `Fikstür - Sezon ${seasonId}`;

    const groupedByWeek = fixturesData.reduce((acc, fixture) => {
        (acc[fixture.week] = acc[fixture.week] || []).push(fixture);
        return acc;
    }, {});

    const weekContainers = Object.keys(groupedByWeek).sort((a,b) => Number(a) - Number(b)).map(week => {
        const weekContainer = createDOMElement('div', { class: 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 mb-8' });
        weekContainer.append(createDOMElement('h3', { class: 'text-lg sm:text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2', textContent: `${week}. Hafta Maçları` }));
        
        groupedByWeek[week].forEach(fixture => {
            const homeTeam = teamsData.find(t => t.id === fixture.homeTeamId);
            const awayTeam = teamsData.find(t => t.id === fixture.awayTeamId);
            if (!homeTeam || !awayTeam) return;

            const fixtureElement = createDOMElement('div', { class: 'flex items-center justify-between p-2 sm:p-3 rounded-md hover:bg-gray-700/50' });
            
            const homeTeamDiv = createDOMElement('div', { class: 'flex items-center gap-2 sm:gap-3 text-right justify-end w-2/5 min-w-0' });
            homeTeamDiv.append(
                createDOMElement('span', { class: 'font-semibold text-white truncate sm:inline', textContent: homeTeam.name }),
                createDOMElement('img', { src: homeTeam.logo || DEFAULT_LOGO_PATH, alt: `${homeTeam.name} logo`, class: 'w-6 h-6 sm:w-8 sm:h-8 object-contain rounded' })
            );

            const scoreDiv = createDOMElement('div', { class: 'w-1/5 text-center flex items-center justify-center min-w-max' });
            if (fixture.status === 'Oynandı' && fixture.homeScore !== null) {
                scoreDiv.append(
                    createDOMElement('span', { class: 'font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white', textContent: fixture.homeScore }),
                    createDOMElement('span', { class: 'font-bold text-gray-400 mx-1 sm:mx-3', textContent: '-' }),
                    createDOMElement('span', { class: 'font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white', textContent: fixture.awayScore })
                );
            } else {
                scoreDiv.append(createDOMElement('span', { class: 'text-xs sm:text-sm text-gray-400', textContent: fixture.date || 'Belirsiz' }));
            }

            const awayTeamDiv = createDOMElement('div', { class: 'flex items-center gap-2 sm:gap-3 w-2/5 min-w-0' });
            awayTeamDiv.append(
                createDOMElement('img', { src: awayTeam.logo || DEFAULT_LOGO_PATH, alt: `${awayTeam.name} logo`, class: 'w-6 h-6 sm:w-8 sm:h-8 object-contain rounded' }),
                createDOMElement('span', { class: 'font-semibold text-white truncate sm:inline', textContent: awayTeam.name })
            );

            fixtureElement.append(homeTeamDiv, scoreDiv, awayTeamDiv);
            weekContainer.appendChild(fixtureElement);
        });
        return weekContainer;
    });
    updateContainer(container, weekContainers);
}


// --- MODAL YÖNETİM FONKSİYONLARI ---

/**
 * Oyuncu detayları modal'ını açar.
 */
export function openPlayerModal() {
  document.getElementById('player-modal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

/**
 * Oyuncu detayları modal'ını kapatır.
 */
export function closePlayerModal() {
  document.getElementById('player-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}

/**
 * Oyuncu detayları modal'ının içeriğini doldurur.
 * @param {object} player - Oyuncu verisi.
 * @param {object} team - Takım verisi.
 */
export function populatePlayerModal(player, team) {
    const modalContent = document.getElementById('player-modal-content');
    if (!modalContent) return;

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