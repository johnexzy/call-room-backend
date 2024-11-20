import { IsNumber, IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxQueueSize?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxWaitTime?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enableCallbacks?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enableAutoAssignment?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  workingHoursStart?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  workingHoursEnd?: string;
}
