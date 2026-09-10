// src/modules/academics/timetable/timetable.controller.ts

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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { FilterTimetableDto } from './dto/filter-timetable.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictCheck } from './types/conflict-check.interface';

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== ADMIN ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all timetable entries (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all timetable entries' })
  findAll() {
    return this.timetableService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create timetable entry (Admin only)' })
  @ApiResponse({ status: 201, description: 'Timetable entry created' })
  @ApiResponse({ status: 409, description: 'Conflict detected' })
  create(@Body() dto: CreateTimetableDto) {
    return this.timetableService.create(dto);
  }

  @Post('check-conflicts')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Check for conflicts before creating (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns conflict check result' })
  async checkConflicts(
    @Body() dto: CreateTimetableDto,
  ): Promise<{ hasConflicts: boolean; conflicts: ConflictCheck }> {
    const conflicts = await this.timetableService.checkConflictsForDto(
      dto.classId,
      dto.teacherId,
      dto.room,
      dto.dayOfWeek,
      new Date(dto.startTime),
      new Date(dto.endTime),
    );
    return {
      hasConflicts: !!(
        conflicts.teacherConflict ||
        conflicts.roomConflict ||
        conflicts.classConflict
      ),
      conflicts,
    };
  }

  @Post('clone/:sourceClassId/:targetClassId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Clone timetable from one class to another (Admin only)',
  })
  @ApiParam({ name: 'sourceClassId', description: 'Source Class ID' })
  @ApiParam({ name: 'targetClassId', description: 'Target Class ID' })
  @ApiResponse({ status: 200, description: 'Timetable cloned' })
  cloneTimetable(
    @Param('sourceClassId') sourceClassId: string,
    @Param('targetClassId') targetClassId: string,
  ) {
    return this.timetableService.cloneTimetableFromClass(
      sourceClassId,
      targetClassId,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update timetable entry (Admin only)' })
  @ApiParam({ name: 'id', description: 'Timetable Entry ID' })
  @ApiResponse({ status: 200, description: 'Timetable entry updated' })
  @ApiResponse({ status: 409, description: 'Conflict detected' })
  update(@Param('id') id: string, @Body() dto: UpdateTimetableDto) {
    return this.timetableService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete timetable entry (Admin only)' })
  @ApiParam({ name: 'id', description: 'Timetable Entry ID' })
  @ApiResponse({ status: 204, description: 'Timetable entry deleted' })
  async remove(@Param('id') id: string) {
    await this.timetableService.remove(id);
  }

  @Delete('class/:classId/all')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete all timetable entries for a class (Admin only)',
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Timetable entries deleted' })
  removeByClass(@Param('classId') classId: string) {
    return this.timetableService.removeByClass(classId);
  }
  // ==================== TEACHER ENDPOINTS ====================

  @Get('my-schedule')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get my weekly schedule (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Returns weekly schedule' })
  async getMySchedule(@Req() req: RequestWithUser) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: req.user.sub },
    });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    const weekly = await this.timetableService.getWeeklyTimetableForTeacher(
      teacher.id,
    );

    const result: Record<string, unknown[]> = {};
    Object.entries(weekly.weeklySchedule).forEach(([day, entries]) => {
      result[day] = entries.map((t) => t.toTeacherJSON());
    });

    return {
      teacherId: weekly.teacherId,
      totalEntries: weekly.totalEntries,
      weeklySchedule: result,
    };
  }

  @Get('teacher/:teacherId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable for a specific teacher' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Returns teacher timetable' })
  @ApiResponse({ status: 403, description: 'Not your timetable' })
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Req() req: RequestWithUser,
  ) {
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.sub },
      });
      if (!teacher || teacher.id !== teacherId) {
        throw new ForbiddenException('You can only view your own timetable');
      }
    }

    const timetables = await this.timetableService.findByTeacher(teacherId);

    return req.user.role === Role.ADMIN
      ? timetables.map((t) => t.toAdminJSON())
      : timetables.map((t) => t.toTeacherJSON());
  }

  // ==================== STUDENT ENDPOINTS ====================

  @Get('my-class-schedule')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get my class timetable (Student only)' })
  @ApiResponse({ status: 200, description: 'Returns class timetable' })
  async getMyClassSchedule(@Req() req: RequestWithUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: req.user.sub },
    });
    if (!student) throw new ForbiddenException('Student profile not found');
    if (!student.currentClassId) {
      return { message: 'You are not assigned to a class yet' };
    }

    const weekly = await this.timetableService.getWeeklyTimetableForClass(
      student.currentClassId,
    );

    const result: Record<string, unknown[]> = {};
    Object.entries(weekly.weeklySchedule).forEach(([day, entries]) => {
      result[day] = entries.map((t) => t.toPublicJSON());
    });

    return {
      classId: weekly.classId,
      totalEntries: weekly.totalEntries,
      weeklySchedule: result,
    };
  }

  // ==================== PARENT ENDPOINTS ====================

  @Get('child/:studentId/schedule')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get timetable for a linked child (Parent only)' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Returns child timetable' })
  @ApiResponse({ status: 403, description: 'Not linked to this student' })
  async getChildSchedule(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
  ) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId: req.user.sub },
    });
    if (!parent) throw new ForbiddenException('Parent profile not found');

    // Verify parent is linked to this student
    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: { parentId: parent.id, studentId },
      },
    });
    if (!link || !link.approved) {
      throw new ForbiddenException('You are not linked to this student');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.currentClassId) {
      return { message: 'Student is not assigned to a class yet' };
    }

    const weekly = await this.timetableService.getWeeklyTimetableForClass(
      student.currentClassId,
    );

    const result: Record<string, unknown[]> = {};
    Object.entries(weekly.weeklySchedule).forEach(([day, entries]) => {
      result[day] = entries.map((t) => t.toPublicJSON());
    });

    return {
      studentId,
      classId: weekly.classId,
      totalEntries: weekly.totalEntries,
      weeklySchedule: result,
    };
  }

  // ==================== SHARED: VIEW BY CLASS ====================

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get timetable for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Returns class timetable' })
  async findByClass(
    @Param('classId') classId: string,
    @Req() req: RequestWithUser,
  ) {
    const timetables = await this.timetableService.findByClass(classId);

    // Role-aware response
    if (req.user.role === Role.ADMIN) {
      return timetables.map((t) => t.toAdminJSON());
    }
    if (req.user.role === Role.TEACHER) {
      return timetables.map((t) => t.toTeacherJSON());
    }
    return timetables.map((t) => t.toPublicJSON());
  }

  @Get('class/:classId/weekly')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get weekly timetable grouped by day for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Returns weekly schedule' })
  async getWeeklyByClass(
    @Param('classId') classId: string,
    @Req() req: RequestWithUser,
  ) {
    const weekly =
      await this.timetableService.getWeeklyTimetableForClass(classId);

    const result: Record<string, unknown[]> = {};
    Object.entries(weekly.weeklySchedule).forEach(([day, entries]) => {
      if (req.user.role === Role.ADMIN) {
        result[day] = entries.map((t) => t.toAdminJSON());
      } else if (req.user.role === Role.TEACHER) {
        result[day] = entries.map((t) => t.toTeacherJSON());
      } else {
        result[day] = entries.map((t) => t.toPublicJSON());
      }
    });

    return {
      classId: weekly.classId,
      totalEntries: weekly.totalEntries,
      weeklySchedule: result,
    };
  }

  // ==================== OTHER VIEWS ====================

  @Get('curriculum/:curriculumId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable entries for a curriculum' })
  @ApiParam({ name: 'curriculumId', description: 'Curriculum ID' })
  @ApiResponse({ status: 200, description: 'Returns curriculum timetable' })
  async findByCurriculum(
    @Param('curriculumId') curriculumId: string,
    @Req() req: RequestWithUser,
  ) {
    const timetables =
      await this.timetableService.findByCurriculum(curriculumId);

    return req.user.role === Role.ADMIN
      ? timetables.map((t) => t.toAdminJSON())
      : timetables.map((t) => t.toTeacherJSON());
  }

  @Get('filter')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Filter timetable entries' })
  @ApiResponse({ status: 200, description: 'Returns filtered timetable' })
  async filter(@Query() dto: FilterTimetableDto, @Req() req: RequestWithUser) {
    const timetables = await this.timetableService.filter(dto);

    return req.user.role === Role.ADMIN
      ? timetables.map((t) => t.toAdminJSON())
      : timetables.map((t) => t.toTeacherJSON());
  }

  @Get('statistics/class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable statistics for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Returns statistics' })
  getClassStatistics(@Param('classId') classId: string) {
    return this.timetableService.getStatisticsForClass(classId);
  }

  // ==================== SINGLE ENTRY ====================

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable entry by ID' })
  @ApiParam({ name: 'id', description: 'Timetable Entry ID' })
  @ApiResponse({ status: 200, description: 'Returns timetable entry' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const timetable = await this.timetableService.findOne(id);

    return req.user.role === Role.ADMIN
      ? timetable.toAdminJSON()
      : timetable.toTeacherJSON();
  }
}
