// src/modules/academics/schoolclass/entities/schoolclass.entity.ts

import {
  SchoolClass,
  AcademicYear,
  Teacher,
  Student,
  Curriculum,
  Timetable,
  Announcement,
} from '@prisma/client';

type TeacherWithUser = Teacher & {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
    profilePhoto?: string | null;
  };
};

type StudentWithId = Pick<Student, 'id'>;
type CurriculumWithId = Pick<Curriculum, 'id'>;
type TimetableWithId = Pick<Timetable, 'id'>;
type AnnouncementWithId = Pick<Announcement, 'id'>;

export interface SchoolClassCounts {
  students: number;
  curricula: number;
  timetableEntries: number;
  announcements: number;
}

export class SchoolClassEntity implements SchoolClass {
  id!: string;
  name!: string;
  gradeLevel!: string;
  section!: string | null;
  room!: string | null;
  maxCapacity!: number | null;
  academicYearId!: string;
  classTeacherId!: string | null;
  archived!: boolean;
  createdAt!: Date;

  academicYear?: AcademicYear;
  classTeacher?: TeacherWithUser | null;
  students?: StudentWithId[];
  curricula?: CurriculumWithId[];
  timetableEntries?: TimetableWithId[];
  announcements?: AnnouncementWithId[];

  _count?: SchoolClassCounts;

  constructor(partial: Partial<SchoolClassEntity>) {
    Object.assign(this, partial);
  }

  // ============ Display helpers ============
  getFullName(): string {
    if (this.section) return `${this.gradeLevel} ${this.section}`;
    return this.name || this.gradeLevel;
  }

  getDisplayName(): string {
    return this.section ? `${this.gradeLevel}${this.section}` : this.gradeLevel;
  }

  getGradeLevelNumber(): number {
    const match = this.gradeLevel.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // ============ Student / capacity ============
  getStudentCount(): number {
    if (this._count?.students !== undefined) return this._count.students;
    return this.students?.length || 0;
  }

  getAvailableSpots(): number | null {
    if (this.maxCapacity === null || this.maxCapacity === undefined)
      return null;
    return Math.max(0, this.maxCapacity - this.getStudentCount());
  }

  isFull(): boolean {
    if (this.maxCapacity === null || this.maxCapacity === undefined)
      return false;
    return this.getStudentCount() >= this.maxCapacity;
  }

  hasRoomFor(count: number = 1): boolean {
    if (this.maxCapacity === null || this.maxCapacity === undefined)
      return true;
    return this.getStudentCount() + count <= this.maxCapacity;
  }

  getOccupancyPercentage(): number {
    if (!this.maxCapacity || this.maxCapacity <= 0) return 0;
    const pct = (this.getStudentCount() / this.maxCapacity) * 100;
    return Math.round(pct * 100) / 100;
  }

  // ============ Status ============
  getStatus(): 'ACTIVE' | 'ARCHIVED' | 'FULL' {
    if (this.archived) return 'ARCHIVED';
    if (this.isFull()) return 'FULL';
    return 'ACTIVE';
  }

  getStatusLabel(): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Active',
      ARCHIVED: 'Archived',
      FULL: 'Full',
    };
    return labels[this.getStatus()] || this.getStatus();
  }

  isAvailableForEnrollment(): boolean {
    return !this.archived && !this.isFull();
  }

  // ============ Teacher ============
  getClassTeacherName(): string {
    if (this.classTeacher?.user) {
      return `${this.classTeacher.user.firstName} ${this.classTeacher.user.lastName}`;
    }
    return 'Not Assigned';
  }

  hasClassTeacher(): boolean {
    return !!this.classTeacherId;
  }

  getClassTeacherEmail(): string | null {
    return this.classTeacher?.user?.email || null;
  }

  // ============ Academic year ============
  getAcademicYearName(): string {
    return this.academicYear?.name || 'Unknown Year';
  }

  isInAcademicYear(academicYearId: string): boolean {
    return this.academicYearId === academicYearId;
  }

  isActiveAcademicYear(): boolean {
    return this.academicYear?.isActive === true;
  }

  // ============ Other ============
  hasRoom(): boolean {
    return !!this.room && this.room.trim().length > 0;
  }

  getSubjectCount(): number {
    if (this._count?.curricula !== undefined) return this._count.curricula;
    return this.curricula?.length || 0;
  }

  getTimetableEntryCount(): number {
    if (this._count?.timetableEntries !== undefined)
      return this._count.timetableEntries;
    return this.timetableEntries?.length || 0;
  }

  getAnnouncementCount(): number {
    if (this._count?.announcements !== undefined)
      return this._count.announcements;
    return this.announcements?.length || 0;
  }

  isArchived(): boolean {
    return this.archived;
  }

  hasStudents(): boolean {
    return this.getStudentCount() > 0;
  }

  // ============ Serialization ============
  toAdminJSON() {
    return {
      id: this.id,
      name: this.name,
      gradeLevel: this.gradeLevel,
      section: this.section,
      room: this.room,
      maxCapacity: this.maxCapacity,
      academicYearId: this.academicYearId,
      classTeacherId: this.classTeacherId,
      archived: this.archived,
      createdAt: this.createdAt,

      fullName: this.getFullName(),
      displayName: this.getDisplayName(),
      gradeLevelNumber: this.getGradeLevelNumber(),
      studentCount: this.getStudentCount(),
      availableSpots: this.getAvailableSpots(),
      isFull: this.isFull(),
      occupancyPercentage: this.getOccupancyPercentage(),
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      isAvailableForEnrollment: this.isAvailableForEnrollment(),
      classTeacherName: this.getClassTeacherName(),
      academicYearName: this.getAcademicYearName(),
      subjectCount: this.getSubjectCount(),
      timetableEntryCount: this.getTimetableEntryCount(),
      announcementCount: this.getAnnouncementCount(),

      academicYear: this.academicYear,
      classTeacher: this.classTeacher,
      students: this.students,
      curricula: this.curricula,
      timetableEntries: this.timetableEntries,
      announcements: this.announcements,
      _count: this._count,
    };
  }

  toTeacherJSON() {
    return {
      id: this.id,
      name: this.name,
      gradeLevel: this.gradeLevel,
      section: this.section,
      room: this.room,
      maxCapacity: this.maxCapacity,
      academicYearId: this.academicYearId,
      classTeacherId: this.classTeacherId,
      archived: this.archived,

      fullName: this.getFullName(),
      studentCount: this.getStudentCount(),
      availableSpots: this.getAvailableSpots(),
      isFull: this.isFull(),
      occupancyPercentage: this.getOccupancyPercentage(),
      status: this.getStatus(),
      classTeacherName: this.getClassTeacherName(),
      academicYearName: this.getAcademicYearName(),
      subjectCount: this.getSubjectCount(),
      timetableEntryCount: this.getTimetableEntryCount(),

      academicYear: this.academicYear,
      classTeacher: this.classTeacher,
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      gradeLevel: this.gradeLevel,
      section: this.section,
      room: this.room,
      fullName: this.getFullName(),
      classTeacherName: this.getClassTeacherName(),
      academicYearName: this.getAcademicYearName(),
      studentCount: this.getStudentCount(),
    };
  }

  toSummaryJSON() {
    return {
      id: this.id,
      name: this.name,
      gradeLevel: this.gradeLevel,
      section: this.section,
      room: this.room,
      fullName: this.getFullName(),
      studentCount: this.getStudentCount(),
      status: this.getStatus(),
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
