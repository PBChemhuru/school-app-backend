// src/modules/academics/class/class.controller.ts

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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchoolClassService } from 'src/modules/academics/schoolclass/schoolclass.service';
import { CreateSchoolclassDto } from './dto/create-schoolclass.dto';
import { UpdatesSchoolClassDto } from './dto/update-schoolclass.dto';
import { FilterSchoolClassDto } from './dto/filter-schoolclass.dto';
import { PromoteStudentsDto } from './dto/promote-student.dto';
import { AssignStudentDto } from './dto/assign-student.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolClassController {
  constructor(
    private readonly classService: SchoolClassService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== ADMIN GET ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all classes (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all classes' })
  async findAll() {
    const classes = await this.classService.findAll();
    return classes.map((c) => c.toAdminJSON());
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get classes in the active academic year' })
  @ApiResponse({ status: 200, description: 'Returns active classes' })
  async findActive(@Req() req: RequestWithUser) {
    const classes = await this.classService.findActiveClasses();
    return req.user.role === Role.ADMIN
      ? classes.map((c) => c.toAdminJSON())
      : classes.map((c) => c.toTeacherJSON());
  }

  @Get('filter')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Filter classes' })
  @ApiResponse({ status: 200, description: 'Returns filtered classes' })
  async filter(
    @Query() dto: FilterSchoolClassDto,
    @Req() req: RequestWithUser,
  ) {
    const classes = await this.classService.filter(dto);
    return req.user.role === Role.ADMIN
      ? classes.map((c) => c.toAdminJSON())
      : classes.map((c) => c.toTeacherJSON());
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Search classes' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Returns matching classes' })
  async search(
    @Query('q') q: string,
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
  ) {
    const classes = await this.classService.search(
      q,
      limit ? parseInt(limit) : 10,
    );
    return req.user.role === Role.ADMIN
      ? classes.map((c) => c.toAdminJSON())
      : classes.map((c) => c.toTeacherJSON());
  }

  @Get('academic-year/:academicYearId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get classes by academic year' })
  @ApiParam({ name: 'academicYearId', description: 'Academic Year ID' })
  @ApiResponse({ status: 200, description: 'Returns classes' })
  async findByAcademicYear(
    @Param('academicYearId') academicYearId: string,
    @Req() req: RequestWithUser,
  ) {
    const classes = await this.classService.findByAcademicYear(academicYearId);
    return req.user.role === Role.ADMIN
      ? classes.map((c) => c.toAdminJSON())
      : classes.map((c) => c.toTeacherJSON());
  }

  @Get('teacher/:teacherId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get classes taught by a teacher' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Returns classes' })
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Req() req: RequestWithUser,
  ) {
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: req.user.sub },
      });
      if (!teacher || teacher.id !== teacherId) {
        throw new ForbiddenException('You can only view your own classes');
      }
    }

    const classes = await this.classService.findByTeacher(teacherId);
    return req.user.role === Role.ADMIN
      ? classes.map((c) => c.toAdminJSON())
      : classes.map((c) => c.toTeacherJSON());
  }

  @Get('my-classes')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get my classes (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Returns my classes' })
  async getMyClasses(@Req() req: RequestWithUser) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: req.user.sub },
    });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    const classes = await this.classService.findByTeacher(teacher.id);
    return classes.map((c) => c.toTeacherJSON());
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get class by ID' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Returns class details' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const schoolClass = await this.classService.findOne(id);
    return req.user.role === Role.ADMIN
      ? schoolClass.toAdminJSON()
      : schoolClass.toTeacherJSON();
  }

  @Get(':id/statistics')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get class statistics' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Returns class statistics' })
  getStatistics(@Param('id') id: string) {
    return this.classService.getClassStatistics(id);
  }

  // ==================== CREATE / UPDATE / DELETE ====================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a class (Admin only)' })
  @ApiResponse({ status: 201, description: 'Class created' })
  @ApiResponse({ status: 409, description: 'Class already exists' })
  async create(@Body() dto: CreateSchoolclassDto) {
    const created = await this.classService.create(dto);
    return created.toAdminJSON();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class updated' })
  async update(@Param('id') id: string, @Body() dto: UpdatesSchoolClassDto) {
    const updated = await this.classService.update(id, dto);
    return updated.toAdminJSON();
  }

  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archive a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class archived' })
  async archive(@Param('id') id: string) {
    const archived = await this.classService.archive(id);
    return archived.toAdminJSON();
  }

  @Patch(':id/unarchive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unarchive a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class unarchived' })
  async unarchive(@Param('id') id: string) {
    const unarchived = await this.classService.unarchive(id);
    return unarchived.toAdminJSON();
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 204, description: 'Class deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete with associated data',
  })
  async remove(@Param('id') id: string) {
    await this.classService.remove(id);
  }

  // ==================== STUDENT MANAGEMENT ====================

  @Post(':id/students')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign student(s) to a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Student(s) assigned' })
  async assignStudents(
    @Param('id') classId: string,
    @Body() dto: AssignStudentDto,
  ) {
    if (dto.studentIds && dto.studentIds.length > 0) {
      return this.classService.assignMultipleStudents(classId, dto.studentIds);
    }
    if (dto.studentId) {
      const result = await this.classService.assignStudent(
        classId,
        dto.studentId,
      );
      return result.toAdminJSON();
    }
    throw new BadRequestException('Provide either studentId or studentIds');
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a student from a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student removed' })
  async removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.classService.removeStudent(classId, studentId);
    return result.toAdminJSON();
  }

  // ==================== PROMOTION ====================

  @Post('promote')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Promote students from one class to another (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Promotion completed' })
  promote(@Body() dto: PromoteStudentsDto) {
    return this.classService.promoteStudents(dto);
  }
}
