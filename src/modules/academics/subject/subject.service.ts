// src/modules/academics/subject/subject.service.ts

import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectEntity } from './entities/subject.entity';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateSubjectDto): Promise<SubjectEntity> {
    // Check if subject with this code already exists
    const existing = await this.prisma.subject.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Subject with code "${createDto.code}" already exists`,
      );
    }

    // Check if subject with this name already exists
    const existingName = await this.prisma.subject.findFirst({
      where: {
        name: {
          equals: createDto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingName) {
      throw new ConflictException(
        `Subject with name "${createDto.name}" already exists`,
      );
    }

    // Create subject
    const subject = await this.prisma.subject.create({
      data: {
        name: createDto.name,
        code: createDto.code.toUpperCase(), // Normalize code to uppercase
        creditHours: createDto.creditHours || null,
        description: createDto.description || null,
      },
    });

    return new SubjectEntity(subject);
  }

  // ==================== READ ====================

  async findAll(): Promise<SubjectEntity[]> {
    const subjects = await this.prisma.subject.findMany({
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
      orderBy: [{ code: 'asc' }],
    });

    return subjects.map((subject) => {
      const entity = new SubjectEntity(subject);
      entity._count = {
        curricula: subject.curricula?.length || 0,
        results: subject.results?.length || 0,
      };
      return entity;
    });
  }

  async findOne(id: string): Promise<SubjectEntity> {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        curricula: {
          include: {
            schoolClass: {
              include: {
                academicYear: true,
              },
            },
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
            term: true,
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
            term: true,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const entity = new SubjectEntity(subject);
    entity._count = {
      curricula: subject.curricula?.length || 0,
      results: subject.results?.length || 0,
    };

    return entity;
  }

  async findByCode(code: string): Promise<SubjectEntity> {
    const subject = await this.prisma.subject.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        curricula: {
          include: {
            schoolClass: true,
            term: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with code "${code}" not found`);
    }

    const entity = new SubjectEntity(subject);
    entity._count = {
      curricula: subject.curricula?.length || 0,
      results: 0,
    };

    return entity;
  }

  /*  async findByTeacher(teacherId: string): Promise<SubjectEntity[]> {
    const curricula = await this.prisma.curriculum.findMany({
      where: { teacherId },
      include: {
        subject: {
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
        },
      },
    });

    // Extract unique subjects from curricula
    const subjectMap = new Map();
    curricula.forEach((curriculum) => {
      if (curriculum.subject && !subjectMap.has(curriculum.subject.id)) {
        subjectMap.set(curriculum.subject.id, curriculum.subject);
      }
    });

    const subjects = Array.from(subjectMap.values());
    return subjects.map((subject) => {
      const entity = new SubjectEntity(subject);
      entity._count = {
        curricula: subject.curricula?.length || 0,
        results: subject.results?.length || 0,
      };
      return entity;
    });
  }
  
  async findByClass(
    classId: string,
    academicYearId?: string,
  ): Promise<SubjectEntity[]> {
    const where: any = {
      schoolClassId: classId,
    };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const curricula = await this.prisma.curriculum.findMany({
      where,
      include: {
        subject: {
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
        },
      },
    });

    // Extract unique subjects
    const subjectMap = new Map();
    curricula.forEach((curriculum) => {
      if (curriculum.subject && !subjectMap.has(curriculum.subject.id)) {
        subjectMap.set(curriculum.subject.id, curriculum.subject);
      }
    });

    const subjects = Array.from(subjectMap.values());
    return subjects.map((subject) => {
      const entity = new SubjectEntity(subject);
      entity._count = {
        curricula: subject.curricula?.length || 0,
        results: subject.results?.length || 0,
      };
      return entity;
    });
  } */

  async getSubjectStatistics(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        curricula: {
          include: {
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
            term: true,
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
            term: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Calculate statistics
    const totalClasses = subject.curricula.length;
    const totalStudents = new Set(subject.results.map((r) => r.studentId)).size;
    const totalResults = subject.results.length;

    // Calculate average score
    const scores = subject.results.map((r) => r.score);
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    subject.results.forEach((result) => {
      const grade = result.grade || 'N/A';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });

    return {
      subject: subject.name,
      code: subject.code,
      creditHours: subject.creditHours,
      description: subject.description,
      totalClasses,
      totalStudents,
      totalResults,
      averageScore: Math.round(averageScore * 100) / 100,
      gradeDistribution,
      teachers: subject.curricula
        .map((c) => c.teacher)
        .filter((t, i, arr) => arr.findIndex((t2) => t2?.id === t?.id) === i),
    };
  }
  // ==================== UPDATE ====================
  async update(
    id: string,
    updateDto: UpdateSubjectDto,
  ): Promise<SubjectEntity> {
    // Check if subject exists
    const existing = await this.prisma.subject.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Subject not found');
    }

    // Check code uniqueness if changing
    if (updateDto.code && updateDto.code !== existing.code) {
      const codeExists = await this.prisma.subject.findUnique({
        where: { code: updateDto.code.toUpperCase() },
      });

      if (codeExists) {
        throw new ConflictException(
          `Subject with code "${updateDto.code}" already exists`,
        );
      }
    }

    // Check name uniqueness if changing
    if (updateDto.name && updateDto.name !== existing.name) {
      const nameExists = await this.prisma.subject.findFirst({
        where: {
          name: {
            equals: updateDto.name,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (nameExists) {
        throw new ConflictException(
          `Subject with name "${updateDto.name}" already exists`,
        );
      }
    }

    // Prepare update data with proper typing
    const data: {
      name?: string;
      code?: string;
      creditHours?: number | null;
      description?: string | null;
    } = {};

    if (updateDto.name !== undefined) {
      data.name = updateDto.name;
    }

    if (updateDto.code !== undefined) {
      data.code = updateDto.code.toUpperCase();
    }

    if (updateDto.creditHours !== undefined) {
      data.creditHours = updateDto.creditHours;
    }

    if (updateDto.description !== undefined) {
      data.description = updateDto.description;
    }

    // Update subject
    const subject = await this.prisma.subject.update({
      where: { id },
      data,
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

    const entity = new SubjectEntity(subject);
    entity._count = {
      curricula: subject.curricula?.length || 0,
      results: subject.results?.length || 0,
    };

    return entity;
  }
  // ==================== DELETE ====================
  async remove(id: string): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
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

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Check if subject has associated data
    if (subject.curricula.length > 0 || subject.results.length > 0) {
      throw new BadRequestException(
        'Cannot delete subject with associated curriculum or results.',
      );
    }

    await this.prisma.subject.delete({
      where: { id },
    });
  }
  // ==================== SEARCH ====================
  async search(
    searchTerm: string,
    limit: number = 10,
  ): Promise<SubjectEntity[]> {
    const subjects = await this.prisma.subject.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { code: { contains: searchTerm.toUpperCase(), mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
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
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    return subjects.map((subject) => {
      const entity = new SubjectEntity(subject);
      entity._count = {
        curricula: subject.curricula?.length || 0,
        results: subject.results?.length || 0,
      };
      return entity;
    });
  }
  // ==================== FILTER ====================
  async getPopularSubjects(limit: number = 10): Promise<SubjectEntity[]> {
    const subjects = await this.prisma.subject.findMany({
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
      orderBy: {
        curricula: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return subjects.map((subject) => {
      const entity = new SubjectEntity(subject);
      entity._count = {
        curricula: subject.curricula?.length || 0,
        results: subject.results?.length || 0,
      };
      return entity;
    });
  }

  async getSubjectCountByDepartment(): Promise<Record<string, number>> {
    const subjects = await this.prisma.subject.findMany({
      select: {
        code: true,
      },
    });

    const departmentCount: Record<string, number> = {};
    subjects.forEach((subject) => {
      const dept = subject.code.split('-')[0] || 'General';
      departmentCount[dept] = (departmentCount[dept] || 0) + 1;
    });

    return departmentCount;
  }
}
