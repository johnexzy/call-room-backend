import {
  IsUUID,
  IsInt,
  IsString,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty()
  @IsUUID()
  callId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metrics?: {
    audioQuality?: number;
    connectionQuality?: number;
    agentKnowledge?: number;
    resolution?: number;
  };
}
