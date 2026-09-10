// src/modules/academics/curriculum/entities/curriculum.entity.ts

import {
  Curriculum,
  Subject,
  SchoolClass,
  Teacher,
  Term,
  AcademicYear,
  /*Timetable,*/
} from '@prisma/client';

export class CurriculumEntity implements Curriculum {
  id!: string;
  subjectId!: string;
  classId!: string;
  teacherId!: string;
  termId!: string;
  academicYearId!: string;
  learningObjectives!: string | null;
  notes!: string | null;

  // Relations
  subject?: Subject;
  schoolClass?: SchoolClass;
  teacher?: Teacher & {
    user?: { firstName: string; lastName: string; email: string };
  };
  term?: Term;
  academicYear?: AcademicYear;
  /* timetableEntries?: Timetable[];
  _count?: {
    timetableEntries: number;
  }; */

  constructor(partial: Partial<CurriculumEntity>) {
    Object.assign(this, partial);
  }

  // Helper methods
  getFullDisplay(): string {
    const subjectName = this.subject?.name || 'Unknown Subject';
    const className = this.schoolClass?.name || 'Unknown Class';
    const termName = this.term?.name || 'Unknown Term';
    return `${subjectName} - ${className} (${termName})`;
  }

  getTeacherName(): string {
    if (this.teacher && this.teacher.user) {
      return `${this.teacher.user.firstName} ${this.teacher.user.lastName}`;
    }
    return 'Not Assigned';
  }

  getSubjectCode(): string {
    return this.subject?.code || 'N/A';
  }

  getClassName(): string {
    return this.schoolClass?.name || 'N/A';
  }

  getTermName(): string {
    return this.term?.name || 'N/A';
  }

  getAcademicYearName(): string {
    return this.academicYear?.name || 'N/A';
  }

  getCreditHours(): number {
    return this.subject?.creditHours || 0;
  }

  /*hasTimetable(): boolean {
    return (this._count?.timetableEntries || 0) > 0;
  }

  getTimetableEntryCount(): number {
    return this._count?.timetableEntries || 0;
  }
*/
  isComplete(): boolean {
    return !!(
      this.subjectId &&
      this.classId &&
      this.teacherId &&
      this.termId &&
      this.academicYearId
    );
  }

  hasLearningObjectives(): boolean {
    return (
      !!this.learningObjectives && this.learningObjectives.trim().length > 0
    );
  }

  hasNotes(): boolean {
    return !!this.notes && this.notes.trim().length > 0;
  }

  toJSON() {
    return {
      id: this.id,
      subjectId: this.subjectId,
      classId: this.classId,
      teacherId: this.teacherId,
      termId: this.termId,
      academicYearId: this.academicYearId,
      learningObjectives: this.learningObjectives,
      notes: this.notes,
      fullDisplay: this.getFullDisplay(),
      teacherName: this.getTeacherName(),
      subjectCode: this.getSubjectCode(),
      className: this.getClassName(),
      termName: this.getTermName(),
      academicYearName: this.getAcademicYearName(),
      creditHours: this.getCreditHours(),
      /* hasTimetable: this.hasTimetable(), */
      /* timetableEntryCount: this.getTimetableEntryCount(), */
      isComplete: this.isComplete(),
      hasLearningObjectives: this.hasLearningObjectives(),
      hasNotes: this.hasNotes(),
      subject: this.subject,
      schoolClass: this.schoolClass,
      teacher: this.teacher,
      term: this.term,
      academicYear: this.academicYear,
      /* _count: this._count, */
    };
  }
}
