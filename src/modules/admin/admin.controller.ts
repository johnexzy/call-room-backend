import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateRepresentativeDto } from './dto/update-representative.dto';
import { ParseDatePipe } from '../../pipes/parse-date.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('admin')
@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('representatives')
  @ApiOperation({ summary: 'Get all representatives' })
  getRepresentatives() {
    return this.adminService.getRepresentatives();
  }

  @Put('representatives/:id')
  @ApiOperation({ summary: 'Update representative details' })
  updateRepresentative(
    @Param('id') id: string,
    @Body() updateDto: UpdateRepresentativeDto,
  ) {
    return this.adminService.updateRepresentative(id, updateDto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiQuery({ name: 'startDate', type: String })
  @ApiQuery({ name: 'endDate', type: String })
  getSystemMetrics(
    @Query('startDate', ParseDatePipe) startDate: Date,
    @Query('endDate', ParseDatePipe) endDate: Date,
  ) {
    return this.adminService.getSystemMetrics(startDate, endDate);
  }

  @Get('queue/live')
  @ApiOperation({ summary: 'Monitor live queue' })
  monitorLiveQueue() {
    return this.adminService.monitorLiveQueue();
  }

  @Get('calls/active')
  @ApiOperation({ summary: 'Get active calls' })
  getActiveCalls() {
    return this.adminService.getActiveCalls();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system settings' })
  updateSettings(@Body() updateDto: UpdateSettingsDto) {
    return this.adminService.updateSettings(updateDto);
  }
}
