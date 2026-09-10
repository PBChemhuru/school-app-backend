import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentEntity } from './entities/student.entity';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { CreateStudentAdminDto } from 'src/modules/Users/student/dto/create-student-admin.dto';
import { UpdateStudentAdminDto } from './dto/update-admin.dto';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import {
  AdminRole,
  TeacherRole,
} from 'src/modules/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { JwtPayload } from 'src/modules/auth/types/request-with-user';
import { Role } from '@prisma/client';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';

ApiTags('Students');
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @TeacherRole()
  @ApiOperation({
    summary: 'Get all students',
  })
  findAll(): Promise<StudentEntity[]> {
    return this.studentService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @TeacherRole()
  @ApiOperation({
    summary: 'Get student by userId',
  })
  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string): Promise<StudentEntity> {
    return this.studentService.findByUserId(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @TeacherRole()
  @Get(':id')
  @ApiOperation({
    summary: 'Get student  by studentId',
  })
  findOne(@Param('id') id: string): Promise<StudentEntity> {
    return this.studentService.findByStudentId(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STUDENT)
  @Patch(':id')
  studentUpdate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<StudentEntity> {
    return this.studentService.studentUpdate(id, updateStudentDto, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @Patch('adminupdate/:id')
  adminstudentupdate(
    @Param('id') id: string,
    @Body() UpdateStudentAdminDto: UpdateStudentAdminDto,
  ) {
    return this.studentService.adminUpdate(id, UpdateStudentAdminDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<string> {
    return this.studentService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRole()
  @Post('createStudents/:userId')
  createStudentProfile(
    @Param('userId') userId: string,
    @Body() dto: CreateStudentAdminDto,
  ): Promise<StudentEntity> {
    return this.studentService.createStudentProfile(userId, dto);
  }
}
