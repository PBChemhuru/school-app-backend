// src/modules/academics/academic-year.service.ts

import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AcademicYearEntity } from './entities/academic-year.entity';

@Injectable()
export class AcademicYearService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateAcademicYearDto): Promise<AcademicYearEntity> {
    // Check if academic year with this name already exists
    const existing = await this.prisma.academicYear.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Academic year with name "${createDto.name}" already exists`,
      );
    }

    // Validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // If setting as active, deactivate all other academic years
    if (createDto.isActive) {
      await this.prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    // Create academic year
    const academicYear = await this.prisma.academicYear.create({
      data: {
        name: createDto.name,
        startDate,
        endDate,
        isActive: createDto.isActive || false,
        ...(createDto.termIds &&
          createDto.termIds.length > 0 && {
            terms: {
              connect: createDto.termIds.map((id) => ({ id })),
            },
          }),
      },
      include: {
        terms: true,
        students: true,
        classes: true,
        curricula: true,
      },
    });

    return new AcademicYearEntity(academicYear);
  }
  // ==================== READ ====================
  async findAll(): Promise<AcademicYearEntity[]> {
    const academicYears = await this.prisma.academicYear.findMany({
      include: {
        terms: true,
        students: {
          select: {
            id: true,
          },
        },
        classes: {
          select: {
            id: true,
          },
        },
        curricula: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return academicYears.map((year) => {
      const entity = new AcademicYearEntity(year);
      entity._count = {
        terms: year.terms?.length || 0,
        students: year.students?.length || 0,
        classes: year.classes?.length || 0,
        curricula: year.curricula?.length || 0,
      };
      return entity;
    });
  }

  async findActive(): Promise<AcademicYearEntity | null> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: {
        terms: true,
        classes: {
          include: {
            classTeacher: {
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
      },
    });

    if (!academicYear) {
      return null;
    }

    return new AcademicYearEntity(academicYear);
  }

  async findByYear(year: number): Promise<AcademicYearEntity[]> {
    const academicYears = await this.prisma.academicYear.findMany({
      where: {
        name: {
          contains: year.toString(),
        },
      },
      include: {
        terms: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return academicYears.map((year) => new AcademicYearEntity(year));
  }

  async getCurrentOrUpcoming(): Promise<AcademicYearEntity[]> {
    const now = new Date();

    const academicYears = await this.prisma.academicYear.findMany({
      where: {
        OR: [
          { startDate: { lte: now }, endDate: { gte: now } }, // Current
          { startDate: { gt: now } }, // Upcoming
        ],
        isActive: true,
      },
      include: {
        terms: true,
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 5,
    });

    return academicYears.map((year) => new AcademicYearEntity(year));
  }
  // ==================== UPDATE ====================

  // src/modules/academics/academic-year/academic-year.service.ts

  async update(
    id: string,
    updateDto: UpdateAcademicYearDto,
  ): Promise<AcademicYearEntity> {
    // Check if academic year exists
    const existing = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Academic year not found');
    }

    // Check name uniqueness if changing
    if (updateDto.name && updateDto.name !== existing.name) {
      const nameExists = await this.prisma.academicYear.findUnique({
        where: { name: updateDto.name },
      });

      if (nameExists) {
        throw new ConflictException(
          `Academic year with name "${updateDto.name}" already exists`,
        );
      }
    }

    // Validate dates if both are provided
    if (updateDto.startDate && updateDto.endDate) {
      const startDate = new Date(updateDto.startDate);
      const endDate = new Date(updateDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    // If setting as active, deactivate all other academic years
    if (updateDto.isActive) {
      await this.prisma.academicYear.updateMany({
        where: {
          isActive: true,
          NOT: { id },
        },
        data: { isActive: false },
      });
    }

    // Prepare update data with proper typing
    const data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
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

    if (updateDto.isActive !== undefined) {
      data.isActive = updateDto.isActive;
    }

    // Update academic year
    const academicYear = await this.prisma.academicYear.update({
      where: { id },
      data,
      include: {
        terms: true,
        students: true,
        classes: true,
        curricula: true,
      },
    });

    return new AcademicYearEntity(academicYear);
  }

  async setActive(id: string): Promise<AcademicYearEntity> {
    // Check if academic year exists
    const existing = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Academic year not found');
    }

    // Check if the academic year is within its date range
    const now = new Date();
    if (now < existing.startDate) {
      throw new BadRequestException(
        'Cannot activate an academic year that has not started yet',
      );
    }

    // Deactivate all academic years
    await this.prisma.academicYear.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate the selected one
    const academicYear = await this.prisma.academicYear.update({
      where: { id },
      data: { isActive: true },
      include: {
        terms: true,
        students: true,
        classes: true,
        curricula: true,
      },
    });

    return new AcademicYearEntity(academicYear);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: true,
        students: true,
        classes: true,
        curricula: true,
      },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // Check if it has associated data
    if (
      academicYear.terms.length > 0 ||
      academicYear.students.length > 0 ||
      academicYear.classes.length > 0 ||
      academicYear.curricula.length > 0
    ) {
      throw new BadRequestException(
        'Cannot delete academic year with associated data. Archive it instead.',
      );
    }

    await this.prisma.academicYear.delete({
      where: { id },
    });
  }
  // ==================== STATISTICS ====================

  async getStatistics(id: string) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: true,
        students: true,
        classes: {
          include: {
            students: true,
          },
        },
        curricula: true,
      },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const totalStudents = academicYear.students.length;
    const totalClasses = academicYear.classes.length;
    const totalSubjects = academicYear.curricula.length;
    const totalTerms = academicYear.terms.length;

    // Calculate students per class
    const studentsPerClass = academicYear.classes.map((cls) => ({
      className: cls.name,
      studentCount: cls.students.length,
    }));

    return {
      academicYear: academicYear.name,
      dateRange: `${academicYear.startDate.toLocaleDateString()} - ${academicYear.endDate.toLocaleDateString()}`,
      status: new AcademicYearEntity(academicYear).getStatus(),
      totalStudents,
      totalClasses,
      totalSubjects,
      totalTerms,
      studentsPerClass,
      isActive: academicYear.isActive,
    };
  }
  // ==================== SEARCH ====================
  async search(
    searchTerm: string,
    limit: number = 10,
  ): Promise<AcademicYearEntity[]> {
    const academicYears = await this.prisma.academicYear.findMany({
      where: {
        OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }],
      },
      include: {
        terms: true,
      },
      take: limit,
      orderBy: {
        startDate: 'desc',
      },
    });

    return academicYears.map((year) => new AcademicYearEntity(year));
  }

  async findOne(id: string): Promise<AcademicYearEntity> {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc',
          },
        },
        students: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            currentClass: true,
          },
        },
        classes: {
          include: {
            classTeacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            students: {
              select: {
                id: true,
              },
            },
          },
        },
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
            term: true,
          },
        },
      },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const entity = new AcademicYearEntity(academicYear);
    entity._count = {
      terms: academicYear.terms?.length || 0,
      students: academicYear.students?.length || 0,
      classes: academicYear.classes?.length || 0,
      curricula: academicYear.curricula?.length || 0,
    };

    return entity;
  }
}
