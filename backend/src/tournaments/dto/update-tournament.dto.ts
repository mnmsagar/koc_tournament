import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateTournamentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timeControl?: string;

  @IsInt()
  @Min(30)
  @IsOptional()
  initialTimeSeconds?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  incrementSeconds?: number;

  @IsEnum(['draft', 'open', 'ongoing', 'completed'])
  @IsOptional()
  status?: 'draft' | 'open' | 'ongoing' | 'completed';

  @IsString()
  @IsOptional()
  startDate?: string;
}
