import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address for the account',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password for the account (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'The first name of the user',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'The last name of the user',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'customer',
    description: 'The role of the user',
    enum: ['customer', 'representative'],
    default: 'customer',
  })
  @IsEnum(['customer', 'representative'])
  @IsOptional()
  role?: 'customer' | 'representative' = 'customer';
}
