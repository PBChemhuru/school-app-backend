// src/modules/academics/activity/activity-membership/activity-membership.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityMembershipService } from './activity-membership.service';
import { FilterMembershipDto } from './dto/filter-activity-membership.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role, ActivityMembershipStatus } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Activity Memberships')
@ApiBearerAuth()
@Controller('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityMembershipController {
  constructor(
    private readonly membershipService: ActivityMembershipService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== STUDENT: SIGN UP ====================

  @Post('activities/:activityId/sign-up')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Sign up for an activity (Student only)' })
  @ApiParam({ name: 'activityId', description: 'Activity ID' })
  @ApiResponse({
    status: 201,
    description: 'Signup submitted — awaiting approval',
  })
  @ApiResponse({ status: 409, description: 'Already a member or pending' })
  async signUp(
    @Param('activityId') activityId: string,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.membershipService.signUp(
      activityId,
      req.user.sub,
    );
    return {
      ...result.membership.toPublicJSON(),
      message: result.message,
    };
  }

  // ==================== STUDENT: MY ACTIVITIES ====================

  @Get('my-activities')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Get activities I have signed up for (Student only)',
  })
  @ApiResponse({ status: 200, description: 'Returns my memberships' })
  async getMyActivities(@Req() req: RequestWithUser) {
    const memberships = await this.membershipService.findByStudent(
      req.user.sub,
    );
    return memberships.map((m) => m.toPublicJSON());
  }

  // ==================== COORDINATOR: PENDING ACROSS MY ACTIVITIES ====================

  @Get('my-pending')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary:
      'Get all pending signups for activities I coordinate (Teacher only)',
  })
  @ApiResponse({ status: 200, description: 'Returns pending memberships' })
  async getMyPending(@Req() req: RequestWithUser) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: req.user.sub },
    });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    const memberships =
      await this.membershipService.findPendingSignupsForCoordinator(teacher.id);

    return memberships.map((m) => m.toCoordinatorJSON());
  }

  // ==================== ADMIN: PENDING ACROSS SCHOOL ====================

  @Get('pending')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all pending signups across the school (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Returns all pending memberships' })
  async getAllPending() {
    const memberships = await this.membershipService.findAllPending();
    return memberships.map((m) => m.toCoordinatorJSON());
  }

  // ==================== ADMIN: PENDING STATS ====================

  @Get('pending/stats')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get pending signup counts grouped by activity' })
  @ApiQuery({ name: 'coordinatorId', required: false })
  @ApiResponse({ status: 200, description: 'Returns counts per activity' })
  async getPendingStats(
    @Req() req: RequestWithUser,
    @Query('coordinatorId') coordinatorId?: string,
  ) {
    // Teachers are auto-scoped to their own activities
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.sub },
      });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');

      return this.membershipService.getPendingStats(teacher.id);
    }

    // Admins can query any coordinator or leave empty for all
    return this.membershipService.getPendingStats(coordinatorId);
  }

  // ==================== COORDINATOR: ACTIVITY MEMBERS ====================

  @Get('activities/:activityId/memberships')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List memberships for an activity' })
  @ApiParam({ name: 'activityId', description: 'Activity ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ActivityMembershipStatus,
    description: 'Filter by status (e.g., APPROVED)',
  })
  @ApiResponse({ status: 200, description: 'Returns memberships' })
  async getActivityMemberships(
    @Param('activityId') activityId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: ActivityMembershipStatus,
  ) {
    const memberships = await this.membershipService.findByActivity(
      activityId,
      status as 'PENDING' | 'APPROVED' | undefined,
    );

    return req.user.role === Role.ADMIN
      ? memberships.map((m) => m.toAdminJSON())
      : memberships.map((m) => m.toCoordinatorJSON());
  }

  @Get('activities/:activityId/memberships/pending')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List only pending memberships for an activity' })
  @ApiParam({ name: 'activityId', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Returns pending memberships' })
  async getActivityPending(@Param('activityId') activityId: string) {
    const memberships = await this.membershipService.findPending(activityId);
    return memberships.map((m) => m.toCoordinatorJSON());
  }

  @Get('activities/:activityId/memberships/stats')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get membership stats for an activity' })
  @ApiParam({ name: 'activityId', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Returns stats' })
  getActivityStats(@Param('activityId') activityId: string) {
    return this.membershipService.getActivityMembershipStats(activityId);
  }

  // ==================== COORDINATOR: APPROVE ====================

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Approve a pending signup (Coordinator or Admin)' })
  @ApiParam({ name: 'id', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Signup approved' })
  @ApiResponse({ status: 400, description: 'Not pending or activity full' })
  @ApiResponse({ status: 403, description: 'Not the coordinator' })
  async approve(
    @Param('id') membershipId: string,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.membershipService.approve(
      membershipId,
      req.user.id,
    );
    return {
      ...result.membership.toCoordinatorJSON(),
      message: result.message,
    };
  }

  // ==================== WITHDRAW / REMOVE ====================

  @Delete(':id')
  @Roles(Role.STUDENT, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Withdraw from an activity (Student) or remove a member (Admin)',
  })
  @ApiParam({ name: 'id', description: 'Membership ID' })
  @ApiResponse({ status: 204, description: 'Membership removed' })
  @ApiResponse({ status: 403, description: 'Not your membership' })
  async remove(@Param('id') membershipId: string, @Req() req: RequestWithUser) {
    if (req.user.role === Role.ADMIN) {
      await this.membershipService.removeMember(membershipId);
      return;
    }

    await this.membershipService.withdraw(membershipId, req.user.id);
  }

  // ==================== SHARED: FILTER ====================

  @Get('filter')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Filter memberships' })
  @ApiResponse({ status: 200, description: 'Returns filtered memberships' })
  async filter(@Query() dto: FilterMembershipDto, @Req() req: RequestWithUser) {
    const memberships = await this.membershipService.filter(dto);

    return req.user.role === Role.ADMIN
      ? memberships.map((m) => m.toAdminJSON())
      : memberships.map((m) => m.toCoordinatorJSON());
  }

  // ==================== SINGLE (must be last) ====================

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get a single membership by ID' })
  @ApiParam({ name: 'id', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Returns the membership' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const membership = await this.membershipService.findOne(id);

    return req.user.role === Role.ADMIN
      ? membership.toAdminJSON()
      : membership.toCoordinatorJSON();
  }
}
