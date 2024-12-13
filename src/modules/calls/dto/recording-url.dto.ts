import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RecordingUrlDto {
  @ApiProperty({
    description: 'Whether to generate a long-lived URL (7 days)',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  longLived?: boolean = false;

  @ApiProperty({
    description: 'Whether to return the URL as a downloadable file',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  download?: boolean = false;
}
