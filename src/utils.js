/**
 * Verilen takımlar ve fikstürlere göre puan durumunu hesaplar.
 * @param {Array} teams - Takım listesi.
 * @param {Array} fixtures - Fikstür listesi.
 * @returns {Array} - Sıralanmış puan durumu listesi.
 */
export function calculateStandings(teams, fixtures) {
    if (!teams || !fixtures) return [];

    let standings = teams.map(team => ({
        ...team, 
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
    }));

    fixtures.filter(f => f.status === 'Oynandı').forEach(fixture => {
        const homeTeam = standings.find(t => t.id === fixture.homeTeamId);
        const awayTeam = standings.find(t => t.id === fixture.awayTeamId);

        if (homeTeam && awayTeam && fixture.homeScore !== null && fixture.awayScore !== null) {
            homeTeam.played++;
            awayTeam.played++;
            homeTeam.goalsFor += fixture.homeScore;
            awayTeam.goalsFor += fixture.awayScore;
            homeTeam.goalsAgainst += fixture.awayScore;
            awayTeam.goalsAgainst += fixture.homeScore;

            if (fixture.homeScore > fixture.awayScore) {
                homeTeam.win++;
                awayTeam.loss++;
                homeTeam.points += 3;
            } else if (fixture.homeScore < fixture.awayScore) {
                awayTeam.win++;
                homeTeam.loss++;
                awayTeam.points += 3;
            } else {
                homeTeam.draw++;
                awayTeam.draw++;
                homeTeam.points += 1;
                awayTeam.points += 1;
            }
        }
    });

    standings.forEach(team => {
        team.goalDifference = team.goalsFor - team.goalsAgainst;
    });

    return standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name);
    });
}

/**
 * İki takımın isimlerine göre tüm sezonlardaki maçlarını bulur.
 * @param {string} team1Name - Birinci takımın adı.
 * @param {string} team2Name - İkinci takımın adı.
 * @param {object} allSeasonsData - Tüm sezonların verilerini içeren nesne.
 * @returns {Array} - İki takım arasındaki tüm maçların listesi.
 */
export function findMatchesByTeamNames(team1Name, team2Name, allSeasonsData) {
    if (!team1Name || !team2Name) return [];

    const allMatches = [];

    // Her sezonu ayrı ayrı geziyoruz
    for (const seasonId in allSeasonsData) {
        const season = allSeasonsData[seasonId];
        const teamsInSeason = season.teams;
        const fixturesInSeason = season.fixtures;

        // O sezondaki takım isimlerinden ID'leri buluyoruz
        const team1 = teamsInSeason.find(t => t.name === team1Name);
        const team2 = teamsInSeason.find(t => t.name === team2Name);

        // Eğer iki takım da o sezonda mevcutsa, aralarındaki maçları arıyoruz
        if (team1 && team2) {
            const matches = fixturesInSeason.filter(match =>
                (match.homeTeamId === team1.id && match.awayTeamId === team2.id) ||
                (match.homeTeamId === team2.id && match.awayTeamId === team1.id)
            );
            // Bulunan maçların yanına sezon bilgisini de ekleyip ana listeye ekliyoruz
            allMatches.push(...matches.map(m => ({ ...m, seasonId })));
        }
    }
    return allMatches;
}