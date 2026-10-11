export type UserRole = 'coach' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export type TournamentStatus = 'draft' | 'open' | 'ongoing' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  timeControl: string;
  initialTimeSeconds: number;
  incrementSeconds: number;
  status: TournamentStatus;
  createdBy: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  participantCount?: number;
  isJoined?: boolean;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  score: number;
  joinedAt: string;
  userName?: string;
  userEmail?: string;
}

export type MatchStatus = 'waiting' | 'active' | 'completed';
export type MatchResult = 'white' | 'black' | 'draw';
export type TerminationReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'draw'
  | 'agreement';

export interface MatchMove {
  id: string;
  matchId: string;
  moveNumber: number;
  playerId: string;
  fromSquare: string;
  toSquare: string;
  promotion?: string;
  san: string;
  fenAfter: string;
  createdAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  status: MatchStatus;
  result?: MatchResult;
  terminationReason?: TerminationReason;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  startedAt: string;
  endedAt?: string;
  whitePlayer?: { id: string; name: string; email: string };
  blackPlayer?: { id: string; name: string; email: string };
  tournament?: Tournament;
  moves?: MatchMove[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
}

export interface TournamentLeaderboardResponse {
  tournament: {
    id: string;
    name: string;
    status: TournamentStatus;
    timeControl: string;
  };
  leaderboard: LeaderboardEntry[];
  winner: LeaderboardEntry | null;
}

export interface CoachStats {
  role: 'coach';
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
  };
  title: string;
  tournamentsHosted: number;
  activeEvents: number;
  completedEvents: number;
  totalParticipants: number;
  totalMatches: number;
  recentTournaments: Array<{
    id: string;
    name: string;
    timeControl: string;
    status: TournamentStatus;
    startDate?: string;
    endDate?: string;
    createdAt: string;
  }>;
}

export interface StudentStats {
  role: 'student';
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
  };
  title: string;
  rating: number;
  ratingNet: number;
  streak: number;
  tournamentsJoined: number;
  totalGames: number;
  completedGames: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  recentParticipations: Array<{
    id: string;
    tournamentId: string;
    score: number;
    joinedAt: string;
    tournamentName: string;
    tournamentStatus: TournamentStatus;
    timeControl: string;
  }>;
}

export type UserStats = CoachStats | StudentStats;
