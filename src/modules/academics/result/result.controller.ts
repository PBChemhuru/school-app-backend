// src/modules/academics/result/result.controller.ts

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
} from '@nestjs/swagger';
import { ResultService } from './result.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { EnterScoresDto } from './dto/enter-scores.dto';
import { PublishResultsDto } from './dto/publish-results.dto';
import { FilterResultDto } from './dto/filter-result.dto';
import { EntrySheetQueryDto } from './dto/entry-sheet-query.dto';
import { ReportCardQueryDto } from './dto/report-card.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultController {
  constructor(
    private readonly resultService: ResultService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== TEACHER: ENTRY SHEET ====================

  @Get('entry-sheet')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary:
      'Get score entry sheet for a class + subject + term (Teacher only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns entry sheet with students + existing scores',
  })
  @ApiResponse({ status: 403, description: 'Not your subject/class' })
  async getEntrySheet(
    @Query() query: EntrySheetQueryDto,
    @Req() req: RequestWithUser,
  ) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: req.user.sub },
    });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    return this.resultService.getEntrySheet({
      subjectId: query.subjectId,
      termId: query.termId,
      classId: query.classId,
      teacherId: teacher.id,
    });
  }

  // ==================== TEACHER: SAVE SCORES ====================

  @Post('enter-scores')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Submit scores for a class + subject + term (Teacher only)',
  })
  @ApiResponse({ status: 201, description: 'Scores saved successfully' })
  @ApiResponse({ status: 403, description: 'Not your subject/class' })
  @ApiResponse({
    status: 409,
    description: 'Some results are already published',
  })
  async enterScores(@Body() dto: EnterScoresDto, @Req() req: RequestWithUser) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: req.user.sub },
    });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    return this.resultService.enterScores(dto, teacher.id);
  }

  // ==================== TEACHER: OWN RESULTS ====================

  @Get('my-results')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get results I have entered (Teacher only)' })
  async getMyResults(@Req() req: RequestWithUser) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: req.user.sub },
    });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    const results = await this.resultService.findByTeacher(teacher.id);
    return results.map((r) => r.toTeacherJSON());
  }

  // ==================== ADMIN: LIST / CREATE / UPDATE / DELETE ====================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all results (Admin only)' })
  async findAll() {
    const results = await this.resultService.findAll();
    return results.map((r) => r.toAdminJSON());
  }

  @Get('filter')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Filter results' })
  async filter(@Query() dto: FilterResultDto, @Req() req: RequestWithUser) {
    const results = await this.resultService.filter(dto);
    return req.user.role === Role.ADMIN
      ? results.map((r) => r.toAdminJSON())
      : results.map((r) => r.toTeacherJSON());
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a result (Admin only)' })
  @ApiResponse({ status: 201, description: 'Result created' })
  @ApiResponse({ status: 409, description: 'Result already exists' })
  async create(@Body() dto: CreateResultDto) {
    const result = await this.resultService.create(dto);
    return result.toAdminJSON();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a result (Admin only)' })
  @ApiResponse({
    status: 400,
    description: 'Published results cannot be edited',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateResultDto) {
    const result = await this.resultService.update(id, dto);
    return result.toAdminJSON();
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a result (Admin only)' })
  @ApiResponse({
    status: 400,
    description: 'Published results cannot be deleted',
  })
  async remove(@Param('id') id: string) {
    await this.resultService.remove(id);
  }

  // ==================== ADMIN: PUBLISH / UNPUBLISH ====================

  @Post('publish')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Publish results for a term (Admin only)' })
  @ApiResponse({ status: 200, description: 'Results published' })
  publish(@Body() dto: PublishResultsDto) {
    return this.resultService.publishResults(dto);
  }

  @Post('unpublish')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unpublish results for a term (Admin only)' })
  @ApiResponse({ status: 200, description: 'Results unpublished' })
  unpublish(@Body() dto: PublishResultsDto) {
    return this.resultService.unpublishResults(dto);
  }

  // ==================== STUDENT: VIEW OWN RESULTS ====================

  @Get('my-results-as-student')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get my published results (Student only)' })
  async getStudentResults(@Req() req: RequestWithUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: req.user.sub },
    });
    if (!student) throw new ForbiddenException('Student profile not found');

    const results = await this.resultService.findByStudent(student.id);
    return results.map((r) => r.toPublicJSON());
  }

  // ==================== PARENT: VIEW CHILD'S RESULTS ====================

  @Get('child/:studentId')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: "Get a child's published results (Parent only)" })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 403, description: 'Not linked to this student' })
  async getChildResults(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.verifyParentLink(req.user.sub, studentId);

    const results = await this.resultService.findByStudent(studentId);
    return results.map((r) => r.toPublicJSON());
  }

  // ==================== REPORT CARD ====================

  @Get('report-card')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT)
  @ApiOperation({ summary: 'Generate a report card for a student' })
  @ApiResponse({ status: 200, description: 'Returns full report card' })
  async getReportCard(
    @Query() query: ReportCardQueryDto,
    @Req() req: RequestWithUser,
  ) {
    // Parents can only view their linked children
    if (req.user.role === Role.PARENT) {
      await this.verifyParentLink(req.user.sub, query.studentId);
    }

    return this.resultService.generateReportCard(query.studentId, query.termId);
  }

  // ==================== SINGLE RESULT (must be last) ====================

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get result by ID' })
  @ApiParam({ name: 'id', description: 'Result ID' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const result = await this.resultService.findOne(id);

    return req.user.role === Role.ADMIN
      ? result.toAdminJSON()
      : result.toTeacherJSON();
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
