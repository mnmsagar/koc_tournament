import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  tournaments,
  tournamentParticipants,
  users,
  matches,
  TournamentStatus,
} from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private readonly dbService: DatabaseService) {}

  async create(coachId: string, dto: CreateTournamentDto) {
    const [created] = await this.dbService.db
      .insert(tournaments)
      .values({
        name: dto.name,
        timeControl: dto.timeControl || '5+0',
        initialTimeSeconds: dto.initialTimeSeconds || 300,
        incrementSeconds: dto.incrementSeconds || 0,
        status: dto.status || 'open',
        createdBy: coachId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      })
      .returning();

    return created;
  }

  async findAll(userId?: string) {
    const allTournaments = await this.dbService.db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        timeControl: tournaments.timeControl,
        initialTimeSeconds: tournaments.initialTimeSeconds,
        incrementSeconds: tournaments.incrementSeconds,
        status: tournaments.status,
        createdBy: tournaments.createdBy,
        startDate: tournaments.startDate,
        endDate: tournaments.endDate,
        createdAt: tournaments.createdAt,
      })
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));

    // Enhance with participant counts and user enrollment status
    const results = [];
    for (const t of allTournaments) {
      const parts = await this.dbService.db
        .select()
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, t.id));

      const isJoined = userId ? parts.some((p) => p.userId === userId) : false;

      results.push({
        ...t,
        participantCount: parts.length,
        isJoined,
      });
    }

    return results;
  }

  async findOne(id: string) {
    const found = await this.dbService.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));

    if (found.length === 0) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    const tournament = found[0];

    // Fetch participants with user info
    const participantsList = await this.dbService.db
      .select({
        id: tournamentParticipants.id,
        userId: tournamentParticipants.userId,
        score: tournamentParticipants.score,
        joinedAt: tournamentParticipants.joinedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(tournamentParticipants)
      .innerJoin(users, eq(tournamentParticipants.userId, users.id))
      .where(eq(tournamentParticipants.tournamentId, id));

    // Fetch matches with player names
    const whiteUsers = alias(users, 'white_users');
    const blackUsers = alias(users, 'black_users');

    const matchList = await this.dbService.db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        whitePlayerId: matches.whitePlayerId,
        blackPlayerId: matches.blackPlayerId,
        whitePlayerName: whiteUsers.name,
        blackPlayerName: blackUsers.name,
        status: matches.status,
        result: matches.result,
        terminationReason: matches.terminationReason,
        fen: matches.fen,
        pgn: matches.pgn,
        createdAt: matches.createdAt,
        endedAt: matches.endedAt,
      })
      .from(matches)
      .leftJoin(whiteUsers, eq(matches.whitePlayerId, whiteUsers.id))
      .leftJoin(blackUsers, eq(matches.blackPlayerId, blackUsers.id))
      .where(eq(matches.tournamentId, id))
      .orderBy(desc(matches.createdAt));

    return {
      ...tournament,
      participants: participantsList,
      matches: matchList,
    };
  }

  async update(id: string, coachId: string, dto: UpdateTournamentDto) {
    const existing = await this.findOne(id);

    // Verify creator authorization: Only the coach who created this tournament can update it
    if (existing.createdBy && existing.createdBy !== coachId) {
      throw new ForbiddenException('You can only modify tournaments you created');
    }

    // Validate lifecycle status transitions
    if (dto.status && dto.status !== existing.status) {
      this.validateStatusTransition(existing.status as TournamentStatus, dto.status);
    }

    const [updated] = await this.dbService.db
      .update(tournaments)
      .set({
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.timeControl ? { timeControl: dto.timeControl } : {}),
        ...(dto.initialTimeSeconds ? { initialTimeSeconds: dto.initialTimeSeconds } : {}),
        ...(dto.incrementSeconds !== undefined ? { incrementSeconds: dto.incrementSeconds } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id))
      .returning();

    return updated;
  }

  private validateStatusTransition(current: TournamentStatus, next: TournamentStatus) {
    const allowedTransitions: Record<TournamentStatus, TournamentStatus[]> = {
      draft: ['open'],
      open: ['ongoing', 'completed'],
      ongoing: ['completed'],
      completed: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from '${current}' to '${next}'`,
      );
    }
  }

  async delete(id: string, coachId: string) {
    const existing = await this.findOne(id);

    // Verify creator authorization: Only the coach who created this tournament can delete it
    if (existing.createdBy && existing.createdBy !== coachId) {
      throw new ForbiddenException('You can only delete tournaments you created');
    }

    if (existing.status === 'ongoing' || existing.status === 'completed') {
      throw new BadRequestException(
        `Cannot delete a tournament that is ${existing.status}`,
      );
    }

    await this.dbService.db.delete(tournaments).where(eq(tournaments.id, id));
    return { success: true, message: 'Tournament deleted' };
  }

  async joinTournament(tournamentId: string, studentId: string, userRole: string) {
    if (userRole === 'coach') {
      throw new ForbiddenException('Coaches cannot join as student players');
    }

    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'open' && tournament.status !== 'ongoing') {
      throw new BadRequestException(
        `Cannot join tournament with status '${tournament.status}'. Must be 'open' or 'ongoing'`,
      );
    }

    // Check if already joined (idempotent)
    const existing = await this.dbService.db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, studentId),
        ),
      );

    if (existing.length > 0) {
      return {
        success: true,
        message: 'Already joined tournament',
        participant: existing[0],
      };
    }

    const [participant] = await this.dbService.db
      .insert(tournamentParticipants)
      .values({
        tournamentId,
        userId: studentId,
        score: 0,
      })
      .returning();

    return {
      success: true,
      message: 'Successfully joined tournament',
      participant,
    };
  }

  async getLeaderboard(tournamentId: string) {
    const tournament = await this.findOne(tournamentId);

    // Get all registered participants
    const participantsList = await this.dbService.db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        score: tournamentParticipants.score,
        joinedAt: tournamentParticipants.joinedAt,
      })
      .from(tournamentParticipants)
      .innerJoin(users, eq(tournamentParticipants.userId, users.id))
      .where(eq(tournamentParticipants.tournamentId, tournamentId));

    // Get all completed matches for this tournament
    const completedMatches = await this.dbService.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.status, 'completed'),
        ),
      );

    // Calculate match statistics dynamically to guarantee accuracy
    const statsByUser = new Map<
      string,
      { wins: number; draws: number; losses: number; gamesPlayed: number; points: number }
    >();

    for (const p of participantsList) {
      statsByUser.set(p.userId, {
        wins: 0,
        draws: 0,
        losses: 0,
        gamesPlayed: 0,
        points: 0,
      });
    }

    for (const m of completedMatches) {
      const whiteStats = statsByUser.get(m.whitePlayerId);
      const blackStats = statsByUser.get(m.blackPlayerId);

      if (whiteStats) whiteStats.gamesPlayed += 1;
      if (blackStats) blackStats.gamesPlayed += 1;

      if (m.result === 'white') {
        if (whiteStats) {
          whiteStats.wins += 1;
          whiteStats.points += 1;
        }
        if (blackStats) {
          blackStats.losses += 1;
        }
      } else if (m.result === 'black') {
        if (blackStats) {
          blackStats.wins += 1;
          blackStats.points += 1;
        }
        if (whiteStats) {
          whiteStats.losses += 1;
        }
      } else if (m.result === 'draw') {
        if (whiteStats) {
          whiteStats.draws += 1;
          whiteStats.points += 0.5;
        }
        if (blackStats) {
          blackStats.draws += 1;
          blackStats.points += 0.5;
        }
      }
    }

    // Build leaderboard entries
    const leaderboardEntries = participantsList.map((p) => {
      const stats = statsByUser.get(p.userId) || {
        wins: 0,
        draws: 0,
        losses: 0,
        gamesPlayed: 0,
        points: 0,
      };
      return {
        userId: p.userId,
        name: p.name,
        email: p.email,
        points: stats.points,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        gamesPlayed: stats.gamesPlayed,
      };
    });

    // Deterministic sorting:
    // 1. Points descending
    // 2. Wins descending
    // 3. User Name alphabetical / user ID stable ordering
    leaderboardEntries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });

    // Assign ranks
    const rankedLeaderboard = leaderboardEntries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    const winner =
      tournament.status === 'completed' && rankedLeaderboard.length > 0
        ? rankedLeaderboard[0]
        : null;

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        timeControl: tournament.timeControl,
      },
      leaderboard: rankedLeaderboard,
      winner,
    };
  }
}
