import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MoveDto {
  @IsString({ message: 'from square must be a string' })
  @IsNotEmpty({ message: 'from square is required' })
  from!: string;

  @IsString({ message: 'to square must be a string' })
  @IsNotEmpty({ message: 'to square is required' })
  to!: string;

  @IsString({ message: 'promotion must be a string' })
  @IsOptional()
  promotion?: string;
}
