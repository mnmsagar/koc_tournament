import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.matchmakingService.getQueueStatus(user.sub);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@CurrentUser() user: JwtPayload) {
    return this.matchmakingService.removeFromQueue(user.sub);
  }
}
