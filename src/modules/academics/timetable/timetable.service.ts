// src/modules/academics/timetable/timetable.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { FilterTimetableDto } from './dto/filter-timetable.dto';
import { TimetableEntity } from './entities/timetable.entity';

interface ConflictCheck {
  teacherConflict?: string;
  roomConflict?: string;
  classConflict?: string;
}

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateTimetableDto): Promise<TimetableEntity> {
    // Validate references
    await this.validateReferences(createDto);

    // Parse times
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);

    // Validate time range
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(
      createDto.classId,
      createDto.teacherId,
      createDto.room,
      createDto.dayOfWeek,
      startTime,
      endTime,
    );

    if (conflicts.teacherConflict) {
      throw new ConflictException(
        `Teacher conflict: ${conflicts.teacherConflict}`,
      );
    }
    if (conflicts.roomConflict) {
      throw new ConflictException(`Room conflict: ${conflicts.roomConflict}`);
    }
    if (conflicts.classConflict) {
      throw new ConflictException(`Class conflict: ${conflicts.classConflict}`);
    }

    // Create timetable entry
    const timetable = await this.prisma.timetable.create({
      data: {
        classId: createDto.classId,
        curriculumId: createDto.curriculumId,
        teacherId: createDto.teacherId,
        room: createDto.room || null,
        dayOfWeek: createDto.dayOfWeek,
        startTime,
        endTime,
      },
      include: this.defaultIncludes(),
    });

    return new TimetableEntity(timetable);
  }

  // ==================== READ ====================

  async findAll(): Promise<TimetableEntity[]> {
    const timetables = await this.prisma.timetable.findMany({
      include: this.defaultIncludes(),
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return timetables.map((t) => new TimetableEntity(t));
  }

  async findOne(id: string): Promise<TimetableEntity> {
    const timetable = await this.prisma.timetable.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (!timetable) {
      throw new NotFoundException('Timetable entry not found');
    }

    return new TimetableEntity(timetable);
  }

  async findByClass(classId: string): Promise<TimetableEntity[]> {
    const timetables = await this.prisma.timetable.findMany({
      where: { classId },
      include: this.defaultIncludes(),
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return timetables.map((t) => new TimetableEntity(t));
  }

  async findByTeacher(teacherId: string): Promise<TimetableEntity[]> {
    const timetables = await this.prisma.timetable.findMany({
      where: { teacherId },
      include: this.defaultIncludes(),
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return timetables.map((t) => new TimetableEntity(t));
  }

  async findByCurriculum(curriculumId: string): Promise<TimetableEntity[]> {
    const timetables = await this.prisma.timetable.findMany({
      where: { curriculumId },
      include: this.defaultIncludes(),
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return timetables.map((t) => new TimetableEntity(t));
  }

  // Get weekly timetable grouped by day
  async getWeeklyTimetableForClass(classId: string) {
    const timetables = await this.findByClass(classId);

    const grouped: Record<string, TimetableEntity[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    timetables.forEach((t) => {
      const dayName = t.getDayName();
      if (grouped[dayName]) {
        grouped[dayName].push(t);
      }
    });

    return {
      classId,
      weeklySchedule: grouped,
      totalEntries: timetables.length,
    };
  }

  async getWeeklyTimetableForTeacher(teacherId: string) {
    const timetables = await this.findByTeacher(teacherId);

    const grouped: Record<string, TimetableEntity[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    timetables.forEach((t) => {
      const dayName = t.getDayName();
      if (grouped[dayName]) {
        grouped[dayName].push(t);
      }
    });

    return {
      teacherId,
      weeklySchedule: grouped,
      totalEntries: timetables.length,
    };
  }

  // ==================== UPDATE ====================

  async update(
    id: string,
    updateDto: UpdateTimetableDto,
  ): Promise<TimetableEntity> {
    const existing = await this.prisma.timetable.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Timetable entry not found');
    }

    // Determine final values
    const finalClassId = updateDto.classId ?? existing.classId;
    const finalTeacherId = updateDto.teacherId ?? existing.teacherId;
    const finalRoom =
      updateDto.room !== undefined ? updateDto.room : existing.room;
    const finalDayOfWeek = updateDto.dayOfWeek ?? existing.dayOfWeek;
    const finalStartTime = updateDto.startTime
      ? new Date(updateDto.startTime)
      : existing.startTime;
    const finalEndTime = updateDto.endTime
      ? new Date(updateDto.endTime)
      : existing.endTime;

    if (finalStartTime >= finalEndTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Validate references if changing
    if (updateDto.classId || updateDto.curriculumId || updateDto.teacherId) {
      await this.validateReferences({
        classId: finalClassId,
        curriculumId: updateDto.curriculumId ?? existing.curriculumId,
        teacherId: finalTeacherId,
        dayOfWeek: finalDayOfWeek,
        startTime: finalStartTime.toISOString(),
        endTime: finalEndTime.toISOString(),
      });
    }

    // Check conflicts (excluding this entry)
    const conflicts = await this.checkConflicts(
      finalClassId,
      finalTeacherId,
      finalRoom,
      finalDayOfWeek,
      finalStartTime,
      finalEndTime,
      id, // exclude this entry
    );

    if (conflicts.teacherConflict) {
      throw new ConflictException(
        `Teacher conflict: ${conflicts.teacherConflict}`,
      );
    }
    if (conflicts.roomConflict) {
      throw new ConflictException(`Room conflict: ${conflicts.roomConflict}`);
    }
    if (conflicts.classConflict) {
      throw new ConflictException(`Class conflict: ${conflicts.classConflict}`);
    }

    // Build typed update data
    const data: Prisma.TimetableUpdateInput = {};

    if (updateDto.classId !== undefined) {
      data.schoolClass = { connect: { id: updateDto.classId } };
    }
    if (updateDto.curriculumId !== undefined) {
      data.curriculum = { connect: { id: updateDto.curriculumId } };
    }
    if (updateDto.teacherId !== undefined) {
      data.teacher = { connect: { id: updateDto.teacherId } };
    }
    if (updateDto.room !== undefined) data.room = updateDto.room;
    if (updateDto.dayOfWeek !== undefined) data.dayOfWeek = updateDto.dayOfWeek;
    if (updateDto.startTime !== undefined) data.startTime = finalStartTime;
    if (updateDto.endTime !== undefined) data.endTime = finalEndTime;

    const timetable = await this.prisma.timetable.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    return new TimetableEntity(timetable);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const timetable = await this.prisma.timetable.findUnique({
      where: { id },
    });

    if (!timetable) {
      throw new NotFoundException('Timetable entry not found');
    }

    await this.prisma.timetable.delete({ where: { id } });
  }

  async removeByClass(classId: string): Promise<{ deletedCount: number }> {
    const result = await this.prisma.timetable.deleteMany({
      where: { classId },
    });

    return { deletedCount: result.count };
  }
  // ==================== CLONE / ROLLOVER ====================

  async cloneTimetableFromClass(
    sourceClassId: string,
    targetClassId: string,
  ): Promise<{ created: number; skipped: number }> {
    // Validate both classes exist
    const [sourceClass, targetClass] = await Promise.all([
      this.prisma.schoolClass.findUnique({ where: { id: sourceClassId } }),
      this.prisma.schoolClass.findUnique({ where: { id: targetClassId } }),
    ]);

    if (!sourceClass) throw new NotFoundException('Source class not found');
    if (!targetClass) throw new NotFoundException('Target class not found');

    const sourceEntries = await this.prisma.timetable.findMany({
      where: { classId: sourceClassId },
      include: { curriculum: true },
    });

    if (sourceEntries.length === 0) {
      throw new BadRequestException('Source class has no timetable entries');
    }

    let created = 0;
    let skipped = 0;

    for (const source of sourceEntries) {
      // Find equivalent curriculum in target class
      const targetCurriculum = await this.prisma.curriculum.findUnique({
        where: {
          subjectId_classId_termId: {
            subjectId: source.curriculum.subjectId,
            classId: targetClassId,
            termId: source.curriculum.termId,
          },
        },
      });

      if (!targetCurriculum) {
        skipped++;
        continue;
      }

      try {
        await this.create({
          classId: targetClassId,
          curriculumId: targetCurriculum.id,
          teacherId: source.teacherId,
          room: source.room ?? undefined,
          dayOfWeek: source.dayOfWeek,
          startTime: source.startTime.toISOString(),
          endTime: source.endTime.toISOString(),
        });
        created++;
      } catch {
        skipped++;
      }
    }

    return { created, skipped };
  }

  // ==================== CONFLICT DETECTION ====================

  private async checkConflicts(
    classId: string,
    teacherId: string,
    room: string | null | undefined,
    dayOfWeek: number,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<ConflictCheck> {
    const conflicts: ConflictCheck = {};

    // Base overlap condition: existing.start < new.end AND existing.end > new.start
    const overlapCondition = {
      dayOfWeek,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeId && { id: { not: excludeId } }),
    };

    // Teacher conflict
    const teacherConflict = await this.prisma.timetable.findFirst({
      where: {
        teacherId,
        ...overlapCondition,
      },
      include: {
        schoolClass: true,
        curriculum: { include: { subject: true } },
      },
    });

    if (teacherConflict) {
      conflicts.teacherConflict = `Teacher is already booked on ${teacherConflict.curriculum.subject.name} for ${teacherConflict.schoolClass.name} during this time`;
    }

    // Room conflict
    if (room) {
      const roomConflict = await this.prisma.timetable.findFirst({
        where: {
          room,
          ...overlapCondition,
        },
        include: {
          schoolClass: true,
          curriculum: { include: { subject: true } },
        },
      });

      if (roomConflict) {
        conflicts.roomConflict = `Room "${room}" is already booked for ${roomConflict.schoolClass.name} during this time`;
      }
    }

    // Class conflict
    const classConflict = await this.prisma.timetable.findFirst({
      where: {
        classId,
        ...overlapCondition,
      },
      include: {
        curriculum: { include: { subject: true } },
      },
    });

    if (classConflict) {
      conflicts.classConflict = `Class already has ${classConflict.curriculum.subject.name} scheduled during this time`;
    }

    return conflicts;
  }

  // Public method to check conflicts before creating
  async checkConflictsForDto(
    classId: string,
    teacherId: string,
    room: string | undefined,
    dayOfWeek: number,
    startTime: Date,
    endTime: Date,
  ): Promise<ConflictCheck> {
    return this.checkConflicts(
      classId,
      teacherId,
      room,
      dayOfWeek,
      startTime,
      endTime,
    );
  }

  // ==================== SEARCH / FILTER ====================

  async filter(filterDto: FilterTimetableDto): Promise<TimetableEntity[]> {
    const where: Prisma.TimetableWhereInput = {};

    if (filterDto.classId) where.classId = filterDto.classId;
    if (filterDto.teacherId) where.teacherId = filterDto.teacherId;
    if (filterDto.curriculumId) where.curriculumId = filterDto.curriculumId;
    if (filterDto.dayOfWeek !== undefined)
      where.dayOfWeek = filterDto.dayOfWeek;

    if (filterDto.academicYearId) {
      where.curriculum = {
        academicYearId: filterDto.academicYearId,
      };
    }

    const timetables = await this.prisma.timetable.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return timetables.map((t) => new TimetableEntity(t));
  }

  // ==================== STATISTICS ====================

  async getStatisticsForClass(classId: string) {
    const timetables = await this.prisma.timetable.findMany({
      where: { classId },
      include: {
        curriculum: { include: { subject: true } },
        teacher: { include: { user: true } },
      },
    });

    const subjectHours: Record<string, number> = {};
    const teacherHours: Record<string, number> = {};
    const dayDistribution: Record<string, number> = {};

    timetables.forEach((t) => {
      const duration =
        (t.endTime.getTime() - t.startTime.getTime()) / (1000 * 60 * 60);

      const subjectName = t.curriculum.subject.name;
      subjectHours[subjectName] = (subjectHours[subjectName] || 0) + duration;

      const teacherName = `${t.teacher.user.firstName} ${t.teacher.user.lastName}`;
      teacherHours[teacherName] = (teacherHours[teacherName] || 0) + duration;

      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const dayName = days[t.dayOfWeek];
      dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;
    });

    return {
      classId,
      totalPeriods: timetables.length,
      subjectHours,
      teacherHours,
      dayDistribution,
    };
  }

  // ==================== VALIDATION ====================

  private async validateReferences(dto: {
    classId: string;
    curriculumId: string;
    teacherId: string;
    dayOfWeek: number;
    startTime: string | Date;
    endTime: string | Date;
  }): Promise<void> {
    const [schoolClass, curriculum, teacher] = await Promise.all([
      this.prisma.schoolClass.findUnique({ where: { id: dto.classId } }),
      this.prisma.curriculum.findUnique({
        where: { id: dto.curriculumId },
        include: { subject: true },
      }),
      this.prisma.teacher.findUnique({ where: { id: dto.teacherId } }),
    ]);

    if (!schoolClass) throw new NotFoundException('Class not found');
    if (!curriculum) throw new NotFoundException('Curriculum not found');
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Curriculum must belong to the same class
    if (curriculum.classId !== dto.classId) {
      throw new BadRequestException(
        'Curriculum does not belong to the specified class',
      );
    }

    // Teacher must be the one assigned to the curriculum
    if (curriculum.teacherId !== dto.teacherId) {
      throw new BadRequestException(
        'Teacher is not assigned to this curriculum',
      );
    }

    // Teacher must be active
    if (teacher.employmentStatus !== 'ACTIVE') {
      throw new BadRequestException('Cannot schedule an inactive teacher');
    }
  }

  // ==================== INCLUDES HELPER ====================

  private defaultIncludes() {
    return {
      schoolClass: true,
      curriculum: {
        include: {
          subject: true,
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
    };
  }
}
