describe('Leaderboard & Scoring System', () => {
  interface ParticipantStats {
    userId: string;
    name: string;
    wins: number;
    draws: number;
    losses: number;
    gamesPlayed: number;
    points: number;
  }

  function calculatePoints(wins: number, draws: number): number {
    return wins * 1.0 + draws * 0.5;
  }

  function sortLeaderboard(entries: ParticipantStats[]) {
    return [...entries].sort((a, b) => {
      // 1. Points descending
      if (b.points !== a.points) return b.points - a.points;
      // 2. Wins descending
      if (b.wins !== a.wins) return b.wins - a.wins;
      // 3. Name alphabetical
      return a.name.localeCompare(b.name);
    });
  }

  it('correctly scores win (1 pt), draw (0.5 pt), and loss (0 pt)', () => {
    expect(calculatePoints(3, 0)).toBe(3.0); // 3 wins = 3 pts
    expect(calculatePoints(2, 2)).toBe(3.0); // 2 wins + 2 draws = 3 pts
    expect(calculatePoints(0, 1)).toBe(0.5); // 1 draw = 0.5 pts
    expect(calculatePoints(0, 0)).toBe(0.0); // 0 wins/draws = 0 pts
  });

  it('sorts leaderboard deterministically by points, then wins, then name', () => {
    const players: ParticipantStats[] = [
      { userId: '1', name: 'Charlie', wins: 1, draws: 2, losses: 1, gamesPlayed: 4, points: 2.0 },
      { userId: '2', name: 'Alice', wins: 2, draws: 0, losses: 2, gamesPlayed: 4, points: 2.0 },
      { userId: '3', name: 'Bob', wins: 3, draws: 0, losses: 1, gamesPlayed: 4, points: 3.0 },
      { userId: '4', name: 'Dave', wins: 0, draws: 4, losses: 0, gamesPlayed: 4, points: 2.0 },
    ];

    const sorted = sortLeaderboard(players);

    // Bob has 3.0 points -> Rank 1
    expect(sorted[0].name).toBe('Bob');
    expect(sorted[0].points).toBe(3.0);

    // Alice has 2.0 points, 2 wins -> Rank 2 (tiebreak over Charlie & Dave)
    expect(sorted[1].name).toBe('Alice');
    expect(sorted[1].wins).toBe(2);

    // Charlie has 2.0 points, 1 win -> Rank 3 (tiebreak over Dave)
    expect(sorted[2].name).toBe('Charlie');
    expect(sorted[2].wins).toBe(1);

    // Dave has 2.0 points, 0 wins -> Rank 4
    expect(sorted[3].name).toBe('Dave');
    expect(sorted[3].wins).toBe(0);
  });

  it('ensures match results are applied idempotently', () => {
    const scores = new Map<string, number>();
    const processedMatchIds = new Set<string>();

    function applyMatchResult(matchId: string, winnerId: string, loserId: string) {
      if (processedMatchIds.has(matchId)) {
        return; // Idempotent guard
      }
      processedMatchIds.add(matchId);
      scores.set(winnerId, (scores.get(winnerId) || 0) + 1);
      scores.set(loserId, (scores.get(loserId) || 0) + 0);
    }

    applyMatchResult('match-1', 'player-a', 'player-b');
    expect(scores.get('player-a')).toBe(1);

    // Duplicate event arrives
    applyMatchResult('match-1', 'player-a', 'player-b');
    expect(scores.get('player-a')).toBe(1); // Points must NOT double!
  });
});
