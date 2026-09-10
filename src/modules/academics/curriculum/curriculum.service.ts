// src/modules/academics/curriculum/curriculum.service.ts

import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { FilterCurriculumDto } from './dto/filter-curriculum.dto';
import { CurriculumEntity } from './entities/curriculum.entity';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCurriculumDto): Promise<CurriculumEntity> {
    await this.validateReferences(createDto);
    // Check if curriculum entry already exists (unique constraint: subjectId, classId, termId)
    const existing = await this.prisma.curriculum.findUnique({
      where: {
        subjectId_classId_termId: {
          subjectId: createDto.subjectId,
          classId: createDto.classId,
          termId: createDto.termId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'This subject is already assigned to this class for this term',
      );
    }
    // Create curriculum
    const curriculum = await this.prisma.curriculum.create({
      data: {
        subjectId: createDto.subjectId,
        classId: createDto.classId,
        teacherId: createDto.teacherId,
        termId: createDto.termId,
        academicYearId: createDto.academicYearId,
        learningObjectives: createDto.learningObjectives || null,
        notes: createDto.notes || null,
      },
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
      },
    });

    return new CurriculumEntity(curriculum);
  }

  // ==================== READ ====================

  async findAll(): Promise<CurriculumEntity[]> {
    const curricula = await this.prisma.curriculum.findMany({
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { schoolClass: { gradeLevel: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  async findOne(id: string): Promise<CurriculumEntity> {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id },
      include: {
        subject: true,
        schoolClass: {
          include: {
            students: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                profilePhoto: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
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
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum entry not found');
    }

    const entity = new CurriculumEntity(curriculum);
    /*entity._count = {
      timetableEntries: curriculum.timetableEntries?.length || 0,
    };*/

    return entity;
  }

  async findByClass(
    classId: string,
    academicYearId?: string,
  ): Promise<CurriculumEntity[]> {
    const where: {
      classId: string;
      academicYearId?: string;
    } = { classId };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }
    const curricula = await this.prisma.curriculum.findMany({
      where,
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ term: { startDate: 'asc' } }, { subject: { name: 'asc' } }],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  async findByTeacher(
    teacherId: string,
    academicYearId?: string,
  ): Promise<CurriculumEntity[]> {
    const where: {
      teacherId: string;
      academicYearId?: string;
    } = { teacherId };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const curricula = await this.prisma.curriculum.findMany({
      where,
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { schoolClass: { gradeLevel: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  async findBySubject(
    subjectId: string,
    academicYearId?: string,
  ): Promise<CurriculumEntity[]> {
    const where: {
      subjectId: string;
      academicYearId?: string;
    } = { subjectId };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const curricula = await this.prisma.curriculum.findMany({
      where,
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { schoolClass: { gradeLevel: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  async findByTerm(termId: string): Promise<CurriculumEntity[]> {
    const curricula = await this.prisma.curriculum.findMany({
      where: { termId },
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { schoolClass: { gradeLevel: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  async findByAcademicYear(
    academicYearId: string,
  ): Promise<CurriculumEntity[]> {
    const curricula = await this.prisma.curriculum.findMany({
      where: { academicYearId },
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { schoolClass: { gradeLevel: 'asc' } },
        { term: { startDate: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  async getCurriculumStatistics(id: string) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id },
      include: {
        subject: true,
        schoolClass: {
          include: {
            students: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: true,
      },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum entry not found');
    }

    return {
      curriculum: new CurriculumEntity(curriculum).getFullDisplay(),
      subject: curriculum.subject.name,
      subjectCode: curriculum.subject.code,
      class: curriculum.schoolClass.name,
      gradeLevel: curriculum.schoolClass.gradeLevel,
      section: curriculum.schoolClass.section,
      teacher: curriculum.teacher.user
        ? `${curriculum.teacher.user.firstName} ${curriculum.teacher.user.lastName}`
        : 'Not Assigned',
      term: curriculum.term.name,
      academicYear: curriculum.academicYear.name,
      totalStudents: curriculum.schoolClass.students.length,
      totalTimetableEntries: curriculum.timetableEntries.length,
      learningObjectives: curriculum.learningObjectives,
      notes: curriculum.notes,
      hasTimetable: curriculum.timetableEntries.length > 0,
    };
  }

  // ==================== UPDATE ====================

  async update(
    id: string,
    updateDto: UpdateCurriculumDto,
  ): Promise<CurriculumEntity> {
    // Check if curriculum exists
    const existing = await this.prisma.curriculum.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Curriculum entry not found');
    }

    // Check if teacher exists if provided
    if (updateDto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateDto.teacherId },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // Check if teacher is already assigned to another subject in same class/term
      const teacherConflict = await this.prisma.curriculum.findFirst({
        where: {
          teacherId: updateDto.teacherId,
          classId: existing.classId,
          termId: existing.termId,
          id: { not: id },
        },
      });

      if (teacherConflict) {
        throw new ConflictException(
          'This teacher is already assigned to another subject in this class for this term',
        );
      }
    }

    // Prepare update data
    const data: {
      teacherId?: string;
      learningObjectives?: string | null;
      notes?: string | null;
    } = {};

    if (updateDto.teacherId !== undefined) {
      data.teacherId = updateDto.teacherId;
    }

    if (updateDto.learningObjectives !== undefined) {
      data.learningObjectives = updateDto.learningObjectives;
    }

    if (updateDto.notes !== undefined) {
      data.notes = updateDto.notes;
    }

    // Update curriculum
    const curriculum = await this.prisma.curriculum.update({
      where: { id },
      data,
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
    });

    const entity = new CurriculumEntity(curriculum);
    /*entity._count = {
      timetableEntries: curriculum.timetableEntries?.length || 0,
    };*/

    return entity;
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id },
      include: {
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum entry not found');
    }

    // Check if curriculum has associated timetable entries
    if (curriculum.timetableEntries.length > 0) {
      throw new BadRequestException(
        'Cannot delete curriculum with associated timetable entries. Remove timetable entries first.',
      );
    }

    await this.prisma.curriculum.delete({
      where: { id },
    });
  }

  // ==================== SEARCH ====================

  async search(
    searchTerm: string,
    limit: number = 10,
  ): Promise<CurriculumEntity[]> {
    const curricula = await this.prisma.curriculum.findMany({
      where: {
        OR: [
          { subject: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { subject: { code: { contains: searchTerm, mode: 'insensitive' } } },
          {
            schoolClass: {
              name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            teacher: {
              user: {
                firstName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          },
          {
            teacher: {
              user: { lastName: { contains: searchTerm, mode: 'insensitive' } },
            },
          },
          { learningObjectives: { contains: searchTerm, mode: 'insensitive' } },
          { notes: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { schoolClass: { gradeLevel: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  // ==================== FILTER ====================

  async filter(filterDto: FilterCurriculumDto): Promise<CurriculumEntity[]> {
    const where: {
      subjectId?: string;
      classId?: string;
      teacherId?: string;
      termId?: string;
      academicYearId?: string;
      OR?: Array<{
        learningObjectives?: { contains: string; mode: 'insensitive' };
        notes?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (filterDto.subjectId) where.subjectId = filterDto.subjectId;
    if (filterDto.classId) where.classId = filterDto.classId;
    if (filterDto.teacherId) where.teacherId = filterDto.teacherId;
    if (filterDto.termId) where.termId = filterDto.termId;
    if (filterDto.academicYearId)
      where.academicYearId = filterDto.academicYearId;

    if (filterDto.search) {
      where.OR = [
        {
          learningObjectives: {
            contains: filterDto.search,
            mode: 'insensitive',
          },
        },
        { notes: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    const curricula = await this.prisma.curriculum.findMany({
      where,
      include: {
        subject: true,
        schoolClass: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        term: true,
        academicYear: true,
        timetableEntries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { schoolClass: { gradeLevel: 'asc' } },
        { term: { startDate: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return curricula.map((curr) => {
      const entity = new CurriculumEntity(curr);
      /*entity._count = {
        timetableEntries: curr.timetableEntries?.length || 0,
      };*/
      return entity;
    });
  }

  // ==================== BULK OPERATIONS ====================

  async cloneCurriculumFromTerm(
    sourceTermId: string,
    targetTermId: string,
  ): Promise<CurriculumEntity[]> {
    // Get source curriculum entries
    const sourceCurricula = await this.prisma.curriculum.findMany({
      where: { termId: sourceTermId },
      include: {
        term: true,
      },
    });

    if (sourceCurricula.length === 0) {
      throw new NotFoundException('No curriculum found in source term');
    }

    // Get target term
    const targetTerm = await this.prisma.term.findUnique({
      where: { id: targetTermId },
      include: {
        academicYear: true,
      },
    });

    if (!targetTerm) {
      throw new NotFoundException('Target term not found');
    }

    const clonedCurricula: CurriculumEntity[] = [];

    for (const source of sourceCurricula) {
      // Check if curriculum already exists in target term
      const existing = await this.prisma.curriculum.findUnique({
        where: {
          subjectId_classId_termId: {
            subjectId: source.subjectId,
            classId: source.classId,
            termId: targetTermId,
          },
        },
      });

      if (existing) {
        continue; // Skip if already exists
      }

      const curriculum = await this.prisma.curriculum.create({
        data: {
          subjectId: source.subjectId,
          classId: source.classId,
          teacherId: source.teacherId,
          termId: targetTermId,
          academicYearId: targetTerm.academicYearId,
          learningObjectives: source.learningObjectives,
          notes: source.notes,
        },
        include: {
          subject: true,
          schoolClass: true,
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          term: true,
          academicYear: true,
        },
      });

      clonedCurricula.push(new CurriculumEntity(curriculum));
    }

    return clonedCurricula;
  }

  // ==================== VALIDATION HELPERS ====================

  private async validateReferences(
    createDto: CreateCurriculumDto,
  ): Promise<void> {
    // Check subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: createDto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Check class exists
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: createDto.classId },
    });
    if (!schoolClass) {
      throw new NotFoundException('Class not found');
    }

    // Check teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createDto.teacherId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Check term exists
    const term = await this.prisma.term.findUnique({
      where: { id: createDto.termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Check academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: createDto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // Validate term belongs to academic year
    if (term.academicYearId !== createDto.academicYearId) {
      throw new BadRequestException(
        'Term does not belong to the specified academic year',
      );
    }

    // Validate class belongs to academic year
    if (schoolClass.academicYearId !== createDto.academicYearId) {
      throw new BadRequestException(
        'Class does not belong to the specified academic year',
      );
    }

    // Validate teacher is active
    if (teacher.employmentStatus !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot assign an inactive teacher to a curriculum',
      );
    }
  }
}
