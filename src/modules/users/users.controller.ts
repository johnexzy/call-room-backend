import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@ApiTags('users')
@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Put('password')
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.usersService.findOne(req.user.id);
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return this.usersService.updatePassword(
      req.user.id,
      changePasswordDto.newPassword,
    );
  }

  @Put('availability')
  @ApiOperation({ summary: 'Update representative availability' })
  async updateAvailability(
    @Request() req,
    @Body() body: { isAvailable: boolean },
  ) {
    return this.usersService.updateAvailability(req.user.id, body.isAvailable);
  }
} 