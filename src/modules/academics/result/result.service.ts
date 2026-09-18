// src/modules/academics/result/result.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { EnterScoresDto } from './dto/enter-scores.dto';
import { PublishResultsDto } from './dto/publish-results.dto';
import { FilterResultDto } from './dto/filter-result.dto';
import { ResultEntity } from './entities/result.entity';

// ==================== Response Interfaces ====================

export interface EnterScoresResponse {
  saved: number;
  message: string;
}

export interface PublishResponse {
  published: number;
  unpublished: number;
  message: string;
}

export interface EntrySheetStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  score: number | null;
  grade: string | null;
  remarks: string | null;
  resultId: string | null;
  status: 'ENTERED' | 'NOT_ENTERED' | 'PUBLISHED';
}

export interface EntrySheetResponse {
  subject: { id: string; name: string; code: string };
  term: { id: string; name: string };
  class: { id: string; name: string };
  students: EntrySheetStudent[];
  summary: {
    total: number;
    entered: number;
    notEntered: number;
    published: number;
  };
}

export interface ReportCardSubject {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  score: number;
  percentage: number;
  grade: string;
  gradeLabel: string;
  remarks: string | null;
  teacherName: string;
  isPassing: boolean;
}

export interface ReportCard {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string | null;
  };
  term: {
    id: string;
    name: string;
    academicYear: string;
  };
  subjects: ReportCardSubject[];
  summary: {
    totalSubjects: number;
    totalScore: number;
    averageScore: number;
    averageGrade: string;
    position: number | null;
    totalStudentsInClass: number | null;
    passCount: number;
    failCount: number;
  };
  generatedAt: Date;
}

// ==================== Include Shape ====================

const resultWithRelations = Prisma.validator<Prisma.ResultDefaultArgs>()({
  include: {
    student: {
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    },
    subject: true,
    teacher: {
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    },
    term: true,
  },
});

type ResultWithRelations = Prisma.ResultGetPayload<typeof resultWithRelations>;

// ==================== Service ====================

@Injectable()
export class ResultService {
  constructor(private readonly prisma: PrismaService) {}
  async getEntrySheet(params: {
    subjectId: string;
    termId: string;
    classId: string;
    teacherId: string;
  }): Promise<EntrySheetResponse> {
    const { subjectId, termId, classId, teacherId } = params;

    // 1. Validate teacher actually teaches this subject in this class+term
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { subjectId, termId, classId, teacherId },
    });

    if (!curriculum) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject in this class for this term',
      );
    }

    // 2. Get subject, term, class metadata in parallel
    const [subject, term, schoolClass] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: subjectId } }),
      this.prisma.term.findUnique({ where: { id: termId } }),
      this.prisma.schoolClass.findUnique({ where: { id: classId } }),
    ]);

    if (!subject) throw new NotFoundException('Subject not found');
    if (!term) throw new NotFoundException('Term not found');
    if (!schoolClass) throw new NotFoundException('Class not found');

    // 3. Get all active students in the class
    const students = await this.prisma.student.findMany({
      where: {
        currentClassId: classId,
        enrollmentStatus: 'ACTIVE',
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { user: { firstName: 'asc' } },
    });

    // 4. Get existing results for this subject + term + these students
    const existingResults = await this.prisma.result.findMany({
      where: {
        subjectId,
        termId,
        studentId: { in: students.map((s) => s.id) },
      },
    });

    const resultMap = new Map(existingResults.map((r) => [r.studentId, r]));

    // 5. Build the sheet
    const sheet: EntrySheetStudent[] = students.map((student) => {
      const result = resultMap.get(student.id);
      let status: EntrySheetStudent['status'] = 'NOT_ENTERED';
      if (result) status = result.published ? 'PUBLISHED' : 'ENTERED';

      return {
        studentId: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        score: result?.score ?? null,
        grade: result?.grade ?? null,
        remarks: result?.remarks ?? null,
        resultId: result?.id ?? null,
        status,
      };
    });

    return {
      subject: { id: subject.id, name: subject.name, code: subject.code },
      term: { id: term.id, name: term.name },
      class: { id: schoolClass.id, name: schoolClass.name },
      students: sheet,
      summary: {
        total: sheet.length,
        entered: sheet.filter((s) => s.status === 'ENTERED').length,
        notEntered: sheet.filter((s) => s.status === 'NOT_ENTERED').length,
        published: sheet.filter((s) => s.status === 'PUBLISHED').length,
      },
    };
  }

  // ==================== ENTER SCORES (Teacher save) ====================

  /**
   * Teacher submits the entry sheet.
   * Uses upsert — allows re-submission and corrections.
   */
  async enterScores(
    dto: EnterScoresDto,
    teacherId: string,
  ): Promise<EnterScoresResponse> {
    const { subjectId, termId, classId, scores } = dto;

    // 1. Validate teacher teaches this subject in this class+term
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { subjectId, termId, classId, teacherId },
    });

    if (!curriculum) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject in this class for this term',
      );
    }

    // 2. Filter out students that already have published results — don't allow overwrite
    const existingPublished = await this.prisma.result.findMany({
      where: {
        subjectId,
        termId,
        studentId: { in: scores.map((s) => s.studentId) },
        published: true,
      },
      select: { studentId: true },
    });

    if (existingPublished.length > 0) {
      const publishedIds = existingPublished.map((r) => r.studentId).join(', ');
      throw new ConflictException(
        `Some results are already published and cannot be changed: ${publishedIds}`,
      );
    }

    // 3. Pre-load grading scales once (avoids N DB calls)
    const gradeScales = await this.prisma.gradingScale.findMany({
      orderBy: { minPercentage: 'desc' },
    });

    // 4. Prepare all upserts
    const operations = scores.map((item) => {
      const percentage = Math.round(item.score * 100) / 100;
      const grade = this.matchGrade(percentage, gradeScales);

      return this.prisma.result.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId: item.studentId,
            subjectId,
            termId,
          },
        },
        update: {
          score: item.score,
          percentage,
          grade,
          remarks: item.remarks ?? null,
          teacherId,
        },
        create: {
          studentId: item.studentId,
          subjectId,
          teacherId,
          termId,
          score: item.score,
          percentage,
          grade,
          remarks: item.remarks ?? null,
          published: false,
        },
      });
    });

    // 5. Execute all in one transaction (fast + atomic)
    const saved = await this.prisma.$transaction(operations);

    return {
      saved: saved.length,
      message: `${saved.length} score(s) saved successfully`,
    };
  }

  // ==================== ADMIN: CREATE / UPDATE / DELETE ====================

  async create(createDto: CreateResultDto): Promise<ResultEntity> {
    await this.validateReferences(createDto);

    // Check unique constraint (student + subject + term)
    const existing = await this.prisma.result.findUnique({
      where: {
        studentId_subjectId_termId: {
          studentId: createDto.studentId,
          subjectId: createDto.subjectId,
          termId: createDto.termId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Result already exists for this student, subject, and term',
      );
    }

    // Auto-calculate grade
    const gradeScales = await this.prisma.gradingScale.findMany({
      orderBy: { minPercentage: 'desc' },
    });
    const percentage = Math.round(createDto.score * 100) / 100;
    const grade = this.matchGrade(percentage, gradeScales);

    const result = await this.prisma.result.create({
      data: {
        studentId: createDto.studentId,
        subjectId: createDto.subjectId,
        teacherId: createDto.teacherId,
        termId: createDto.termId,
        score: createDto.score,
        percentage,
        grade,
        remarks: createDto.remarks || null,
        published: false,
      },
      include: this.defaultIncludes(),
    });

    return new ResultEntity(result);
  }

  async update(id: string, updateDto: UpdateResultDto): Promise<ResultEntity> {
    const existing = await this.prisma.result.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Result not found');

    if (existing.published) {
      throw new BadRequestException(
        'Cannot edit a published result. Unpublish first.',
      );
    }

    const data: Prisma.ResultUpdateInput = {};

    if (updateDto.score !== undefined) {
      const gradeScales = await this.prisma.gradingScale.findMany({
        orderBy: { minPercentage: 'desc' },
      });
      const percentage = Math.round(updateDto.score * 100) / 100;
      const grade = this.matchGrade(percentage, gradeScales);

      data.score = updateDto.score;
      data.percentage = percentage;
      data.grade = grade;
    }

    if (updateDto.remarks !== undefined) {
      data.remarks = updateDto.remarks;
    }

    const result = await this.prisma.result.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    return new ResultEntity(result);
  }

  async remove(id: string): Promise<void> {
    const result = await this.prisma.result.findUnique({ where: { id } });
    if (!result) throw new NotFoundException('Result not found');

    if (result.published) {
      throw new BadRequestException('Cannot delete a published result');
    }

    await this.prisma.result.delete({ where: { id } });
  }

  // ==================== PUBLISH / UNPUBLISH ====================

  async publishResults(dto: PublishResultsDto): Promise<PublishResponse> {
    const { termId, classId, subjectIds } = dto;

    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException('Term not found');

    const where: Prisma.ResultWhereInput = {
      termId,
      published: false,
    };

    if (classId) {
      where.student = { currentClassId: classId };
    }
    if (subjectIds && subjectIds.length > 0) {
      where.subjectId = { in: subjectIds };
    }

    const result = await this.prisma.result.updateMany({
      where,
      data: { published: true },
    });

    return {
      published: result.count,
      unpublished: 0,
      message: `${result.count} result(s) published successfully`,
    };
  }

  async unpublishResults(dto: PublishResultsDto): Promise<PublishResponse> {
    const { termId, classId, subjectIds } = dto;

    const where: Prisma.ResultWhereInput = {
      termId,
      published: true,
    };

    if (classId) {
      where.student = { currentClassId: classId };
    }
    if (subjectIds && subjectIds.length > 0) {
      where.subjectId = { in: subjectIds };
    }

    const result = await this.prisma.result.updateMany({
      where,
      data: { published: false },
    });

    return {
      published: 0,
      unpublished: result.count,
      message: `${result.count} result(s) unpublished`,
    };
  }

  // ==================== READ ====================

  async findAll(): Promise<ResultEntity[]> {
    const results = await this.prisma.result.findMany({
      include: this.defaultIncludes(),
      orderBy: [{ createdAt: 'desc' }],
    });
    return results.map((r) => new ResultEntity(r));
  }

  async findOne(id: string): Promise<ResultEntity> {
    const result = await this.prisma.result.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });
    if (!result) throw new NotFoundException('Result not found');
    return new ResultEntity(result);
  }

  async findByStudent(
    studentId: string,
    termId?: string,
  ): Promise<ResultEntity[]> {
    const where: Prisma.ResultWhereInput = { studentId, published: true };
    if (termId) where.termId = termId;

    const results = await this.prisma.result.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ term: { startDate: 'desc' } }, { subject: { name: 'asc' } }],
    });
    return results.map((r) => new ResultEntity(r));
  }

  async findByTeacher(
    teacherId: string,
    termId?: string,
  ): Promise<ResultEntity[]> {
    const where: Prisma.ResultWhereInput = { teacherId };
    if (termId) where.termId = termId;

    const results = await this.prisma.result.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [
        { term: { startDate: 'desc' } },
        { subject: { name: 'asc' } },
        { student: { user: { firstName: 'asc' } } },
      ],
    });
    return results.map((r) => new ResultEntity(r));
  }

  async filter(filterDto: FilterResultDto): Promise<ResultEntity[]> {
    const where: Prisma.ResultWhereInput = {};

    if (filterDto.studentId) where.studentId = filterDto.studentId;
    if (filterDto.subjectId) where.subjectId = filterDto.subjectId;
    if (filterDto.teacherId) where.teacherId = filterDto.teacherId;
    if (filterDto.termId) where.termId = filterDto.termId;
    if (filterDto.published !== undefined)
      where.published = filterDto.published;
    if (filterDto.grade) where.grade = filterDto.grade;
    if (filterDto.classId)
      where.student = { currentClassId: filterDto.classId };

    const results = await this.prisma.result.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ createdAt: 'desc' }],
    });
    return results.map((r) => new ResultEntity(r));
  }

  // ==================== REPORT CARDS ====================

  async generateReportCard(
    studentId: string,
    termId: string,
  ): Promise<ReportCard> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        currentClass: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });
    if (!term) throw new NotFoundException('Term not found');

    // Get only PUBLISHED results
    const results = await this.prisma.result.findMany({
      where: { studentId, termId, published: true },
      include: this.defaultIncludes(),
      orderBy: { subject: { name: 'asc' } },
    });

    const subjects: ReportCardSubject[] = results.map((r) => {
      const entity = new ResultEntity(r);
      return {
        subjectId: r.subjectId,
        subjectName: entity.getSubjectName(),
        subjectCode: entity.getSubjectCode(),
        score: r.score,
        percentage: entity.getEffectivePercentage(),
        grade: r.grade ?? 'N/A',
        gradeLabel: entity.getGradeLabel(),
        remarks: r.remarks,
        teacherName: entity.getTeacherName(),
        isPassing: entity.isPassing(),
      };
    });

    const totalSubjects = results.length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore =
      totalSubjects > 0
        ? Math.round((totalScore / totalSubjects) * 100) / 100
        : 0;
    const passCount = results.filter((r) => r.score >= 50).length;
    const failCount = totalSubjects - passCount;

    const gradeScales = await this.prisma.gradingScale.findMany({
      orderBy: { minPercentage: 'desc' },
    });
    const averageGrade = this.matchGrade(averageScore, gradeScales);

    // Position in class (by average score for this term)
    let position: number | null = null;
    let totalStudentsInClass: number | null = null;

    if (student.currentClassId) {
      totalStudentsInClass = await this.prisma.student.count({
        where: { currentClassId: student.currentClassId },
      });

      const classResults = await this.prisma.result.findMany({
        where: {
          termId,
          published: true,
          student: { currentClassId: student.currentClassId },
        },
        select: { studentId: true, score: true },
      });

      const averages = new Map<string, { total: number; count: number }>();
      for (const r of classResults) {
        const entry = averages.get(r.studentId) ?? { total: 0, count: 0 };
        entry.total += r.score;
        entry.count += 1;
        averages.set(r.studentId, entry);
      }

      const ranked = Array.from(averages.entries())
        .map(([sid, { total, count }]) => ({
          studentId: sid,
          average: count > 0 ? total / count : 0,
        }))
        .sort((a, b) => b.average - a.average);

      const idx = ranked.findIndex((r) => r.studentId === studentId);
      position = idx >= 0 ? idx + 1 : null;
    }

    return {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.currentClass?.name ?? null,
      },
      term: {
        id: term.id,
        name: term.name,
        academicYear: term.academicYear.name,
      },
      subjects,
      summary: {
        totalSubjects,
        totalScore,
        averageScore,
        averageGrade,
        position,
        totalStudentsInClass,
        passCount,
        failCount,
      },
      generatedAt: new Date(),
    };
  }

  // ==================== HELPERS ====================

  /**
   * Match a percentage against configured grading scales.
   * Falls back to a default scale if none are configured.
   */
  private matchGrade(
    percentage: number,
    scales: {
      letterGrade: string;
      minPercentage: number;
      maxPercentage: number;
    }[],
  ): string {
    if (scales.length > 0) {
      const match = scales.find(
        (s) => percentage >= s.minPercentage && percentage <= s.maxPercentage,
      );
      if (match) return match.letterGrade;
    }
    return this.defaultGrade(percentage);
  }

  private defaultGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  }

  private async validateReferences(dto: {
    studentId: string;
    subjectId: string;
    teacherId: string;
    termId: string;
  }): Promise<void> {
    const [student, subject, teacher, term] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: dto.studentId } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
      this.prisma.teacher.findUnique({ where: { id: dto.teacherId } }),
      this.prisma.term.findUnique({ where: { id: dto.termId } }),
    ]);

    if (!student) throw new NotFoundException('Student not found');
    if (!subject) throw new NotFoundException('Subject not found');
    if (!teacher) throw new NotFoundException('Teacher not found');
    if (!term) throw new NotFoundException('Term not found');
  }

  private defaultIncludes() {
    return resultWithRelations.include;
  }
}
