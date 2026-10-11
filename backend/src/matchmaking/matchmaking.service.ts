import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  matchmakingQueue,
  matches,
  tournaments,
  tournamentParticipants,
  users,
} from '../database/schema';
import { eq, and, ne, sql, or } from 'drizzle-orm';

@Injectable()
export class MatchmakingService {
  constructor(private readonly dbService: DatabaseService) {}

  async addToQueue(tournamentId: string, userId: string, socketId?: string) {
    // 1. Verify user is registered in the tournament
    const participant = await this.dbService.db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId),
        ),
      );

    if (participant.length === 0) {
      throw new BadRequestException('You must join this tournament before queuing');
    }

    // 2. Check if user already has an active match
    const activeMatch = await this.dbService.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, 'active'),
          or(eq(matches.whitePlayerId, userId), eq(matches.blackPlayerId, userId)),
        ),
      );

    if (activeMatch.length > 0) {
      throw new ConflictException('You already have an active match in progress');
    }

    // 3. Atomically check and pair, or enqueue
    return await this.dbService.db.transaction(async (tx) => {
      // Find another waiting opponent in the same tournament (FIFO order)
      const waitingOpponents = await tx
        .select()
        .from(matchmakingQueue)
        .where(
          and(
            eq(matchmakingQueue.tournamentId, tournamentId),
            ne(matchmakingQueue.userId, userId),
          ),
        )
        .orderBy(matchmakingQueue.joinedAt)
        .limit(1);

      if (waitingOpponents.length > 0) {
        const opponent = waitingOpponents[0];

        // Remove opponent and current user from queue
        await tx
          .delete(matchmakingQueue)
          .where(
            or(
              eq(matchmakingQueue.userId, opponent.userId),
              eq(matchmakingQueue.userId, userId),
            ),
          );

        // Fetch tournament for time control
        const [tourn] = await tx
          .select()
          .from(tournaments)
          .where(eq(tournaments.id, tournamentId));

        const initialTime = tourn?.initialTimeSeconds || 300;

        // Randomly assign white and black
        const isUserWhite = Math.random() < 0.5;
        const whitePlayerId = isUserWhite ? userId : opponent.userId;
        const blackPlayerId = isUserWhite ? opponent.userId : userId;

        const [createdMatch] = await tx
          .insert(matches)
          .values({
            tournamentId,
            whitePlayerId,
            blackPlayerId,
            status: 'active',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            pgn: '',
            turn: 'w',
            whiteTimeRemaining: initialTime,
            blackTimeRemaining: initialTime,
            startedAt: new Date(),
          })
          .returning();

        return {
          matched: true,
          match: createdMatch,
          player1: { userId, socketId },
          player2: { userId: opponent.userId, socketId: opponent.socketId },
        };
      }

      // No opponent found, insert or update queue entry
      const existingQueueEntry = await tx
        .select()
        .from(matchmakingQueue)
        .where(eq(matchmakingQueue.userId, userId));

      if (existingQueueEntry.length > 0) {
        await tx
          .update(matchmakingQueue)
          .set({
            tournamentId,
            socketId: socketId || null,
            joinedAt: new Date(),
          })
          .where(eq(matchmakingQueue.userId, userId));
      } else {
        await tx.insert(matchmakingQueue).values({
          tournamentId,
          userId,
          socketId: socketId || null,
        });
      }

      return {
        matched: false,
        queued: true,
        tournamentId,
        userId,
      };
    });
  }

  async removeFromQueue(userId: string) {
    await this.dbService.db
      .delete(matchmakingQueue)
      .where(eq(matchmakingQueue.userId, userId));

    return { success: true, message: 'Removed from queue' };
  }

  async getQueueStatus(userId: string) {
    const queueEntry = await this.dbService.db
      .select()
      .from(matchmakingQueue)
      .where(eq(matchmakingQueue.userId, userId));

    if (queueEntry.length === 0) {
      return { inQueue: false };
    }

    return {
      inQueue: true,
      tournamentId: queueEntry[0].tournamentId,
      joinedAt: queueEntry[0].joinedAt,
    };
  }
}
