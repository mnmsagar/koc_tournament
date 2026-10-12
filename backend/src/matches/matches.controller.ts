import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MoveDto } from './dto/move.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getMyActiveMatch(@CurrentUser() user: JwtPayload) {
    return this.matchesService.getActiveMatchForPlayer(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMatchById(@Param('id') id: string) {
    return this.matchesService.getMatchById(id);
  }

  @Post(':id/move')
  @UseGuards(JwtAuthGuard)
  async makeMove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() move: MoveDto,
  ) {
    return this.matchesService.processMove(id, user.sub, move);
  }

  @Post(':id/resign')
  @UseGuards(JwtAuthGuard)
  async resignMatch(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.matchesService.resign(id, user.sub);
  }
}
