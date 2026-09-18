// src/modules/academics/term/term.service.ts

import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermEntity } from './entities/term.entity';

@Injectable()
export class TermService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateTermDto): Promise<TermEntity> {
    // Check if academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: createDto.academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // Validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if term is within academic year
    if (startDate < academicYear.startDate || endDate > academicYear.endDate) {
      throw new BadRequestException(
        `Term dates must be within the academic year range (${academicYear.startDate.toLocaleDateString()} - ${academicYear.endDate.toLocaleDateString()})`,
      );
    }

    // Check for overlapping terms
    const overlapping = await this.prisma.term.findFirst({
      where: {
        academicYearId: createDto.academicYearId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Term dates overlap with existing term "${overlapping.name}" in this academic year`,
      );
    }

    // Check for duplicate term number if provided
    if (createDto) {
      const duplicateNumber = await this.prisma.term.findFirst({
        where: {
          academicYearId: createDto.academicYearId,
          name: createDto.name,
        },
      });

      if (duplicateNumber) {
        throw new ConflictException(
          `Term "${createDto.name}" already exists in this academic year`,
        );
      }
    }

    // Create term
    const term = await this.prisma.term.create({
      data: {
        name: createDto.name,
        startDate,
        endDate,
        academicYearId: createDto.academicYearId,
        ...(createDto.name && { termNumber: createDto.name }),
      },
      include: {
        academicYear: true,
      },
    });

    return new TermEntity(term);
  }

  // ==================== READ ====================

  async findAll(): Promise<TermEntity[]> {
    const terms = await this.prisma.term.findMany({
      include: {
        academicYear: true,
        curricula: {
          select: {
            id: true,
          },
        },
        results: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ startDate: 'asc' }],
    });

    return terms.map((term) => {
      const entity = new TermEntity(term);
      entity._count = {
        curricula: term.curricula?.length || 0,
        results: term.results?.length || 0,
      };
      return entity;
    });
  }

  async findOne(id: string): Promise<TermEntity> {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
        curricula: {
          include: {
            subject: true,
            schoolClass: true,
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        results: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            subject: true,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const entity = new TermEntity(term);
    entity._count = {
      curricula: term.curricula?.length || 0,
      results: term.results?.length || 0,
    };

    return entity;
  }

  async findByAcademicYear(academicYearId: string): Promise<TermEntity[]> {
    // Check if academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const terms = await this.prisma.term.findMany({
      where: { academicYearId },
      include: {
        academicYear: true,
        curricula: {
          select: {
            id: true,
          },
        },
        results: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ startDate: 'asc' }],
    });

    return terms.map((term) => {
      const entity = new TermEntity(term);
      entity._count = {
        curricula: term.curricula?.length || 0,
        results: term.results?.length || 0,
      };
      return entity;
    });
  }

  async findCurrentTerm(): Promise<TermEntity | null> {
    const now = new Date();
    const term = await this.prisma.term.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        academicYear: true,
      },
    });

    if (!term) return null;
    return new TermEntity(term);
  }

  async findActiveTerm(): Promise<TermEntity | null> {
    // Get active academic year first
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) return null;

    const now = new Date();
    const term = await this.prisma.term.findFirst({
      where: {
        academicYearId: activeYear.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        academicYear: true,
      },
    });

    if (!term) return null;
    return new TermEntity(term);
  }

  // ==================== UPDATE ====================

  async update(id: string, updateDto: UpdateTermDto): Promise<TermEntity> {
    // Check if term exists
    const existing = await this.prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!existing) {
      throw new NotFoundException('Term not found');
    }

    // Validate dates if provided
    if (updateDto.startDate && updateDto.endDate) {
      const startDate = new Date(updateDto.startDate);
      const endDate = new Date(updateDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }

      // Check if within academic year
      if (
        startDate < existing.academicYear.startDate ||
        endDate > existing.academicYear.endDate
      ) {
        throw new BadRequestException(
          `Term dates must be within the academic year range (${existing.academicYear.startDate.toLocaleDateString()} - ${existing.academicYear.endDate.toLocaleDateString()})`,
        );
      }

      // Check for overlapping terms (excluding this one)
      const overlapping = await this.prisma.term.findFirst({
        where: {
          academicYearId: existing.academicYearId,
          id: { not: id },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      });

      if (overlapping) {
        throw new ConflictException(
          `Term dates overlap with existing term "${overlapping.name}" in this academic year`,
        );
      }
    }

    // Check for duplicate term number if provided
    if (updateDto.name) {
      const duplicateNumber = await this.prisma.term.findFirst({
        where: {
          academicYearId: existing.academicYearId,
          name: updateDto.name,
          id: { not: id },
        },
      });

      if (duplicateNumber) {
        throw new ConflictException(
          `Term "${updateDto.name}" already exists in this academic year`,
        );
      }
    }

    // Prepare update data with proper typing
    const data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (updateDto.name !== undefined) {
      data.name = updateDto.name;
    }

    if (updateDto.startDate !== undefined) {
      data.startDate = new Date(updateDto.startDate);
    }

    if (updateDto.endDate !== undefined) {
      data.endDate = new Date(updateDto.endDate);
    }

    // Update term
    const term = await this.prisma.term.update({
      where: { id },
      data,
      include: {
        academicYear: true,
      },
    });

    return new TermEntity(term);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: {
        curricula: {
          select: {
            id: true,
          },
        },
        results: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Check if term has associated data
    if (term.curricula.length > 0 || term.results.length > 0) {
      throw new BadRequestException(
        'Cannot delete term with associated curriculum or results. Archive it instead.',
      );
    }

    await this.prisma.term.delete({
      where: { id },
    });
  }

  // ==================== STATISTICS ====================

  async getStatistics(id: string) {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
        curricula: {
          include: {
            subject: true,
            schoolClass: true,
          },
        },
        results: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const totalSubjects = term.curricula.length;
    const totalResults = term.results.length;
    const uniqueStudents = new Set(term.results.map((r) => r.studentId)).size;

    // Calculate average scores by subject
    const subjectScores: Record<string, { scores: number[]; count: number }> =
      {};
    term.results.forEach((result) => {
      if (!subjectScores[result.subjectId]) {
        subjectScores[result.subjectId] = { scores: [], count: 0 };
      }
      subjectScores[result.subjectId].scores.push(result.score);
      subjectScores[result.subjectId].count++;
    });

    const subjectAverages = Object.entries(subjectScores).map(
      ([subjectId, data]) => {
        const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        const subject = term.curricula.find(
          (c) => c.subjectId === subjectId,
        )?.subject;
        return {
          subjectId,
          subjectName: subject?.name || 'Unknown',
          averageScore: avg,
          studentCount: data.count,
        };
      },
    );

    // Calculate overall average
    const scores = term.results.map((r) => r.score);
    const overallAverage =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    term.results.forEach((result) => {
      const grade = result.grade || 'N/A';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });

    return {
      term: term.name,
      academicYear: term.academicYear.name,
      dateRange: `${term.startDate.toLocaleDateString()} - ${term.endDate.toLocaleDateString()}`,
      status: new TermEntity(term).getStatus(),
      progress: new TermEntity(term).getProgress(),
      durationInDays: new TermEntity(term).getDurationInDays(),
      weeksRemaining: new TermEntity(term).getWeeksRemaining(),
      totalSubjects,
      totalResults,
      uniqueStudents,
      overallAverage: Math.round(overallAverage * 100) / 100,
      subjectAverages,
      gradeDistribution,
    };
  }

  // ==================== SEARCH ====================

  async search(searchTerm: string, limit: number = 10): Promise<TermEntity[]> {
    const terms = await this.prisma.term.findMany({
      where: {
        OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }],
      },
      include: {
        academicYear: true,
        curricula: {
          select: {
            id: true,
          },
        },
        results: {
          select: {
            id: true,
          },
        },
      },
      take: limit,
      orderBy: {
        startDate: 'desc',
      },
    });

    return terms.map((term) => {
      const entity = new TermEntity(term);
      entity._count = {
        curricula: term.curricula?.length || 0,
        results: term.results?.length || 0,
      };
      return entity;
    });
  }
}
