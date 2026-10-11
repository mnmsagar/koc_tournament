import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty({ message: 'Tournament name is required' })
  name!: string;

  @IsString()
  @IsOptional()
  timeControl?: string = '5+0';

  @IsInt()
  @Min(30, { message: 'Initial time must be at least 30 seconds' })
  @IsOptional()
  initialTimeSeconds?: number = 300;

  @IsInt()
  @Min(0)
  @IsOptional()
  incrementSeconds?: number = 0;

  @IsEnum(['draft', 'open'], { message: 'Initial status can be draft or open' })
  @IsOptional()
  status?: 'draft' | 'open' = 'open';

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
