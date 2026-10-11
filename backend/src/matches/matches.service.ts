import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Chess } from 'chess.js';
import { DatabaseService } from '../database/database.service';
import {
  matches,
  matchMoves,
  tournamentParticipants,
  tournaments,
  users,
  MatchStatus,
  MatchResult,
  TerminationReason,
} from '../database/schema';
import { eq, and, sql, or } from 'drizzle-orm';

export interface MoveDto {
  from: string;
  to: string;
  promotion?: string;
}

@Injectable()
export class MatchesService {
  constructor(private readonly dbService: DatabaseService) {}

  async getMatchById(matchId: string) {
    const found = await this.dbService.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId));

    if (found.length === 0) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    const match = found[0];

    // Fetch player profiles
    const [whiteUser] = await this.dbService.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, match.whitePlayerId));

    const [blackUser] = await this.dbService.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, match.blackPlayerId));

    // Fetch tournament details
    const [tournament] = await this.dbService.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, match.tournamentId));

    // Fetch moves
    const moves = await this.dbService.db
      .select()
      .from(matchMoves)
      .where(eq(matchMoves.matchId, matchId))
      .orderBy(matchMoves.moveNumber);

    return {
      ...match,
      whitePlayer: whiteUser,
      blackPlayer: blackUser,
      tournament,
      moves,
    };
  }

  async getActiveMatchForPlayer(userId: string) {
    const active = await this.dbService.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, 'active'),
          or(eq(matches.whitePlayerId, userId), eq(matches.blackPlayerId, userId)),
        ),
      );

    if (active.length === 0) return null;
    return this.getMatchById(active[0].id);
  }

  async processMove(matchId: string, playerId: string, move: MoveDto) {
    // Acquire match and lock/check state
    const match = await this.getMatchById(matchId);

    if (match.status !== 'active') {
      throw new BadRequestException('Match is already finished');
    }

    if (match.whitePlayerId !== playerId && match.blackPlayerId !== playerId) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    const isWhite = match.whitePlayerId === playerId;
    const currentTurn = match.turn; // 'w' or 'b'

    if ((currentTurn === 'w' && !isWhite) || (currentTurn === 'b' && isWhite)) {
      throw new BadRequestException('It is not your turn to move');
    }

    // Check clock timeout
    const now = new Date();
    let whiteTimeRemaining = match.whiteTimeRemaining;
    let blackTimeRemaining = match.blackTimeRemaining;

    if (match.lastMoveAt) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - new Date(match.lastMoveAt).getTime()) / 1000,
      );

      if (currentTurn === 'w') {
        whiteTimeRemaining = Math.max(0, whiteTimeRemaining - elapsedSeconds);
        if (whiteTimeRemaining <= 0) {
          return this.finalizeTimeout(matchId, 'white');
        }
      } else {
        blackTimeRemaining = Math.max(0, blackTimeRemaining - elapsedSeconds);
        if (blackTimeRemaining <= 0) {
          return this.finalizeTimeout(matchId, 'black');
        }
      }
    }

    // Authoritative chess validation
    const chess = new Chess(match.fen);
    let moveResult;
    try {
      moveResult = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
    } catch {
      throw new BadRequestException('Illegal chess move');
    }

    if (!moveResult) {
      throw new BadRequestException('Illegal chess move');
    }

    // Add increment if configured
    const increment = match.tournament?.incrementSeconds || 0;
    if (currentTurn === 'w') {
      whiteTimeRemaining += increment;
    } else {
      blackTimeRemaining += increment;
    }

    const nextFen = chess.fen();
    const nextPgn = chess.pgn();
    const nextTurn = chess.turn(); // 'w' or 'b'
    const moveCount = (match.moves?.length || 0) + 1;

    // Check game conclusion
    let newStatus: MatchStatus = 'active';
    let result: MatchResult | null = null;
    let terminationReason: TerminationReason | null = null;

    if (chess.isCheckmate()) {
      newStatus = 'completed';
      result = isWhite ? 'white' : 'black';
      terminationReason = 'checkmate';
    } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      newStatus = 'completed';
      result = 'draw';
      terminationReason = chess.isStalemate() ? 'stalemate' : 'draw';
    }

    // Persist in transaction
    await this.dbService.db.transaction(async (tx) => {
      // 1. Record move
      await tx.insert(matchMoves).values({
        matchId,
        moveNumber: moveCount,
        playerId,
        fromSquare: move.from,
        toSquare: move.to,
        promotion: move.promotion || null,
        san: moveResult.san,
        fenAfter: nextFen,
      });

      // 2. Update match state
      await tx
        .update(matches)
        .set({
          fen: nextFen,
          pgn: nextPgn,
          turn: nextTurn,
          whiteTimeRemaining,
          blackTimeRemaining,
          lastMoveAt: now,
          status: newStatus,
          result: result || undefined,
          terminationReason: terminationReason || undefined,
          endedAt: newStatus === 'completed' ? now : null,
          updatedAt: now,
        })
        .where(eq(matches.id, matchId));

      // 3. Update leaderboard scores if match completed
      if (newStatus === 'completed' && result) {
        await this.applyMatchResultScores(tx, match.tournamentId, match.whitePlayerId, match.blackPlayerId, result);
      }
    });

    return {
      matchId,
      fen: nextFen,
      pgn: nextPgn,
      turn: nextTurn,
      san: moveResult.san,
      whiteTimeRemaining,
      blackTimeRemaining,
      status: newStatus,
      result,
      terminationReason,
      lastMove: {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        san: moveResult.san,
      },
    };
  }

  async resign(matchId: string, playerId: string) {
    const match = await this.getMatchById(matchId);

    if (match.status !== 'active') {
      throw new BadRequestException('Match is already finished');
    }

    if (match.whitePlayerId !== playerId && match.blackPlayerId !== playerId) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    const isWhite = match.whitePlayerId === playerId;
    const result: MatchResult = isWhite ? 'black' : 'white';
    const terminationReason: TerminationReason = 'resignation';
    const now = new Date();

    await this.dbService.db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({
          status: 'completed',
          result,
          terminationReason,
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(matches.id, matchId));

      await this.applyMatchResultScores(
        tx,
        match.tournamentId,
        match.whitePlayerId,
        match.blackPlayerId,
        result,
      );
    });

    return {
      matchId,
      status: 'completed' as const,
      result,
      terminationReason,
      endedAt: now,
    };
  }

  async claimTimeout(matchId: string, playerId?: string) {
    const match = await this.getMatchById(matchId);
    if (match.status !== 'active') {
      return match;
    }

    const now = new Date();
    const referenceTime = match.lastMoveAt
      ? new Date(match.lastMoveAt)
      : new Date(match.startedAt);
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - referenceTime.getTime()) / 1000),
    );

    if (match.turn === 'w') {
      const remaining = Math.max(0, match.whiteTimeRemaining - elapsedSeconds);
      if (remaining <= 0) {
        return this.finalizeTimeout(matchId, 'white');
      }
    } else {
      const remaining = Math.max(0, match.blackTimeRemaining - elapsedSeconds);
      if (remaining <= 0) {
        return this.finalizeTimeout(matchId, 'black');
      }
    }

    throw new BadRequestException('Player has not timed out yet');
  }

  private async finalizeTimeout(matchId: string, timedOutColor: 'white' | 'black') {
    const match = await this.getMatchById(matchId);
    const result: MatchResult = timedOutColor === 'white' ? 'black' : 'white';
    const terminationReason: TerminationReason = 'timeout';
    const now = new Date();

    await this.dbService.db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({
          status: 'completed',
          result,
          terminationReason,
          whiteTimeRemaining: timedOutColor === 'white' ? 0 : match.whiteTimeRemaining,
          blackTimeRemaining: timedOutColor === 'black' ? 0 : match.blackTimeRemaining,
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(matches.id, matchId));

      await this.applyMatchResultScores(
        tx,
        match.tournamentId,
        match.whitePlayerId,
        match.blackPlayerId,
        result,
      );
    });

    return {
      matchId,
      fen: match.fen,
      pgn: match.pgn,
      turn: match.turn,
      whiteTimeRemaining: timedOutColor === 'white' ? 0 : match.whiteTimeRemaining,
      blackTimeRemaining: timedOutColor === 'black' ? 0 : match.blackTimeRemaining,
      status: 'completed' as const,
      result,
      terminationReason,
    };
  }

  private async applyMatchResultScores(
    tx: any,
    tournamentId: string,
    whitePlayerId: string,
    blackPlayerId: string,
    result: MatchResult,
  ) {
    if (result === 'white') {
      await tx
        .update(tournamentParticipants)
        .set({ score: sql`${tournamentParticipants.score} + 1` })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, whitePlayerId),
          ),
        );
    } else if (result === 'black') {
      await tx
        .update(tournamentParticipants)
        .set({ score: sql`${tournamentParticipants.score} + 1` })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, blackPlayerId),
          ),
        );
    } else if (result === 'draw') {
      await tx
        .update(tournamentParticipants)
        .set({ score: sql`${tournamentParticipants.score} + 0.5` })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, whitePlayerId),
          ),
        );
      await tx
        .update(tournamentParticipants)
        .set({ score: sql`${tournamentParticipants.score} + 0.5` })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, blackPlayerId),
          ),
        );
    }
  }
}
