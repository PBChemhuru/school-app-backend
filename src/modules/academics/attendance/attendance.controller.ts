// src/modules/academics/attendance/attendance.controller.ts

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkMarkAttendanceDto } from './dto/bulk-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== ADMIN ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all attendance records (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all attendance records' })
  findAll() {
    return this.attendanceService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create attendance record' })
  @ApiResponse({ status: 201, description: 'Attendance created' })
  @ApiResponse({ status: 409, description: 'Attendance already marked' })
  async create(@Body() dto: CreateAttendanceDto, @Req() req: RequestWithUser) {
    // If teacher, verify they can access this student
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.sub },
      });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');
      await this.attendanceService.verifyTeacherCanAccessStudent(
        teacher.id,
        dto.studentId,
      );
    }

    return this.attendanceService.create(dto);
  }

  @Post('bulk-mark')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Bulk mark attendance for multiple students' })
  @ApiResponse({ status: 201, description: 'Bulk operation completed' })
  async bulkMark(
    @Body() dto: BulkMarkAttendanceDto,
    @Req() req: RequestWithUser,
  ) {
    // If teacher, verify they can access these students
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.sub },
      });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');

      // Verify access for each student
      for (const record of dto.records) {
        await this.attendanceService.verifyTeacherCanAccessStudent(
          teacher.id,
          record.studentId,
        );
      }
    }

    return this.attendanceService.bulkMark(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Update attendance record' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiResponse({ status: 200, description: 'Attendance updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Req() req: RequestWithUser,
  ) {
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.sub },
      });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');

      const record = await this.attendanceService.findOne(id);
      await this.attendanceService.verifyTeacherCanAccessStudent(
        teacher.id,
        record.studentId,
      );
    }

    return this.attendanceService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete attendance record (Admin only)' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiResponse({ status: 204, description: 'Attendance deleted' })
  async remove(@Param('id') id: string) {
    await this.attendanceService.remove(id);
  }

  // ==================== SHARED QUERY ENDPOINTS ====================

  @Get('filter')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Filter attendance records' })
  @ApiResponse({ status: 200, description: 'Returns filtered records' })
  async filter(@Query() dto: FilterAttendanceDto, @Req() req: RequestWithUser) {
    const records = await this.attendanceService.filter(dto);

    return req.user.role === Role.ADMIN
      ? records.map((r) => r.toAdminJSON())
      : records.map((r) => r.toTeacherJSON());
  }

  @Get('class/:classId/date/:date')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get attendance for a class on a specific date' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'date', description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Returns class attendance' })
  async findByClassAndDate(
    @Param('classId') classId: string,
    @Param('date') date: string,
    @Req() req: RequestWithUser,
  ) {
    const records = await this.attendanceService.findByClassAndDate(
      classId,
      date,
    );

    return req.user.role === Role.ADMIN
      ? records.map((r) => r.toAdminJSON())
      : records.map((r) => r.toTeacherJSON());
  }

  @Get('class/:classId/statistics')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get attendance statistics for a class on a date' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'date', description: 'Date (YYYY-MM-DD)', required: true })
  @ApiResponse({ status: 200, description: 'Returns class statistics' })
  getClassStatistics(
    @Param('classId') classId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getClassStatistics(classId, date);
  }

  @Get('class/:classId/trend')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get attendance trend for a class over time' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Returns trend data' })
  getClassTrend(
    @Param('classId') classId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getClassAttendanceTrend(
      classId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiResponse({ status: 200, description: 'Returns attendance record' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const record = await this.attendanceService.findOne(id);

    return req.user.role === Role.ADMIN
      ? record.toAdminJSON()
      : record.toTeacherJSON();
  }

  // ==================== STUDENT ENDPOINTS ====================

  @Get('my-attendance')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get my attendance records (Student only)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Returns my attendance' })
  async getMyAttendance(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId: req.user.sub },
    });
    if (!student) throw new ForbiddenException('Student profile not found');

    const records =
      startDate && endDate
        ? await this.attendanceService.findByDateRange(
            student.id,
            startDate,
            endDate,
          )
        : await this.attendanceService.findByStudent(student.id);

    return records.map((r) => r.toPublicJSON());
  }

  @Get('my-statistics')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get my attendance statistics (Student only)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Returns statistics' })
  async getMyStatistics(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId: req.user.sub },
    });
    if (!student) throw new ForbiddenException('Student profile not found');

    return this.attendanceService.getStudentStatistics(
      student.id,
      startDate,
      endDate,
    );
  }

  // ==================== PARENT ENDPOINTS ====================

  @Get('child/:studentId')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get attendance for a linked child (Parent only)' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Returns child attendance' })
  @ApiResponse({ status: 403, description: 'Not linked to this student' })
  async getChildAttendance(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.verifyParentLink(req.user.sub, studentId);

    const records =
      startDate && endDate
        ? await this.attendanceService.findByDateRange(
            studentId,
            startDate,
            endDate,
          )
        : await this.attendanceService.findByStudent(studentId);

    return records.map((r) => r.toPublicJSON());
  }

  @Get('child/:studentId/statistics')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get attendance statistics for a linked child' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Returns statistics' })
  async getChildStatistics(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.verifyParentLink(req.user.sub, studentId);

    return this.attendanceService.getStudentStatistics(
      studentId,
      startDate,
      endDate,
    );
  }

  @Get('child/:studentId/report')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get a full attendance report for a linked child' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Returns full report' })
  async getChildReport(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.verifyParentLink(req.user.sub, studentId);
    return this.attendanceService.getStudentAttendanceReport(studentId);
  }

  // ==================== HELPERS ====================

  private async verifyParentLink(
    userId: string,
    studentId: string,
  ): Promise<void> {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    });
    if (!parent) throw new ForbiddenException('Parent profile not found');

    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: { parentId: parent.id, studentId },
      },
    });

    if (!link || !link.approved) {
      throw new ForbiddenException('You are not linked to this student');
    }
  }
}
