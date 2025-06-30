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
 * İki takım arasındaki tüm maçları bulur.
 * @param {number} team1Id - Birinci takımın ID'si
 * @param {number} team2Id - İkinci takımın ID'si
 * @param {Array} fixtures - Tüm fikstür listesi
 * @returns {Array} - İki takım arasındaki maçların listesi
 */
export function findHeadToHeadMatches(team1Id, team2Id, fixtures) {
  if (!team1Id || !team2Id || !fixtures) return [];

  return fixtures.filter(match => 
    (match.homeTeamId === team1Id && match.awayTeamId === team2Id) ||
    (match.homeTeamId === team2Id && match.awayTeamId === team1Id)
  );
}