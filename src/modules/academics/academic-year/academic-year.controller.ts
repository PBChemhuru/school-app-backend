// src/modules/academics/academic-year.controller.ts

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
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Academic Years')
@ApiBearerAuth()
@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  // ==================== GET ENDPOINTS ====================

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all academic years' })
  @ApiResponse({ status: 200, description: 'Returns all academic years' })
  findAll() {
    return this.academicYearService.findAll();
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get active academic year' })
  @ApiResponse({ status: 200, description: 'Returns active academic year' })
  @ApiResponse({ status: 404, description: 'No active academic year found' })
  async findActive() {
    const active = await this.academicYearService.findActive();
    if (!active) {
      throw new NotFoundException('No active academic year found');
    }
    return active;
  }

  @Get('current-upcoming')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Get current or upcoming academic years' })
  @ApiResponse({
    status: 200,
    description: 'Returns current/upcoming academic years',
  })
  getCurrentOrUpcoming() {
    return this.academicYearService.getCurrentOrUpcoming();
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Search academic years' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Returns matching academic years' })
  search(@Query('q') searchTerm: string, @Query('limit') limit?: string) {
    return this.academicYearService.search(
      searchTerm,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('year/:year')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get academic years by year number' })
  @ApiParam({ name: 'year', description: 'Year number (e.g., 2026)' })
  @ApiResponse({
    status: 200,
    description: 'Returns academic years for the year',
  })
  findByYear(@Param('year') year: number) {
    return this.academicYearService.findByYear(year);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get academic year by ID' })
  @ApiParam({ name: 'id', description: 'Academic Year ID' })
  @ApiResponse({ status: 200, description: 'Returns academic year details' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  findOne(@Param('id') id: string) {
    return this.academicYearService.findOne(id);
  }

  @Get(':id/statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get academic year statistics (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic Year ID' })
  @ApiResponse({ status: 200, description: 'Returns academic year statistics' })
  getStatistics(@Param('id') id: string) {
    return this.academicYearService.getStatistics(id);
  }

  // ==================== POST ENDPOINTS ====================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create academic year (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Academic year created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Academic year already exists' })
  create(@Body() createDto: CreateAcademicYearDto) {
    return this.academicYearService.create(createDto);
  }

  // ==================== PATCH ENDPOINTS ====================

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update academic year (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic Year ID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAcademicYearDto) {
    return this.academicYearService.update(id, updateDto);
  }

  // ==================== DELETE ENDPOINTS ====================

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete academic year (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic Year ID' })
  @ApiResponse({
    status: 204,
    description: 'Academic year deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete with associated data',
  })
  async remove(@Param('id') id: string) {
    await this.academicYearService.remove(id);
  }
}
