import { calculateStandings } from './utils.js';

function renderLoading(container) {
    container.innerHTML = `<p class="text-center text-gray-400 p-4">Yükleniyor...</p>`;
}

function renderError(container) {
    container.innerHTML = `<p class="text-center text-red-400 p-4">Veri yüklenirken bir hata oluştu.</p>`;
}

export function displayStandings(container, teams, fixtures) {
    if (!teams || !fixtures) {
        renderError(container);
        return;
    }
    const standings = calculateStandings(teams, fixtures);
    container.innerHTML = ''; // Önce temizle

    if (standings.length === 0) {
        container.innerHTML = `<tr><td colspan="10" class="text-center p-4 text-gray-400">Bu sezon için puan durumu verisi bulunamadı.</td></tr>`;
        return;
    }

    standings.forEach((team, index) => {
        const row = `
            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td class="px-6 py-4 font-medium whitespace-nowrap ${index < 3 ? 'text-green-400' : ''}">${index + 1}</td>
                <td class="px-6 py-4 flex items-center gap-3">
                    <img src="${team.logo}" alt="${team.name} logo" class="w-10 h-10 rounded object-contain" />
                    <span class="font-semibold text-white">${team.name}</span>
                </td>
                <td class="px-6 py-4 text-center">${team.played}</td>
                <td class="px-6 py-4 text-center text-green-400">${team.win}</td>
                <td class="px-6 py-4 text-center text-yellow-400">${team.draw}</td>
                <td class="px-6 py-4 text-center text-red-400">${team.loss}</td>
                <td class="px-6 py-4 text-center">${team.goalsFor}</td>
                <td class="px-6 py-4 text-center">${team.goalsAgainst}</td>
                <td class="px-6 py-4 text-center">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
                <td class="px-6 py-4 text-center font-bold text-white">${team.points}</td>
            </tr>
        `;
        container.innerHTML += row;
    });
}

export function displayFixtures(container, teamsData, fixturesData) {
     if (!teamsData || !fixturesData) {
        renderError(container);
        return;
    }
    container.innerHTML = '';
    
    const groupedByWeek = fixturesData.reduce((acc, fixture) => {
        acc[fixture.week] = acc[fixture.week] || [];
        acc[fixture.week].push(fixture);
        return acc;
    }, {});

    if (Object.keys(groupedByWeek).length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 p-4">Bu sezon için fikstür verisi bulunamadı.</p>`;
        return;
    }

    for (const week in groupedByWeek) {
        const weekContainer = document.createElement('div');
        weekContainer.className = 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700'; 
        const weekTitle = document.createElement('h3');
        weekTitle.className = 'text-lg sm:text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2';
        weekTitle.textContent = `${week}. Hafta Maçları`;
        weekContainer.appendChild(weekTitle);
        
        groupedByWeek[week].forEach(fixture => {
            const homeTeam = teamsData.find(t => t.id === fixture.homeTeamId);
            const awayTeam = teamsData.find(t => t.id === fixture.awayTeamId);

            if (!homeTeam || !awayTeam) return;

            const fixtureElement = document.createElement('div');
            fixtureElement.className = 'flex items-center justify-between p-2 sm:p-3 rounded-md hover:bg-gray-700/50';

            let scoreDisplay;
            if(fixture.status === 'Oynandı') {
                scoreDisplay = `
                    <span class="font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white">${fixture.homeScore}</span>
                    <span class="font-bold text-gray-400 mx-1 sm:mx-3">-</span>
                    <span class="font-bold text-lg sm:text-xl px-2 py-1.5 rounded-md bg-blue-600 text-white">${fixture.awayScore}</span>
                `;
            } else {
                scoreDisplay = `<span class="text-xs sm:text-sm text-gray-400">${fixture.date || 'Belirsiz'}</span>`;
            }

            fixtureElement.innerHTML = `
                <div class="flex items-center gap-2 sm:gap-3 text-right justify-end w-2/5 sm:w-2/5 min-w-0">
                    <span class="font-semibold text-white truncate sm:inline">${homeTeam.name}</span>
                    <img src="${homeTeam.logo}" alt="${homeTeam.name} logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded" />
                </div>
                <div class="w-1/5 sm:w-1/5 text-center flex items-center justify-center min-w-max">
                    ${scoreDisplay}
                </div>
                <div class="flex items-center gap-2 sm:gap-3 w-2/5 sm:w-2/5 min-w-0">
                    <img src="${awayTeam.logo}" alt="${awayTeam.name} logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded" />
                    <span class="font-semibold text-white truncate sm:inline">${awayTeam.name}</span>
                </div>
            `;
            weekContainer.appendChild(fixtureElement);
        });
        container.appendChild(weekContainer);
    }
}

export function displayEurocupFixtures(container, teamsData, fixturesData) {
    if (!teamsData || !fixturesData) {
        renderError(container);
        return;
    }
    container.innerHTML = '';

    const stageNames = { 1: 'Yarı Final', 3: '3.’lük Maçı', 2: 'Final' };
    const groupedByStage = fixturesData.reduce((acc, fixture) => {
        acc[fixture.stageId] = acc[fixture.stageId] || [];
        acc[fixture.stageId].push(fixture);
        return acc;
    }, {});

    const stagesOrder = [1, 3, 2];

    stagesOrder.forEach(stageId => {
        if (!groupedByStage[stageId]) return;

        const stageContainer = document.createElement('div');
        stageContainer.className = 'bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 max-w-2xl mx-auto mt-6';
        const stageTitle = document.createElement('h3');
        stageTitle.className = 'text-lg sm:text-xl font-bold text-white mb-4 border-b border-blue-600 pb-2';
        stageTitle.textContent = stageNames[stageId] || 'Maçlar';
        stageContainer.appendChild(stageTitle);

        groupedByStage[stageId].forEach(fixture => {
            const homeTeam = teamsData.find(t => t.id === fixture.homeTeamId);
            const awayTeam = teamsData.find(t => t.id === fixture.awayTeamId);

            const fixtureElement = document.createElement('div');
            fixtureElement.className = 'flex items-center justify-between p-2 sm:p-3 rounded-md hover:bg-gray-700/50';

            let scoreDisplay;
            if (fixture.status === 'Oynandı') {
                scoreDisplay = `
                    <span class="font-bold text-lg sm:text-xl px-2 py-1 rounded-md bg-blue-600 text-white">${fixture.homeScore}</span>
                    <span class="font-bold text-gray-400 mx-3.25">-</span>
                    <span class="font-bold text-lg sm:text-xl px-2 py-1 rounded-md bg-blue-600 text-white">${fixture.awayScore}</span>
                `;
            } else {
                scoreDisplay = `<span class="text-xs sm:text-sm text-gray-400">${fixture.date || 'Tarih yok'}</span>`;
            }

            fixtureElement.innerHTML = `
                <div class="flex items-center gap-2 sm:gap-3 text-right justify-end w-2/5 min-w-0">
                    <span class="font-semibold text-white truncate">${homeTeam ? homeTeam.name : 'Belirlenmedi'}</span>
                    <img src="${homeTeam ? homeTeam.logo : 'https://images.emojiterra.com/google/noto-emoji/unicode-16.0/color/svg/1f3f3.svg'}" class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded" />
                </div>
                <div class="w-[24%] text-center flex items-center justify-center">
                    ${scoreDisplay}
                </div>
                <div class="flex items-center gap-2 sm:gap-3 w-2/5 min-w-0">
                    <img src="${awayTeam ? awayTeam.logo : 'https://images.emojiterra.com/google/noto-emoji/unicode-16.0/color/svg/1f3f3.svg'}" class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded" />
                    <span class="font-semibold text-white truncate">${awayTeam ? awayTeam.name : 'Belirlenmedi'}</span>
                </div>
            `;
            stageContainer.appendChild(fixtureElement);
        });
        container.appendChild(stageContainer);
    });
}

export function displayTopStats(scorersContainer, assistsContainer, cleanSheetsContainer, teams, playerStats) {
     if (!teams || !playerStats) {
        renderError(scorersContainer);
        renderError(assistsContainer);
        renderError(cleanSheetsContainer);
        return;
    }
    // Gol Krallığı
    const topScorers = playerStats.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
    scorersContainer.innerHTML = `
        <h3 class="text-lg font-bold text-center text-yellow-400 mb-4 border-b border-yellow-500 pb-2">Gol Krallığı</h3>
        <ul class="space-y-3">
        ${topScorers.length === 0 ? '<li class="text-center text-gray-400">Veri yok.</li>' : topScorers.map(p => {
            const team = teams.find(t => t.id === p.teamId);
            return `
            <li class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="${team?.logo || ''}" class="w-6 h-6 object-contain" />
                    <span class="text-white">${p.name}</span>
                </div>
                <span class="text-blue-400 font-bold">${p.goals}</span>
            </li>`;
        }).join('')}
        </ul>`;

    // Asist Krallığı
    const topAssists = playerStats.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
    assistsContainer.innerHTML = `
        <h3 class="text-lg font-bold text-center text-green-400 mb-4 border-b border-green-500 pb-2">Asist Krallığı</h3>
        <ul class="space-y-3">
        ${topAssists.length === 0 ? '<li class="text-center text-gray-400">Veri yok.</li>' : topAssists.map(p => {
            const team = teams.find(t => t.id === p.teamId);
            return `
            <li class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="${team?.logo || ''}" class="w-6 h-6 object-contain" />
                    <span class="text-white">${p.name}</span>
                </div>
                <span class="text-green-400 font-bold">${p.assists}</span>
            </li>`;
        }).join('')}
        </ul>`;

    // Clean Sheet
    const topKeepers = playerStats.filter(p => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets);
    cleanSheetsContainer.innerHTML = `
        <h3 class="text-lg font-bold text-center text-cyan-400 mb-4 border-b border-cyan-500 pb-2">Clean Sheet</h3>
        <ul class="space-y-3">
        ${topKeepers.length === 0 ? '<li class="text-center text-gray-400">Veri yok.</li>' : topKeepers.map(p => {
            const team = teams.find(t => t.id === p.teamId);
            return `
            <li class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="${team?.logo || ''}" class="w-6 h-6 object-contain" />
                    <span class="text-white">${p.name}</span>
                </div>
                <span class="text-cyan-400 font-bold">${p.cleanSheets}</span>
            </li>`;
        }).join('')}
        </ul>`;
}

export function displayTeams(container, teamsData) {
    if (!teamsData) {
        renderError(container);
        return;
    }
    container.innerHTML = '';
    
    if(teamsData.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 p-4">Takım verisi bulunamadı.</p>`;
        return;
    }

    teamsData.forEach(team => {
        const card = `
            <div class="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700 transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/20 transform hover:-translate-y-1">
                <div class="flex justify-center mb-4">
                <img src="${team.logo}" alt="${team.name} logo" class="w-16 h-16 object-contain" />
                </div>
                <h3 class="text-xl font-bold text-white">${team.name}</h3>
                <p class="text-gray-400 text-sm mt-1">Kaptan: ${team.captain}</p>
                <div class="mt-4 pt-4 border-t border-gray-700">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Oyuncular</h4>
                    <div class="flex flex-wrap justify-center gap-2">
                        ${team.players.map(player => `<span class="bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">${player}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

export function displayBudgets(container, teamsData) {
    if (!teamsData) {
        renderError(container);
        return;
    }
    container.innerHTML = '';

    if(teamsData.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 p-4">Bütçe verisi bulunamadı.</p>`;
        return;
    }

    teamsData.forEach(team => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between shadow hover:shadow-lg transition';
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="${team.logo}" alt="${team.name} logo" class="w-12 h-12 rounded object-contain" />
                <div>
                    <h3 class="text-white font-bold text-lg">${team.name}</h3>
                    <p class="text-sm text-gray-400">Kaptan: ${team.captain}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm text-gray-400">Bütçe</p>
                <p class="text-2xl font-bold text-green-400">${team.budget}M€</p>
            </div>
        `;
        container.appendChild(card);
    });
}

export function displaySuspendedPlayers(container, teamsData, playerStats) {
     if (!teamsData || !playerStats) {
        renderError(container);
        return;
    }
    container.innerHTML = '';

    const suspendedPlayers = playerStats.filter(player => player.suspension);
    if (suspendedPlayers.length === 0) {
        container.innerHTML = '<p class="text-white text-center">Cezalı oyuncu yok.</p>';
        return;
    }

    suspendedPlayers.forEach(player => {
        const team = teamsData.find(t => t.id === player.teamId);
        if (!team) return;

        const card = document.createElement('div');
        card.className = 'flex flex-col bg-red-900/30 border border-red-700 p-4 rounded-xl mb-3 shadow max-w-2xl mx-auto';
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-4">
                <img src="${team.logo}" alt="${team.name}" class="w-10 h-10 object-contain rounded" />
                <div>
                    <p class="text-white font-bold">${player.name} <span class="text-gray-400">(${team.name})</span></p>
                    <p class="text-white text-lg">${player.redCards > 0 ? '🟥 ' + player.redCards : '🟨 ' + player.yellowCards}</p>
                </div>
                </div>
            </div>
            <div class="text-sm text-white mt-1 px-1">
                📝 Ceza Nedeni: <span class="font-semibold">${player.suspension.reason}</span><br />
                <span class="italic text-gray-400 text-xs">${player.suspension.bannedWeek}. hafta maçını kaçıracak.</span>
            </div>
        `;
        container.appendChild(card);
    });
}