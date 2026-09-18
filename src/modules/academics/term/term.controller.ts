// src/modules/academics/term/term.controller.ts

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
import { TermService } from './term.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Terms')
@ApiBearerAuth()
@Controller('terms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TermController {
  constructor(private readonly termService: TermService) {}

  // ==================== GET ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all terms' })
  @ApiResponse({ status: 200, description: 'Returns all terms' })
  findAll() {
    return this.termService.findAll();
  }

  @Get('current')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get current term' })
  @ApiResponse({ status: 200, description: 'Returns current term' })
  @ApiResponse({ status: 404, description: 'No current term found' })
  async findCurrent() {
    const term = await this.termService.findCurrentTerm();
    if (!term) {
      throw new NotFoundException('No current term found');
    }
    return term;
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get active term (in active academic year)' })
  @ApiResponse({ status: 200, description: 'Returns active term' })
  @ApiResponse({ status: 404, description: 'No active term found' })
  async findActive() {
    const term = await this.termService.findActiveTerm();
    if (!term) {
      throw new NotFoundException('No active term found');
    }
    return term;
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Search terms' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Returns matching terms' })
  search(@Query('q') searchTerm: string, @Query('limit') limit?: string) {
    return this.termService.search(searchTerm, limit ? parseInt(limit) : 10);
  }

  @Get('academic-year/:academicYearId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get terms by academic year' })
  @ApiParam({ name: 'academicYearId', description: 'Academic Year ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns terms for the academic year',
  })
  findByAcademicYear(@Param('academicYearId') academicYearId: string) {
    return this.termService.findByAcademicYear(academicYearId);
  }
  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get term by ID' })
  @ApiParam({ name: 'id', description: 'Term ID' })
  @ApiResponse({ status: 200, description: 'Returns term details' })
  @ApiResponse({ status: 404, description: 'Term not found' })
  findOne(@Param('id') id: string) {
    return this.termService.findOne(id);
  }

  @Get(':id/statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get term statistics (Admin only)' })
  @ApiParam({ name: 'id', description: 'Term ID' })
  @ApiResponse({ status: 200, description: 'Returns term statistics' })
  getStatistics(@Param('id') id: string) {
    return this.termService.getStatistics(id);
  }

  // ==================== POST ENDPOINTS ====================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create term (Admin only)' })
  @ApiResponse({ status: 201, description: 'Term created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Term overlaps with existing term' })
  create(@Body() createDto: CreateTermDto) {
    return this.termService.create(createDto);
  }
  // ==================== PATCH ENDPOINTS ====================

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update term (Admin only)' })
  @ApiParam({ name: 'id', description: 'Term ID' })
  @ApiResponse({ status: 200, description: 'Term updated successfully' })
  @ApiResponse({ status: 404, description: 'Term not found' })
  @ApiResponse({ status: 409, description: 'Term overlaps with existing term' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTermDto) {
    return this.termService.update(id, updateDto);
  }

  // ==================== DELETE ENDPOINTS ====================

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete term (Admin only)' })
  @ApiParam({ name: 'id', description: 'Term ID' })
  @ApiResponse({ status: 204, description: 'Term deleted successfully' })
  @ApiResponse({ status: 404, description: 'Term not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete with associated data',
  })
  async remove(@Param('id') id: string) {
    await this.termService.remove(id);
  }
}
