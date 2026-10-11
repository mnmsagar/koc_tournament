describe('Tournament Lifecycle & Joining Rules', () => {
  type TournamentStatus = 'draft' | 'open' | 'ongoing' | 'completed';

  function isValidTransition(current: TournamentStatus, next: TournamentStatus): boolean {
    const transitions: Record<TournamentStatus, TournamentStatus[]> = {
      draft: ['open'],
      open: ['ongoing', 'completed'],
      ongoing: ['completed'],
      completed: [],
    };
    return transitions[current]?.includes(next) ?? false;
  }

  function canJoinTournament(role: string, tournamentStatus: TournamentStatus): { allowed: boolean; reason?: string } {
    if (role === 'coach') {
      return { allowed: false, reason: 'Coaches cannot join as student players' };
    }
    if (tournamentStatus !== 'open' && tournamentStatus !== 'ongoing') {
      return { allowed: false, reason: 'Tournament is not open for registration' };
    }
    return { allowed: true };
  }

  it('allows valid lifecycle transitions and rejects invalid jumps', () => {
    // Valid transitions
    expect(isValidTransition('draft', 'open')).toBe(true);
    expect(isValidTransition('open', 'ongoing')).toBe(true);
    expect(isValidTransition('ongoing', 'completed')).toBe(true);
    expect(isValidTransition('open', 'completed')).toBe(true);

    // Invalid transitions
    expect(isValidTransition('completed', 'open')).toBe(false); // Cannot reopen completed
    expect(isValidTransition('ongoing', 'draft')).toBe(false); // Cannot revert to draft
    expect(isValidTransition('draft', 'completed')).toBe(false); // Cannot jump draft to completed
  });

  it('forbids coaches from joining as players', () => {
    const res = canJoinTournament('coach', 'open');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Coaches cannot join as student players');
  });

  it('allows students to join open or ongoing tournaments, but not completed or draft', () => {
    expect(canJoinTournament('student', 'open').allowed).toBe(true);
    expect(canJoinTournament('student', 'ongoing').allowed).toBe(true);
    expect(canJoinTournament('student', 'completed').allowed).toBe(false);
    expect(canJoinTournament('student', 'draft').allowed).toBe(false);
  });
});
