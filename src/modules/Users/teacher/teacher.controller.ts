// src/modules/teacher/teacher.controller.ts

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
  Req,
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
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher-admin.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { AdminRole, Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { TeacherEntity } from './entities/teacher.entity';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  // ==================== GET ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all teachers (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all teachers' })
  findAll() {
    return this.teacherService.findAll();
  }

  /* @Get('me/subjects')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get subjects for current teacher' })
  @ApiResponse({ status: 200, description: "Returns teacher's subjects" })
  async getMySubjects(@Req() req: RequestWithUser) {
    const teacher = await this.teacherService.findByUserId(req.user.id);
    return this.teacherService.getTeacherSubjects(teacher.id);
  }

  @Get('me/timetable')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable for current teacher' })
  @ApiResponse({ status: 200, description: "Returns teacher's timetable" })
  async getMyTimetable(@Req() req: RequestWithUser) {
    const teacher = await this.teacherService.findByUserId(req.user.id);
    return this.teacherService.getTeacherTimetable(teacher.id);
  }
*/

  @Get('user/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get teacher by user ID (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns teacher details' })
  findByUserId(@Param('userId') userId: string) {
    return this.teacherService.findOne(userId);
  }

  @Get('employee/:employeeNumber')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get teacher by employee number (Admin only)' })
  @ApiParam({ name: 'employeeNumber', description: 'Employee number' })
  @ApiResponse({ status: 200, description: 'Returns teacher details' })
  findByEmployeeNumber(@Param('employeeNumber') employeeNumber: string) {
    return this.teacherService.findByEmployeeNumber(employeeNumber);
  }

  /*
  @Get(':id/classes')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get classes for a teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: "Returns teacher's classes" })
  async getTeacherClasses(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    // Teachers can only view their own classes
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.teacherService.findByUserId(req.user.id);
      if (teacher.id !== id) {
        throw new ForbiddenException('You can only view your own classes');
      }
    }
    return this.teacherService.getTeacherClasses(id);
  }

  @Get(':id/subjects')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get subjects for a teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: "Returns teacher's subjects" })
  async getTeacherSubjects(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.teacherService.findByUserId(req.user.id);
      if (teacher.id !== id) {
        throw new ForbiddenException('You can only view your own subjects');
      }
    }
    return this.teacherService.getTeacherSubjects(id);
  }

  @Get(':id/timetable')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable for a teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: "Returns teacher's timetable" })
  async getTeacherTimetable(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    if (req.user.role === Role.TEACHER) {
      const teacher = await this.teacherService.findByUserId(req.user.id);
      if (teacher.id !== id) {
        throw new ForbiddenException('You can only view your own timetable');
      }
    }
    return this.teacherService.getTeacherTimetable(id);
  }
*/

  @Get('search')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Search teachers (Admin only)' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Returns matching teachers' })
  searchTeachers(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: string,
  ) {
    return this.teacherService.searchTeachers(
      searchTerm,
      limit ? parseInt(limit) : 10,
    );
  }

  /*
  @Get('statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get teacher statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns teacher statistics' })
  getStatistics() {
    return this.teacherService.getStatistics();
  }
  */

  // ==================== POST ENDPOINTS ====================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @ApiOperation({ summary: 'Create teacher profile (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Teacher profile created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Teacher already exists' })
  @Post(':userId')
  createTeacherProfile(
    @Param('userId') userId: string,
    @Body() dto: CreateTeacherDto,
  ): Promise<TeacherEntity> {
    return this.teacherService.create(userId, dto);
  }
  /*
  @Post(':id/assign-class')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign teacher to a class (Admin only)' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Class assigned successfully' })
  assignClass(@Param('id') id: string, @Body() assignClassDto: AssignClassDto) {
    return this.teacherService.assignClass(
      id,
      assignClassDto.classId,
      assignClassDto.isClassTeacher || false,
    );
  }

  @Post(':id/assign-subjects')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign subjects to teacher (Admin only)' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Subjects assigned successfully' })
  assignSubjects(
    @Param('id') id: string,
    @Body() assignSubjectDto: AssignSubjectDto,
  ) {
    return this.teacherService.assignSubjects(id, assignSubjectDto.subjectIds);
  }
  */

  // ==================== PATCH ENDPOINTS ====================

  @Patch('me')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update current teacher profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateMyProfile(
    @Req() req: RequestWithUser,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ) {
    const teacher = await this.teacherService.findOne(req.user.sub);
    return this.teacherService.update(
      teacher.id,
      updateTeacherDto,
      req.user.sub,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update any teacher profile (Admin only)' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  updateTeacher(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @Req() req: RequestWithUser,
  ) {
    return this.teacherService.update(id, updateTeacherDto, req.user.sub);
  }
  // ==================== DELETE ENDPOINTS ====================

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete teacher (Admin only)' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiResponse({ status: 204, description: 'Teacher deleted successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async remove(@Param('id') id: string) {
    await this.teacherService.remove(id);
  }
}
