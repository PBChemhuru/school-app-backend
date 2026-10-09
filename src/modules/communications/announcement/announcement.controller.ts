// src/modules/communications/announcement/announcement.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { FilterAnnouncementDto } from './dto/filter-announcement.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { AnnouncementEntity } from './entities/announcement.entity';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // ==================== GET: MY FEED ====================

  @Get('feed')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({
    summary: 'Get my personal announcement feed (targeted to me)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns announcements for the current user',
  })
  async getMyFeed(@Req() req: RequestWithUser) {
    const announcements = await this.announcementService.findForUser(
      req.user.sub,
      req.user.role as Role,
    );

    // Public view: full body, no internal targeting details
    return announcements.map((a) => a.toPublicJSON());
  }

  // ==================== GET: LIST ALL ====================

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get all announcements (Admin/Teacher — dashboard view)',
  })
  @ApiResponse({ status: 200, description: 'Returns all announcements' })
  async findAll(@Req() req: RequestWithUser) {
    const announcements = await this.announcementService.findAll(
      req.user.role as Role,
    );
    return announcements.map((a) =>
      this.serializeForRole(a, req.user.role as Role),
    );
  }

  // ==================== GET: FILTER ====================

  @Get('filter')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Filter/search announcements (Admin/Teacher)' })
  @ApiResponse({ status: 200, description: 'Returns filtered announcements' })
  async filter(
    @Query() filterDto: FilterAnnouncementDto,
    @Req() req: RequestWithUser,
  ) {
    const announcements = await this.announcementService.filter(
      filterDto,
      req.user.role as Role,
    );
    return announcements.map((a) =>
      this.serializeForRole(a, req.user.role as Role),
    );
  }

  // ==================== POST: CREATE ====================

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create an announcement (Admin/Teacher)' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid scope/class/date combination',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async create(
    @Body() dto: CreateAnnouncementDto,
    @Req() req: RequestWithUser,
  ) {
    const announcement = await this.announcementService.create(
      dto,
      req.user.sub,
    );
    return announcement.toStaffJSON();
  }

  // ==================== PATCH: UPDATE ====================

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Update an announcement (Admin/Teacher)' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  @ApiResponse({
    status: 400,
    description: 'Invalid scope/class/date combination',
  })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    const announcement = await this.announcementService.update(id, dto);
    return announcement.toStaffJSON();
  }

  // ==================== DELETE ====================

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an announcement (Admin only)' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiResponse({ status: 204, description: 'Announcement deleted' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async remove(@Param('id') id: string) {
    await this.announcementService.remove(id);
  }

  // ==================== GET: SINGLE (must be last) ====================

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get an announcement by ID' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Returns announcement details' })
  @ApiResponse({ status: 403, description: 'Not visible to your role' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const announcement = await this.announcementService.findOne(
      id,
      req.user.role as Role,
    );
    return this.serializeForRole(announcement, req.user.role as Role);
  }

  // ==================== HELPERS ====================

  private serializeForRole(announcement: AnnouncementEntity, role: Role) {
    if (role === Role.ADMIN) return announcement.toAdminJSON();
    if (role === Role.TEACHER) return announcement.toStaffJSON();
    return announcement.toPublicJSON();
  }
}
