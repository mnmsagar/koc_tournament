import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import {
  users,
  tournaments,
  tournamentParticipants,
  matches,
} from '../database/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto) {
    const foundUsers = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase().trim()));

    if (foundUsers.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = foundUsers[0];
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async register(dto: RegisterDto, res: Response) {
    const cleanEmail = dto.email.toLowerCase().trim();

    const existingUsers = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existingUsers.length > 0) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const assignedRole = dto.role === 'coach' ? 'coach' : 'student';

    const insertedUsers = await this.dbService.db
      .insert(users)
      .values({
        name: dto.name.trim(),
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
      })
      .returning();

    const newUser = insertedUsers[0];

    return this.login(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as 'coach' | 'student',
      },
      res,
    );
  }

  async login(user: { id: string; email: string; name: string; role: 'coach' | 'student' }, res: Response) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = await this.jwtService.signAsync(payload);

    const isSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path: '/',
      domain: domain === 'localhost' ? undefined : domain,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return {
      success: true,
      user,
      token, // Also returned for clients/testing if cookie is not parsed
    };
  }

  logout(res: Response) {
    const isSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path: '/',
      domain: domain === 'localhost' ? undefined : domain,
    });

    return { success: true, message: 'Logged out successfully' };
  }

  async getUserById(id: string) {
    const [found] = await this.dbService.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id));
    return found || null;
  }

  async getUserStats(userId: string, role: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (role === 'coach') {
      const coachTournaments = await this.dbService.db
        .select({
          id: tournaments.id,
          name: tournaments.name,
          timeControl: tournaments.timeControl,
          status: tournaments.status,
          startDate: tournaments.startDate,
          endDate: tournaments.endDate,
          createdAt: tournaments.createdAt,
        })
        .from(tournaments)
        .where(eq(tournaments.createdBy, userId))
        .orderBy(desc(tournaments.createdAt));

      const tournamentIds = coachTournaments.map((t) => t.id);

      let totalParticipants = 0;
      let totalMatches = 0;

      if (tournamentIds.length > 0) {
        const participants = await this.dbService.db
          .select({
            userId: tournamentParticipants.userId,
          })
          .from(tournamentParticipants)
          .where(inArray(tournamentParticipants.tournamentId, tournamentIds));

        const uniqueUserIds = new Set(participants.map((p) => p.userId));
        totalParticipants = uniqueUserIds.size;

        const matchRecords = await this.dbService.db
          .select({
            id: matches.id,
          })
          .from(matches)
          .where(inArray(matches.tournamentId, tournamentIds));

        totalMatches = matchRecords.length;
      }

      const activeEvents = coachTournaments.filter(
        (t) => t.status === 'open' || t.status === 'ongoing',
      ).length;
      const completedEvents = coachTournaments.filter(
        (t) => t.status === 'completed',
      ).length;

      return {
        role: 'coach',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        title: 'Tournament Director & Arbiter',
        tournamentsHosted: coachTournaments.length,
        activeEvents,
        completedEvents,
        totalParticipants,
        totalMatches,
        recentTournaments: coachTournaments.slice(0, 5),
      };
    } else {
      // Student
      const participations = await this.dbService.db
        .select({
          id: tournamentParticipants.id,
          tournamentId: tournamentParticipants.tournamentId,
          score: tournamentParticipants.score,
          joinedAt: tournamentParticipants.joinedAt,
          tournamentName: tournaments.name,
          tournamentStatus: tournaments.status,
          timeControl: tournaments.timeControl,
        })
        .from(tournamentParticipants)
        .innerJoin(tournaments, eq(tournamentParticipants.tournamentId, tournaments.id))
        .where(eq(tournamentParticipants.userId, userId))
        .orderBy(desc(tournamentParticipants.joinedAt));

      const userMatches = await this.dbService.db
        .select({
          id: matches.id,
          tournamentId: matches.tournamentId,
          whitePlayerId: matches.whitePlayerId,
          blackPlayerId: matches.blackPlayerId,
          status: matches.status,
          result: matches.result,
          terminationReason: matches.terminationReason,
          endedAt: matches.endedAt,
          createdAt: matches.createdAt,
        })
        .from(matches)
        .where(
          or(eq(matches.whitePlayerId, userId), eq(matches.blackPlayerId, userId)),
        )
        .orderBy(desc(matches.createdAt));

      const completed = userMatches.filter((m) => m.status === 'completed');
      let wins = 0;
      let draws = 0;
      let losses = 0;

      for (const m of completed) {
        if (m.result === 'draw') {
          draws++;
        } else if (
          (m.whitePlayerId === userId && m.result === 'white') ||
          (m.blackPlayerId === userId && m.result === 'black')
        ) {
          wins++;
        } else if (
          (m.whitePlayerId === userId && m.result === 'black') ||
          (m.blackPlayerId === userId && m.result === 'white')
        ) {
          losses++;
        }
      }

      // Base blitz rating 1200 + score delta
      const ratingNet = wins * 20 + draws * 5 - losses * 15;
      const rating = Math.max(800, 1200 + ratingNet);

      // Streak calculation
      let streak = 0;
      for (const m of completed) {
        const isWin =
          (m.whitePlayerId === userId && m.result === 'white') ||
          (m.blackPlayerId === userId && m.result === 'black');
        if (isWin) {
          streak++;
        } else {
          break;
        }
      }

      // Dynamic title
      let title = 'Junior Scholar';
      if (completed.length === 0) {
        title = 'Academy Novice';
      } else if (rating >= 1800) {
        title = 'Grandmaster Candidate';
      } else if (rating >= 1500) {
        title = 'Master Scholar';
      } else if (rating >= 1300) {
        title = 'Gold Candidate';
      } else if (rating >= 1100) {
        title = 'Silver Candidate';
      }

      const winRate =
        completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;

      return {
        role: 'student',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        title,
        rating,
        ratingNet,
        streak,
        tournamentsJoined: participations.length,
        totalGames: userMatches.length,
        completedGames: completed.length,
        wins,
        draws,
        losses,
        winRate,
        recentParticipations: participations.slice(0, 5),
      };
    }
  }
}
