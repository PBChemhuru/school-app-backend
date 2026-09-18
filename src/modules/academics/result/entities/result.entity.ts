// src/modules/academics/result/entities/result.entity.ts

import { Result, Subject, Term, Student, Teacher } from '@prisma/client';

// ==================== Relation shapes ====================

type StudentWithUser = Student & {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type TeacherWithUser = Teacher & {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

// ==================== Entity ====================

export class ResultEntity implements Result {
  id!: string;
  studentId!: string;
  subjectId!: string;
  teacherId!: string;
  termId!: string;
  score!: number;
  percentage!: number | null;
  grade!: string | null;
  remarks!: string | null;
  published!: boolean;
  createdAt!: Date;

  // Relations
  student?: StudentWithUser;
  subject?: Subject;
  teacher?: TeacherWithUser;
  term?: Term;

  constructor(partial: Partial<ResultEntity>) {
    Object.assign(this, partial);
  }

  // ==================== Display helpers ====================

  getStudentName(): string {
    if (this.student?.user) {
      return `${this.student.user.firstName} ${this.student.user.lastName}`;
    }
    return 'Unknown Student';
  }

  getTeacherName(): string {
    if (this.teacher?.user) {
      return `${this.teacher.user.firstName} ${this.teacher.user.lastName}`;
    }
    return 'Unknown Teacher';
  }

  getSubjectName(): string {
    return this.subject?.name || 'Unknown Subject';
  }

  getSubjectCode(): string {
    return this.subject?.code || 'N/A';
  }

  getTermName(): string {
    return this.term?.name || 'Unknown Term';
  }

  // ==================== Score / grade helpers ====================

  /**
   * Effective percentage — falls back to score if percentage not stored.
   */
  getEffectivePercentage(): number {
    return this.percentage ?? this.score;
  }

  /**
   * Pass/Fail check — 50 is the default threshold.
   */
  isPassing(): boolean {
    return this.score >= 50;
  }

  getStatusLabel(): 'PASS' | 'FAIL' {
    return this.isPassing() ? 'PASS' : 'FAIL';
  }

  /**
   * Whether the result has been published to students/parents.
   */
  isPublished(): boolean {
    return this.published;
  }

  /**
   * Whether the result can be edited (unpublished).
   */
  isEditable(): boolean {
    return !this.published;
  }

  /**
   * Whether the result is ready to be published.
   * (Has a score — that's the only requirement in our flow.)
   */
  isReadyToPublish(): boolean {
    return this.score !== null && this.score !== undefined;
  }

  /**
   * Human-friendly grade label, e.g. "A (Excellent)".
   */
  getGradeLabel(): string {
    const labels: Record<string, string> = {
      A: 'Excellent',
      B: 'Very Good',
      C: 'Good',
      D: 'Satisfactory',
      E: 'Pass',
      F: 'Fail',
    };
    if (!this.grade) return 'Not Graded';
    return `${this.grade} (${labels[this.grade] ?? 'N/A'})`;
  }

  // ==================== Role-specific serialization ====================

  /**
   * Admin view — everything.
   */
  toAdminJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      subjectId: this.subjectId,
      teacherId: this.teacherId,
      termId: this.termId,
      score: this.score,
      percentage: this.percentage,
      grade: this.grade,
      gradeLabel: this.getGradeLabel(),
      remarks: this.remarks,
      published: this.published,
      createdAt: this.createdAt,

      // Computed
      effectivePercentage: this.getEffectivePercentage(),
      isPassing: this.isPassing(),
      statusLabel: this.getStatusLabel(),
      isEditable: this.isEditable(),

      // Relations
      student: this.student,
      subject: this.subject,
      teacher: this.teacher,
      term: this.term,
    };
  }

  /**
   * Teacher view — scoped for the entry sheet.
   */
  toTeacherJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      subjectId: this.subjectId,
      termId: this.termId,
      score: this.score,
      percentage: this.percentage,
      grade: this.grade,
      gradeLabel: this.getGradeLabel(),
      remarks: this.remarks,
      published: this.published,

      // Computed
      effectivePercentage: this.getEffectivePercentage(),
      isPassing: this.isPassing(),
      statusLabel: this.getStatusLabel(),
      isEditable: this.isEditable(),

      // Flattened names (used in the entry sheet UI)
      studentName: this.getStudentName(),
      subjectName: this.getSubjectName(),
      subjectCode: this.getSubjectCode(),
      termName: this.getTermName(),
    };
  }

  /**
   * Public view — what students/parents see (published results only).
   */
  toPublicJSON() {
    return {
      id: this.id,
      subjectName: this.getSubjectName(),
      subjectCode: this.getSubjectCode(),
      score: this.score,
      percentage: this.percentage,
      grade: this.grade,
      gradeLabel: this.getGradeLabel(),
      remarks: this.remarks,

      // Computed
      effectivePercentage: this.getEffectivePercentage(),
      isPassing: this.isPassing(),
      statusLabel: this.getStatusLabel(),

      // Teacher shown to parents/students
      teacherName: this.getTeacherName(),
      termName: this.getTermName(),
    };
  }

  /**
   * Summary view — used inside report cards and other nested responses.
   */
  toSummaryJSON() {
    return {
      subjectId: this.subjectId,
      subjectName: this.getSubjectName(),
      subjectCode: this.getSubjectCode(),
      score: this.score,
      percentage: this.getEffectivePercentage(),
      grade: this.grade,
      remarks: this.remarks,
      isPassing: this.isPassing(),
      teacherName: this.getTeacherName(),
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
