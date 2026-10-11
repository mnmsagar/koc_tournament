import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async getAllTournaments(@Req() req: Request) {
    let userId: string | undefined;
    const token =
      req.cookies?.access_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        userId = payload?.sub;
      } catch {
        // Optional auth: unauthenticated guests or expired token safely ignored
      }
    }

    return this.tournamentsService.findAll(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('coach')
  async createTournament(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(user.sub, dto);
  }

  @Get(':id')
  async getTournamentById(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('coach')
  async updateTournament(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('coach')
  async deleteTournament(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tournamentsService.delete(id, user.sub);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinTournament(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tournamentsService.joinTournament(id, user.sub, user.role);
  }

  @Get(':id/leaderboard')
  async getLeaderboard(@Param('id') id: string) {
    return this.tournamentsService.getLeaderboard(id);
  }
}
