import { describe, it, expect } from 'vitest';
import { calculateStandings, findMatchesByTeamNames, calculateHeadToHeadStats } from './utils.js';

// Test verileri (mock data)
const MOCK_TEAMS_SEASON_1 = [
  { id: 1, name: 'Team A' },
  { id: 2, name: 'Team B' },
  { id: 3, name: 'Team C' },
];

const MOCK_FIXTURES_SEASON_1 = [
  // Team A (6p, +5 GD), Team B (3p, -2 GD), Team C (0p, -3 GD)
  { homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 0, status: 'Oynandı' }, // A wins
  { homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 0, status: 'Oynandı' }, // A wins
  { homeTeamId: 2, awayTeamId: 3, homeScore: 2, awayScore: 1, status: 'Oynandı' }, // B wins
];

const MOCK_ALL_SEASONS_DATA = {
    '1': {
        teams: MOCK_TEAMS_SEASON_1,
        fixtures: MOCK_FIXTURES_SEASON_1
    }
};

// 'calculateStandings' fonksiyonu için test senaryoları
describe('calculateStandings', () => {

  it('should return an empty array if teams or fixtures are null/undefined', () => {
    expect(calculateStandings(null, [])).toEqual([]);
    expect(calculateStandings([], null)).toEqual([]);
  });

  it('should calculate points, wins, losses, and draws correctly', () => {
    const standings = calculateStandings(MOCK_TEAMS_SEASON_1, MOCK_FIXTURES_SEASON_1);
    const teamA = standings.find(t => t.id === 1);
    const teamB = standings.find(t => t.id === 2);
    const teamC = standings.find(t => t.id === 3);

    expect(teamA.points).toBe(6);
    expect(teamA.win).toBe(2);
    expect(teamA.draw).toBe(0);
    expect(teamA.loss).toBe(0);

    expect(teamB.points).toBe(3);
    expect(teamB.win).toBe(1);
    expect(teamB.loss).toBe(1);
  });

  it('should calculate goal difference and goals for/against correctly', () => {
    const standings = calculateStandings(MOCK_TEAMS_SEASON_1, MOCK_FIXTURES_SEASON_1);
    const teamA = standings.find(t => t.id === 1);
    const teamB = standings.find(t => t.id === 2);

    expect(teamA.goalsFor).toBe(5);
    expect(teamA.goalsAgainst).toBe(0);
    expect(teamA.goalDifference).toBe(5);

    expect(teamB.goalsFor).toBe(2);
    expect(teamB.goalsAgainst).toBe(4);
    expect(teamB.goalDifference).toBe(-2);
  });

  it('should sort teams correctly (points > goal difference > goals for)', () => {
    const teams = [{ id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }, { id: 3, name: 'Team C' }];
    const fixtures = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0, status: 'Oynandı' }, // A: 3p, +1 GD
      { homeTeamId: 2, awayTeamId: 3, homeScore: 5, awayScore: 0, status: 'Oynandı' }, // B: 3p, +5 GD
      { homeTeamId: 3, awayTeamId: 1, homeScore: 2, awayScore: 2, status: 'Oynandı' }, // A: 4p, +1 GD, C: 1p, -5 GD
    ];
    const standings = calculateStandings(teams, fixtures);

    // Sıralama: Team A (4p), Team B (3p), Team C (1p)
    expect(standings[0].id).toBe(1);
    expect(standings[1].id).toBe(2);
    expect(standings[2].id).toBe(3);
  });

  it('should handle "Oynanmadı" status by ignoring those fixtures', () => {
    const teams = [{ id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }];
    const fixtures = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 1, status: 'Oynandı' },
      { homeTeamId: 1, awayTeamId: 2, homeScore: null, awayScore: null, status: 'Oynanmadı' }
    ];
    const standings = calculateStandings(teams, fixtures);
    const teamA = standings.find(t => t.id === 1);

    expect(teamA.played).toBe(1); // Sadece oynanmış maçı saymalı
    expect(teamA.points).toBe(3);
  });
});

// 'findMatchesByTeamNames' fonksiyonu için test senaryoları
describe('findMatchesByTeamNames', () => {
    it('should find all matches between two teams across seasons', () => {
        const matches = findMatchesByTeamNames('Team A', 'Team B', MOCK_ALL_SEASONS_DATA);
        expect(matches).toHaveLength(1);
        expect(matches[0].homeTeamId).toBe(1);
        expect(matches[0].awayTeamId).toBe(2);
    });

    it('should return an empty array if one or both teams are not found', () => {
        const matches = findMatchesByTeamNames('Team A', 'Team D', MOCK_ALL_SEASONS_DATA);
        expect(matches).toHaveLength(0);
    });
});

// 'calculateHeadToHeadStats' fonksiyonu için test senaryoları
describe('calculateHeadToHeadStats', () => {
    it('should calculate wins and draws correctly', () => {
        const matches = [
            { seasonId: '1', homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 0, status: 'Oynandı' }, // A wins
            { seasonId: '1', homeTeamId: 2, awayTeamId: 1, homeScore: 1, awayScore: 1, status: 'Oynandı' }, // Draw
            { seasonId: '1', homeTeamId: 2, awayTeamId: 1, homeScore: 2, awayScore: 1, status: 'Oynandı' }, // B wins
        ];
        // Team A (ID 1) ve Team B (ID 2)
        const stats = calculateHeadToHeadStats(matches, 'Team A', MOCK_ALL_SEASONS_DATA);

        expect(stats.team1Wins).toBe(1);
        expect(stats.team2Wins).toBe(1);
        expect(stats.draws).toBe(1);
    });
});