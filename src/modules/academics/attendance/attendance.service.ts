// src/modules/academics/attendance/attendance.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkMarkAttendanceDto } from 'src/modules/academics/attendance/dto/bulk-attendance.dto';
import { FilterAttendanceDto } from 'src/modules/academics/attendance/dto/filter-attendance.dto';
import { AttendanceEntity } from './entities/attendance.entity';

export interface AttendanceStatistics {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateAttendanceDto): Promise<AttendanceEntity> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: createDto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Normalize date to start of day (UTC) to avoid duplicate records
    const date = this.normalizeDate(new Date(createDto.date));

    // Check if attendance already exists for this student on this date
    const existing = await this.prisma.attendance.findFirst({
      where: {
        studentId: createDto.studentId,
        date,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Attendance already marked for this student on this date',
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        studentId: createDto.studentId,
        date,
        present: createDto.present,
        remarks: createDto.remarks || null,
      },
      include: this.defaultIncludes(),
    });

    return new AttendanceEntity(attendance);
  }

  // ==================== READ ====================

  async findAll(): Promise<AttendanceEntity[]> {
    const records = await this.prisma.attendance.findMany({
      include: this.defaultIncludes(),
      orderBy: [{ date: 'desc' }, { studentId: 'asc' }],
    });

    return records.map((r) => new AttendanceEntity(r));
  }

  async findOne(id: string): Promise<AttendanceEntity> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return new AttendanceEntity(attendance);
  }

  async findByStudent(studentId: string): Promise<AttendanceEntity[]> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const records = await this.prisma.attendance.findMany({
      where: { studentId },
      include: this.defaultIncludes(),
      orderBy: { date: 'desc' },
    });

    return records.map((r) => new AttendanceEntity(r));
  }

  async findByClassAndDate(
    classId: string,
    dateStr: string,
  ): Promise<AttendanceEntity[]> {
    const date = this.normalizeDate(new Date(dateStr));

    // Verify class exists
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
    });

    if (!schoolClass) {
      throw new NotFoundException('Class not found');
    }

    const records = await this.prisma.attendance.findMany({
      where: {
        date,
        student: {
          currentClassId: classId,
        },
      },
      include: this.defaultIncludes(),
      orderBy: {
        student: {
          user: {
            firstName: 'asc',
          },
        },
      },
    });

    return records.map((r) => new AttendanceEntity(r));
  }

  async findByDateRange(
    studentId: string,
    startDate: string,
    endDate: string,
  ): Promise<AttendanceEntity[]> {
    const start = this.normalizeDate(new Date(startDate));
    const end = this.normalizeDate(new Date(endDate));

    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const records = await this.prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: this.defaultIncludes(),
      orderBy: { date: 'asc' },
    });

    return records.map((r) => new AttendanceEntity(r));
  }

  // ==================== UPDATE ====================

  async update(
    id: string,
    updateDto: UpdateAttendanceDto,
  ): Promise<AttendanceEntity> {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found');
    }

    const data: Prisma.AttendanceUpdateInput = {};

    if (updateDto.present !== undefined) {
      data.present = updateDto.present;
    }
    if (updateDto.remarks !== undefined) {
      data.remarks = updateDto.remarks;
    }

    const attendance = await this.prisma.attendance.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    return new AttendanceEntity(attendance);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.prisma.attendance.delete({ where: { id } });
  }

  // ==================== BULK OPERATIONS ====================

  async bulkMark(bulkDto: BulkMarkAttendanceDto): Promise<{
    success: AttendanceEntity[];
    failed: Array<{ studentId: string; error: string }>;
  }> {
    const date = this.normalizeDate(new Date(bulkDto.date));
    const success: AttendanceEntity[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    // Validate all students exist
    const studentIds = bulkDto.records.map((r) => r.studentId);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    });
    const validStudentIds = new Set(students.map((s) => s.id));

    // Get already-marked records to skip
    const existing = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date,
      },
      select: { studentId: true },
    });
    const alreadyMarked = new Set(existing.map((e) => e.studentId));

    for (const record of bulkDto.records) {
      if (!validStudentIds.has(record.studentId)) {
        failed.push({
          studentId: record.studentId,
          error: 'Student not found',
        });
        continue;
      }

      if (alreadyMarked.has(record.studentId)) {
        failed.push({
          studentId: record.studentId,
          error: 'Attendance already marked for this date',
        });
        continue;
      }

      try {
        const created = await this.prisma.attendance.create({
          data: {
            studentId: record.studentId,
            date,
            present: record.present,
            remarks: record.remarks || null,
          },
          include: this.defaultIncludes(),
        });
        success.push(new AttendanceEntity(created));
      } catch (error) {
        failed.push({
          studentId: record.studentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed };
  }

  // ==================== STATISTICS ====================

  async getStudentStatistics(
    studentId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AttendanceStatistics> {
    const where: Prisma.AttendanceWhereInput = { studentId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = this.normalizeDate(new Date(startDate));
      if (endDate) where.date.lte = this.normalizeDate(new Date(endDate));
    }

    const records = await this.prisma.attendance.findMany({
      where,
      select: { present: true },
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.present).length;
    const absentDays = totalDays - presentDays;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }

  async getClassStatistics(classId: string, dateStr: string) {
    const date = this.normalizeDate(new Date(dateStr));

    // Get all students in class
    const students = await this.prisma.student.findMany({
      where: { currentClassId: classId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Get attendance for this date
    const attendance = await this.prisma.attendance.findMany({
      where: {
        date,
        student: { currentClassId: classId },
      },
    });

    const attendanceMap = new Map(attendance.map((a) => [a.studentId, a]));

    const presentCount = attendance.filter((a) => a.present).length;
    const absentCount = attendance.filter((a) => !a.present).length;
    const notMarkedCount = students.length - attendance.length;

    const studentBreakdown = students.map((s) => {
      const record = attendanceMap.get(s.id);
      return {
        studentId: s.id,
        studentName: `${s.user.firstName} ${s.user.lastName}`,
        status: record ? (record.present ? 'PRESENT' : 'ABSENT') : 'NOT_MARKED',
        remarks: record?.remarks || null,
      };
    });

    return {
      classId,
      date: date.toISOString().split('T')[0],
      totalStudents: students.length,
      presentCount,
      absentCount,
      notMarkedCount,
      attendanceRate:
        students.length > 0
          ? Math.round((presentCount / students.length) * 10000) / 100
          : 0,
      studentBreakdown,
    };
  }

  async getClassAttendanceTrend(
    classId: string,
    startDate: string,
    endDate: string,
  ) {
    const start = this.normalizeDate(new Date(startDate));
    const end = this.normalizeDate(new Date(endDate));

    const students = await this.prisma.student.findMany({
      where: { currentClassId: classId },
      select: { id: true },
    });

    const records = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const byDate: Record<
      string,
      { present: number; absent: number; total: number }
    > = {};

    records.forEach((r) => {
      const key = r.date.toISOString().split('T')[0];
      if (!byDate[key]) {
        byDate[key] = { present: 0, absent: 0, total: 0 };
      }
      byDate[key].total++;
      if (r.present) byDate[key].present++;
      else byDate[key].absent++;
    });

    const trend = Object.entries(byDate).map(([date, data]) => ({
      date,
      ...data,
      attendanceRate:
        data.total > 0
          ? Math.round((data.present / data.total) * 10000) / 100
          : 0,
    }));

    return { classId, startDate: startDate, endDate: endDate, trend };
  }

  async getStudentAttendanceReport(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        currentClass: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const stats = await this.getStudentStatistics(studentId);

    // Get recent records
    const recentRecords = await this.prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    // Get monthly breakdown
    const monthlyBreakdown: Record<
      string,
      { present: number; absent: number; total: number }
    > = {};

    const allRecords = await this.prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'asc' },
    });

    allRecords.forEach((r) => {
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyBreakdown[key]) {
        monthlyBreakdown[key] = { present: 0, absent: 0, total: 0 };
      }
      monthlyBreakdown[key].total++;
      if (r.present) monthlyBreakdown[key].present++;
      else monthlyBreakdown[key].absent++;
    });

    return {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        class: student.currentClass?.name || 'N/A',
      },
      statistics: stats,
      recentRecords: recentRecords.map((r) =>
        new AttendanceEntity(r).toPublicJSON(),
      ),
      monthlyBreakdown,
    };
  }

  // ==================== FILTER / SEARCH ====================

  async filter(filterDto: FilterAttendanceDto): Promise<AttendanceEntity[]> {
    const where: Prisma.AttendanceWhereInput = {};

    if (filterDto.studentId) {
      where.studentId = filterDto.studentId;
    }

    if (filterDto.classId) {
      where.student = {
        currentClassId: filterDto.classId,
      };
    }

    if (filterDto.startDate || filterDto.endDate) {
      where.date = {};
      if (filterDto.startDate) {
        where.date.gte = this.normalizeDate(new Date(filterDto.startDate));
      }
      if (filterDto.endDate) {
        where.date.lte = this.normalizeDate(new Date(filterDto.endDate));
      }
    }

    if (filterDto.present !== undefined) {
      where.present = filterDto.present;
    }

    if (filterDto.search) {
      where.remarks = {
        contains: filterDto.search,
        mode: 'insensitive',
      };
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ date: 'desc' }, { studentId: 'asc' }],
    });

    return records.map((r) => new AttendanceEntity(r));
  }

  // ==================== ACCESS CONTROL HELPERS ====================

  async verifyTeacherCanAccessStudent(
    teacherId: string,
    studentId: string,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Get student's class
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { currentClassId: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.currentClassId) {
      throw new BadRequestException('Student is not assigned to a class');
    }

    // Teacher can access if:
    // 1. They are the class teacher, OR
    // 2. They teach at least one subject in the student's class
    const hasAccess = await this.prisma.schoolClass.findFirst({
      where: {
        id: student.currentClassId,
        OR: [
          { classTeacherId: teacherId },
          { curricula: { some: { teacherId } } },
        ],
      },
    });

    if (!hasAccess) {
      throw new BadRequestException(
        "You do not have permission to access this student's attendance",
      );
    }
  }

  // ==================== HELPERS ====================

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private defaultIncludes() {
    return {
      student: {
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
