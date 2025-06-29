import { describe, it, expect } from 'vitest';
import { calculateStandings } from './utils.js';

// 'calculateStandings' fonksiyonu için test senaryolarını gruplandırıyoruz
describe('calculateStandings', () => {

  // Test senaryosu 1: Puanları doğru hesaplıyor mu?
  it('should calculate points correctly (3 for a win, 1 for a draw)', () => {
    const teams = [{ id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }];
    const fixtures = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 1, status: 'Oynandı' } // Team A wins
    ];
    const standings = calculateStandings(teams, fixtures);
    const teamA = standings.find(t => t.id === 1);
    
    expect(teamA.points).toBe(3); // Team A'nın 3 puanı olmalı
  });

  // Test senaryosu 2: Takımları önce puana, sonra averaja göre doğru sıralıyor mu?
  it('should sort teams by points, then by goal difference', () => {
    const teams = [{ id: 1, name: 'Team A' }, { id: 2, name: 'Team B' }];
    const fixtures = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0, status: 'Oynandı' }, // Team A: 3 puan, +1 averaj
      { homeTeamId: 2, awayTeamId: 1, homeScore: 3, awayScore: 0, status: 'Oynandı' }  // Team B: 3 puan, +3 averaj
    ];
    const standings = calculateStandings(teams, fixtures);

    // Team B'nin averajı daha iyi olduğu için ilk sırada olmalı
    expect(standings[0].id).toBe(2);
    expect(standings[1].id).toBe(1);
  });

  // Test senaryosu 3: Fikstür boş olduğunda hata vermeden boş bir puan durumu döndürüyor mu?
  it('should return a clean standing when fixtures are empty', () => {
    const teams = [{ id: 1, name: 'Team A' }];
    const fixtures = []; // Fikstür yok
    const standings = calculateStandings(teams, fixtures);
    const teamA = standings.find(t => t.id === 1);

    expect(teamA.played).toBe(0);
    expect(teamA.points).toBe(0);
  });

});