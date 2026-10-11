import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { MatchesService, MoveDto } from '../matches/matches.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  // Track active socket connections by userId
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly matchmakingService: MatchmakingService,
    private readonly matchesService: MatchesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET ||
          'koc_tournament_jwt_super_secret_key_2026_kingdom_of_chess',
      });

      client.data.user = payload;
      const userId = payload.sub;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user: JwtPayload | undefined = client.data.user;
    if (user) {
      const sockets = this.userSockets.get(user.sub);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(user.sub);
          // Remove from matchmaking queue on complete disconnect
          await this.matchmakingService.removeFromQueue(user.sub).catch(() => {});
        }
      }
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    // 1. Handshake auth object
    if (client.handshake.auth && client.handshake.auth.token) {
      return client.handshake.auth.token;
    }

    // 2. Cookie header
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) return match[1];
    }

    // 3. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') return token;
    }

    return undefined;
  }

  @SubscribeMessage('matchmaking:join')
  async handleMatchmakingJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return client.emit('match:error', { message: 'Unauthorized' });

    try {
      const result = await this.matchmakingService.addToQueue(
        data.tournamentId,
        user.sub,
        client.id,
      );

      if (!result.matched) {
        client.emit('matchmaking:queued', {
          tournamentId: data.tournamentId,
          status: 'queued',
          message: 'Waiting for an eligible opponent...',
        });
      } else if (result.matched && result.match && result.player1 && result.player2) {
        // We have an active match!
        const match = await this.matchesService.getMatchById(result.match.id);
        const matchRoom = `match:${match.id}`;

        // Join both players to the match room and notify them
        const player1Sockets = this.userSockets.get(result.player1.userId);
        const player2Sockets = this.userSockets.get(result.player2.userId);

        if (player1Sockets) {
          for (const sId of player1Sockets) {
            const s = this.server.sockets.sockets.get(sId);
            if (s) {
              s.join(matchRoom);
              s.emit('matchmaking:matched', {
                matchId: match.id,
                tournamentId: match.tournamentId,
                side: match.whitePlayerId === result.player1.userId ? 'w' : 'b',
                match,
              });
            }
          }
        }

        if (player2Sockets) {
          for (const sId of player2Sockets) {
            const s = this.server.sockets.sockets.get(sId);
            if (s) {
              s.join(matchRoom);
              s.emit('matchmaking:matched', {
                matchId: match.id,
                tournamentId: match.tournamentId,
                side: match.whitePlayerId === result.player2.userId ? 'w' : 'b',
                match,
              });
            }
          }
        }
      }
    } catch (err: any) {
      client.emit('match:error', {
        message: err.message || 'Error joining matchmaking queue',
      });
    }
  }

  @SubscribeMessage('matchmaking:cancel')
  async handleMatchmakingCancel(@ConnectedSocket() client: Socket) {
    const user: JwtPayload = client.data.user;
    if (!user) return;
    await this.matchmakingService.removeFromQueue(user.sub);
    client.emit('matchmaking:cancelled', { status: 'cancelled' });
  }

  @SubscribeMessage('match:join')
  async handleMatchJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return client.emit('match:error', { message: 'Unauthorized' });

    try {
      const match = await this.matchesService.getMatchById(data.matchId);
      const isParticipant =
        match.whitePlayerId === user.sub || match.blackPlayerId === user.sub;

      if (!isParticipant) {
        return client.emit('match:error', {
          message: 'Only match participants can join this match room',
        });
      }

      client.join(`match:${data.matchId}`);
      client.emit('match:state', {
        matchId: match.id,
        fen: match.fen,
        pgn: match.pgn,
        turn: match.turn,
        status: match.status,
        result: match.result,
        terminationReason: match.terminationReason,
        whitePlayer: match.whitePlayer,
        blackPlayer: match.blackPlayer,
        whiteTimeRemaining: match.whiteTimeRemaining,
        blackTimeRemaining: match.blackTimeRemaining,
        side: match.whitePlayerId === user.sub ? 'w' : 'b',
        moves: match.moves,
      });
    } catch (err: any) {
      client.emit('match:error', {
        message: err.message || 'Match not found',
      });
    }
  }

  @SubscribeMessage('match:move')
  async handleMatchMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; from: string; to: string; promotion?: string },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return client.emit('match:error', { message: 'Unauthorized' });

    try {
      const result = await this.matchesService.processMove(data.matchId, user.sub, {
        from: data.from,
        to: data.to,
        promotion: data.promotion,
      });

      // Broadcast accepted move to the room
      this.server.to(`match:${data.matchId}`).emit('match:move-accepted', result);

      if (result.status === 'completed') {
        this.server.to(`match:${data.matchId}`).emit('match:ended', {
          matchId: data.matchId,
          result: result.result,
          terminationReason: result.terminationReason,
          fen: result.fen,
          pgn: result.pgn,
        });
      }
    } catch (err: any) {
      client.emit('match:move-rejected', {
        matchId: data.matchId,
        reason: err.message || 'Move rejected',
      });
    }
  }

  @SubscribeMessage('match:resign')
  async handleMatchResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return client.emit('match:error', { message: 'Unauthorized' });

    try {
      const result = await this.matchesService.resign(data.matchId, user.sub);
      this.server.to(`match:${data.matchId}`).emit('match:ended', {
        matchId: data.matchId,
        result: result.result,
        terminationReason: result.terminationReason,
        resignedBy: user.sub,
      });
    } catch (err: any) {
      client.emit('match:error', {
        message: err.message || 'Could not resign match',
      });
    }
  }

  @SubscribeMessage('match:timeout')
  async handleMatchTimeout(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const user: JwtPayload = client.data.user;
    if (!user) return client.emit('match:error', { message: 'Unauthorized' });

    try {
      const result = await this.matchesService.claimTimeout(data.matchId, user.sub);
      if (result.status === 'completed') {
        this.server.to(`match:${data.matchId}`).emit('match:ended', {
          matchId: data.matchId,
          result: result.result,
          terminationReason: result.terminationReason,
          fen: result.fen,
          pgn: result.pgn,
        });
      }
    } catch (err: any) {
      client.emit('match:error', {
        message: err.message || 'Could not process timeout',
      });
    }
  }
}
