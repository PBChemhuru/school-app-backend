// src/modules/academics/subject/subject.controller.ts

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  // ==================== GET ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all subjects' })
  @ApiResponse({ status: 200, description: 'Returns all subjects' })
  findAll() {
    return this.subjectService.findAll();
  }

  @Get('popular')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get most popular subjects' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of subjects',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Returns popular subjects' })
  getPopularSubjects(@Query('limit') limit?: string) {
    return this.subjectService.getPopularSubjects(limit ? parseInt(limit) : 10);
  }

  @Get('departments')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get subject count by department' })
  @ApiResponse({ status: 200, description: 'Returns department counts' })
  getDepartmentCount() {
    return this.subjectService.getSubjectCountByDepartment();
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Search subjects' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Returns matching subjects' })
  search(@Query('q') searchTerm: string, @Query('limit') limit?: string) {
    return this.subjectService.search(searchTerm, limit ? parseInt(limit) : 10);
  }

  @Get('code/:code')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get subject by code' })
  @ApiParam({ name: 'code', description: 'Subject code' })
  @ApiResponse({ status: 200, description: 'Returns subject details' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  findByCode(@Param('code') code: string) {
    return this.subjectService.findByCode(code);
  }

  /*@Get('teacher/:teacherId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get subjects by teacher' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns subjects taught by teacher',
  })
  findByTeacher(@Param('teacherId') teacherId: string) {
    return this.subjectService.findByTeacher(teacherId);
  }

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get subjects by class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({
    name: 'academicYearId',
    description: 'Academic Year ID',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Returns subjects for class' })
  findByClass(
    @Param('classId') classId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.subjectService.findByClass(classId, academicYearId);
  }
    */

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get subject by ID' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Returns subject details' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  findOne(@Param('id') id: string) {
    return this.subjectService.findOne(id);
  }

  @Get(':id/statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get subject statistics (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Returns subject statistics' })
  getStatistics(@Param('id') id: string) {
    return this.subjectService.getSubjectStatistics(id);
  }

  // ==================== POST ENDPOINTS ====================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create subject (Admin only)' })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Subject already exists' })
  create(@Body() createDto: CreateSubjectDto) {
    return this.subjectService.create(createDto);
  }
  // ==================== PATCH ENDPOINTS ====================

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update subject (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({ status: 409, description: 'Subject already exists' })
  update(@Param('id') id: string, @Body() updateDto: UpdateSubjectDto) {
    return this.subjectService.update(id, updateDto);
  }

  // ==================== DELETE ENDPOINTS ====================

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subject (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 204, description: 'Subject deleted successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete with associated data',
  })
  async remove(@Param('id') id: string) {
    await this.subjectService.remove(id);
  }
}
