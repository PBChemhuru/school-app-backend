// src/modules/academics/class/class.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SchoolClassEntity } from './entities/schoolclass.entity';
import { CreateSchoolclassDto } from './dto/create-schoolclass.dto';
import { UpdatesSchoolClassDto } from './dto/update-schoolclass.dto';
import { FilterSchoolClassDto } from './dto/filter-schoolclass.dto';
import { PromoteStudentsDto } from './dto/promote-student.dto';

// ==================== Types ====================

export interface SchoolClassStatistics {
  classId: string;
  name: string;
  gradeLevel: string;
  section: string | null;
  room: string | null;
  academicYear: string;
  classTeacher: string;
  totalStudents: number;
  maxCapacity: number | null;
  availableSpots: number | null;
  occupancyPercentage: number;
  genderDistribution: Record<string, number>;
  totalSubjects: number;
  totalTimetableEntries: number;
  totalAnnouncements: number;
  status: string;
}

export interface PromotionResult {
  promoted: number;
  skipped: number;
  errors: Array<{ studentId: string; error: string }>;
}

export interface BulkAssignResult {
  assigned: number;
  skipped: number;
  errors: string[];
}

// ==================== Shared Include Shape ====================

const classWithRelations = Prisma.validator<Prisma.SchoolClassDefaultArgs>()({
  include: {
    academicYear: true,
    classTeacher: {
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
    students: { select: { id: true } },
    curricula: { select: { id: true } },
    timetableEntries: { select: { id: true } },
    announcements: { select: { id: true } },
  },
});

type ClassWithRelations = Prisma.SchoolClassGetPayload<
  typeof classWithRelations
>;

// ==================== Service ====================

@Injectable()
export class SchoolClassService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateSchoolclassDto): Promise<SchoolClassEntity> {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: createDto.academicYearId },
    });
    if (!academicYear) throw new NotFoundException('Academic year not found');

    const existing = await this.prisma.schoolClass.findUnique({
      where: {
        name_academicYearId: {
          name: createDto.name,
          academicYearId: createDto.academicYearId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Class "${createDto.name}" already exists in this academic year`,
      );
    }

    if (createDto.classTeacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: createDto.classTeacherId },
      });
      if (!teacher) throw new NotFoundException('Class teacher not found');
      if (teacher.employmentStatus !== 'ACTIVE') {
        throw new BadRequestException('Cannot assign an inactive teacher');
      }
    }

    const schoolClass = await this.prisma.schoolClass.create({
      data: {
        name: createDto.name,
        gradeLevel: createDto.gradeLevel,
        section: createDto.section || null,
        room: createDto.room || null,
        maxCapacity: createDto.maxCapacity || null,
        academicYearId: createDto.academicYearId,
        classTeacherId: createDto.classTeacherId || null,
        archived: false,
      },
      include: this.defaultIncludes(),
    });

    return this.toEntity(schoolClass);
  }

  // ==================== READ ====================

  async findAll(): Promise<SchoolClassEntity[]> {
    const classes = await this.prisma.schoolClass.findMany({
      include: this.defaultIncludes(),
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { gradeLevel: 'asc' },
        { section: 'asc' },
      ],
    });
    return classes.map((c) => this.toEntity(c));
  }

  async findOne(id: string): Promise<SchoolClassEntity> {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        academicYear: true,
        classTeacher: {
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
        students: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                profilePhoto: true,
                gender: true,
              },
            },
          },
          orderBy: { user: { firstName: 'asc' } },
        },
        curricula: {
          include: {
            subject: true,
            teacher: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
            term: true,
          },
        },
        timetableEntries: {
          include: {
            curriculum: { include: { subject: true } },
            teacher: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!schoolClass) throw new NotFoundException('Class not found');
    return new SchoolClassEntity(schoolClass);
  }

  async findByAcademicYear(
    academicYearId: string,
  ): Promise<SchoolClassEntity[]> {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });
    if (!academicYear) throw new NotFoundException('Academic year not found');

    const classes = await this.prisma.schoolClass.findMany({
      where: { academicYearId, archived: false },
      include: this.defaultIncludes(),
      orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }],
    });
    return classes.map((c) => this.toEntity(c));
  }

  async findByTeacher(teacherId: string): Promise<SchoolClassEntity[]> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const classes = await this.prisma.schoolClass.findMany({
      where: {
        archived: false,
        OR: [
          { classTeacherId: teacherId },
          { curricula: { some: { teacherId } } },
        ],
      },
      include: this.defaultIncludes(),
      orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }],
      distinct: ['id'],
    });
    return classes.map((c) => this.toEntity(c));
  }

  async findActiveClasses(): Promise<SchoolClassEntity[]> {
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) return [];
    return this.findByAcademicYear(activeYear.id);
  }

  async getClassStatistics(id: string): Promise<SchoolClassStatistics> {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        academicYear: true,
        classTeacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        students: { include: { user: { select: { gender: true } } } },
        curricula: true,
        timetableEntries: true,
        announcements: true,
      },
    });

    if (!schoolClass) throw new NotFoundException('Class not found');

    const genderDistribution: Record<string, number> = {};
    schoolClass.students.forEach((student) => {
      const gender = student.user?.gender || 'Unknown';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    const totalStudents = schoolClass.students.length;
    const maxCapacity = schoolClass.maxCapacity;
    const availableSpots =
      maxCapacity !== null ? Math.max(0, maxCapacity - totalStudents) : null;
    const occupancyPercentage =
      maxCapacity && maxCapacity > 0
        ? Math.round((totalStudents / maxCapacity) * 10000) / 100
        : 0;

    // Compute status inline — no need to construct an entity
    const status = schoolClass.archived
      ? 'ARCHIVED'
      : maxCapacity && totalStudents >= maxCapacity
        ? 'FULL'
        : 'ACTIVE';

    return {
      classId: schoolClass.id,
      name: schoolClass.name,
      gradeLevel: schoolClass.gradeLevel,
      section: schoolClass.section,
      room: schoolClass.room,
      academicYear: schoolClass.academicYear.name,
      classTeacher: schoolClass.classTeacher
        ? `${schoolClass.classTeacher.user.firstName} ${schoolClass.classTeacher.user.lastName}`
        : 'Not Assigned',
      totalStudents,
      maxCapacity,
      availableSpots,
      occupancyPercentage,
      genderDistribution,
      totalSubjects: schoolClass.curricula.length,
      totalTimetableEntries: schoolClass.timetableEntries.length,
      totalAnnouncements: schoolClass.announcements.length,
      status,
    };
  }

  // ==================== UPDATE ====================

  async update(
    id: string,
    updateDto: UpdatesSchoolClassDto,
  ): Promise<SchoolClassEntity> {
    const existing = await this.prisma.schoolClass.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Class not found');

    if (updateDto.name && updateDto.name !== existing.name) {
      const duplicate = await this.prisma.schoolClass.findUnique({
        where: {
          name_academicYearId: {
            name: updateDto.name,
            academicYearId: existing.academicYearId,
          },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          `Class "${updateDto.name}" already exists in this academic year`,
        );
      }
    }

    if (updateDto.classTeacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateDto.classTeacherId },
      });
      if (!teacher) throw new NotFoundException('Class teacher not found');
      if (teacher.employmentStatus !== 'ACTIVE') {
        throw new BadRequestException('Cannot assign an inactive teacher');
      }
    }

    if (updateDto.maxCapacity !== undefined && updateDto.maxCapacity !== null) {
      const studentCount = await this.prisma.student.count({
        where: { currentClassId: id },
      });
      if (updateDto.maxCapacity < studentCount) {
        throw new BadRequestException(
          `Cannot set capacity to ${updateDto.maxCapacity} — ${studentCount} students currently enrolled`,
        );
      }
    }

    const data: Prisma.SchoolClassUpdateInput = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.gradeLevel !== undefined)
      data.gradeLevel = updateDto.gradeLevel;
    if (updateDto.section !== undefined) data.section = updateDto.section;
    if (updateDto.room !== undefined) data.room = updateDto.room;
    if (updateDto.maxCapacity !== undefined)
      data.maxCapacity = updateDto.maxCapacity;
    if (updateDto.archived !== undefined) data.archived = updateDto.archived;

    if (updateDto.classTeacherId !== undefined) {
      data.classTeacher = updateDto.classTeacherId
        ? { connect: { id: updateDto.classTeacherId } }
        : { disconnect: true };
    }

    const schoolClass = await this.prisma.schoolClass.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    return this.toEntity(schoolClass);
  }

  async archive(id: string): Promise<SchoolClassEntity> {
    const existing = await this.prisma.schoolClass.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Class not found');

    const schoolClass = await this.prisma.schoolClass.update({
      where: { id },
      data: { archived: true },
      include: this.defaultIncludes(),
    });
    return this.toEntity(schoolClass);
  }

  async unarchive(id: string): Promise<SchoolClassEntity> {
    const existing = await this.prisma.schoolClass.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Class not found');

    const schoolClass = await this.prisma.schoolClass.update({
      where: { id },
      data: { archived: false },
      include: this.defaultIncludes(),
    });
    return this.toEntity(schoolClass);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        students: { select: { id: true } },
        curricula: { select: { id: true } },
        timetableEntries: { select: { id: true } },
        announcements: { select: { id: true } },
      },
    });
    if (!schoolClass) throw new NotFoundException('Class not found');

    if (
      schoolClass.students.length > 0 ||
      schoolClass.curricula.length > 0 ||
      schoolClass.timetableEntries.length > 0 ||
      schoolClass.announcements.length > 0
    ) {
      throw new BadRequestException(
        'Cannot delete class with associated students, curricula, timetable, or announcements. Archive it instead.',
      );
    }

    await this.prisma.schoolClass.delete({ where: { id } });
  }

  // ==================== STUDENT MANAGEMENT ====================

  async assignStudent(
    classId: string,
    studentId: string,
  ): Promise<SchoolClassEntity> {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
    });
    if (!schoolClass) throw new NotFoundException('Class not found');
    if (schoolClass.archived) {
      throw new BadRequestException(
        'Cannot assign students to an archived class',
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.currentClassId === classId) {
      throw new ConflictException('Student is already in this class');
    }
    if (student.enrollmentStatus !== 'ACTIVE') {
      throw new BadRequestException('Cannot assign a non-active student');
    }

    if (schoolClass.maxCapacity) {
      const currentCount = await this.prisma.student.count({
        where: { currentClassId: classId },
      });
      if (currentCount >= schoolClass.maxCapacity) {
        throw new BadRequestException('Class is at maximum capacity');
      }
    }

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        currentClassId: classId,
        academicYearId: schoolClass.academicYearId,
      },
    });

    return this.findOne(classId);
  }

  async assignMultipleStudents(
    classId: string,
    studentIds: string[],
  ): Promise<BulkAssignResult> {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
    });
    if (!schoolClass) throw new NotFoundException('Class not found');
    if (schoolClass.archived) {
      throw new BadRequestException(
        'Cannot assign students to an archived class',
      );
    }

    if (schoolClass.maxCapacity) {
      const currentCount = await this.prisma.student.count({
        where: { currentClassId: classId },
      });
      if (currentCount + studentIds.length > schoolClass.maxCapacity) {
        throw new BadRequestException(
          `Cannot assign ${studentIds.length} students — would exceed capacity (current: ${currentCount}, max: ${schoolClass.maxCapacity})`,
        );
      }
    }

    const errors: string[] = [];
    let assigned = 0;
    let skipped = 0;

    for (const studentId of studentIds) {
      try {
        const student = await this.prisma.student.findUnique({
          where: { id: studentId },
        });
        if (!student) {
          errors.push(`Student ${studentId} not found`);
          skipped++;
          continue;
        }
        if (student.currentClassId === classId) {
          skipped++;
          continue;
        }
        if (student.enrollmentStatus !== 'ACTIVE') {
          errors.push(`Student ${studentId} is not active`);
          skipped++;
          continue;
        }

        await this.prisma.student.update({
          where: { id: studentId },
          data: {
            currentClassId: classId,
            academicYearId: schoolClass.academicYearId,
          },
        });
        assigned++;
      } catch (error) {
        errors.push(
          `Student ${studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        skipped++;
      }
    }

    return { assigned, skipped, errors };
  }

  async removeStudent(
    classId: string,
    studentId: string,
  ): Promise<SchoolClassEntity> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.currentClassId !== classId) {
      throw new BadRequestException('Student is not in this class');
    }

    await this.prisma.student.update({
      where: { id: studentId },
      data: { currentClassId: null },
    });

    return this.findOne(classId);
  }

  // ==================== PROMOTION ====================

  async promoteStudents(
    promoteDto: PromoteStudentsDto,
  ): Promise<PromotionResult> {
    const { sourceClassId, targetClassId, studentIds, newAcademicYearId } =
      promoteDto;

    // 1. Validate all three references exist
    const [sourceClass, targetClass, newAcademicYear] = await Promise.all([
      this.prisma.schoolClass.findUnique({ where: { id: sourceClassId } }),
      this.prisma.schoolClass.findUnique({ where: { id: targetClassId } }),
      this.prisma.academicYear.findUnique({ where: { id: newAcademicYearId } }),
    ]);

    if (!sourceClass) throw new NotFoundException('Source class not found');
    if (!targetClass) throw new NotFoundException('Target class not found');
    if (!newAcademicYear)
      throw new NotFoundException('New academic year not found');

    // 2. Get students to promote (all active in source, or specific IDs)
    const students = await this.prisma.student.findMany({
      where: {
        currentClassId: sourceClassId,
        enrollmentStatus: 'ACTIVE',
        ...(studentIds && studentIds.length > 0
          ? { id: { in: studentIds } }
          : {}),
      },
      select: { id: true },
    });

    // If specific IDs were requested, verify they all belong to the source class
    if (
      studentIds &&
      studentIds.length > 0 &&
      students.length !== studentIds.length
    ) {
      const foundIds = new Set(students.map((s) => s.id));
      const missing = studentIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Some students are not in the source class: ${missing.join(', ')}`,
      );
    }

    if (students.length === 0) {
      return { promoted: 0, skipped: 0, errors: [] };
    }

    // 3. Check target capacity
    if (targetClass.maxCapacity) {
      const currentCount = await this.prisma.student.count({
        where: { currentClassId: targetClassId },
      });

      if (currentCount + students.length > targetClass.maxCapacity) {
        throw new BadRequestException(
          `Cannot promote ${students.length} students — target class capacity exceeded (current: ${currentCount}, max: ${targetClass.maxCapacity})`,
        );
      }
    }

    // 4. Promote in one atomic operation
    const ids = students.map((s) => s.id);

    await this.prisma.student.updateMany({
      where: { id: { in: ids } },
      data: {
        currentClassId: targetClassId,
        academicYearId: newAcademicYearId,
      },
    });

    return { promoted: ids.length, skipped: 0, errors: [] };
  }

  // ==================== SEARCH / FILTER ====================

  async search(
    searchTerm: string,
    limit: number = 10,
  ): Promise<SchoolClassEntity[]> {
    const classes = await this.prisma.schoolClass.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { gradeLevel: { contains: searchTerm, mode: 'insensitive' } },
          { section: { contains: searchTerm, mode: 'insensitive' } },
          { room: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: this.defaultIncludes(),
      take: limit,
      orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }],
    });
    return classes.map((c) => this.toEntity(c));
  }

  async filter(filterDto: FilterSchoolClassDto): Promise<SchoolClassEntity[]> {
    const where: Prisma.SchoolClassWhereInput = {};

    if (filterDto.academicYearId)
      where.academicYearId = filterDto.academicYearId;
    if (filterDto.gradeLevel) where.gradeLevel = filterDto.gradeLevel;
    if (filterDto.classTeacherId)
      where.classTeacherId = filterDto.classTeacherId;
    if (filterDto.archived !== undefined) where.archived = filterDto.archived;

    if (filterDto.search) {
      where.OR = [
        { name: { contains: filterDto.search, mode: 'insensitive' } },
        { gradeLevel: { contains: filterDto.search, mode: 'insensitive' } },
        { room: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    const classes = await this.prisma.schoolClass.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }],
    });
    return classes.map((c) => this.toEntity(c));
  }

  // ==================== HELPERS ====================

  private toEntity(cls: ClassWithRelations): SchoolClassEntity {
    const entity = new SchoolClassEntity(cls);
    entity._count = {
      students: cls.students.length,
      curricula: cls.curricula.length,
      timetableEntries: cls.timetableEntries.length,
      announcements: cls.announcements.length,
    };
    return entity;
  }

  private defaultIncludes() {
    return classWithRelations.include;
  }
}
