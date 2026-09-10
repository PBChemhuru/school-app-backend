// src/modules/academics/timetable/entities/timetable.entity.ts

import { Timetable, SchoolClass, Curriculum, Teacher } from '@prisma/client';

export class TimetableEntity implements Timetable {
  id!: string;
  classId!: string;
  curriculumId!: string;
  teacherId!: string;
  room!: string | null;
  dayOfWeek!: number;
  startTime!: Date;
  endTime!: Date;

  // Relations
  schoolClass?: SchoolClass;
  curriculum?: Curriculum & {
    subject?: { id: string; name: string; code: string };
  };
  teacher?: Teacher & {
    user?: { firstName: string; lastName: string; email: string };
  };

  constructor(partial: Partial<TimetableEntity>) {
    Object.assign(this, partial);
  }

  // ==================== Helper methods ====================

  getDayName(): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[this.dayOfWeek] || 'Unknown';
  }

  getDayShortName(): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[this.dayOfWeek] || 'Unknown';
  }

  getDurationInMinutes(): number {
    const diff = this.endTime.getTime() - this.startTime.getTime();
    return Math.round(diff / (1000 * 60));
  }

  getFormattedTimeRange(): string {
    const format = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };
    return `${format(this.startTime)} - ${format(this.endTime)}`;
  }

  getTeacherName(): string {
    if (this.teacher?.user) {
      return `${this.teacher.user.firstName} ${this.teacher.user.lastName}`;
    }
    return 'Not Assigned';
  }

  getSubjectName(): string {
    return this.curriculum?.subject?.name || 'Unknown Subject';
  }

  getSubjectCode(): string {
    return this.curriculum?.subject?.code || 'N/A';
  }

  getClassName(): string {
    return this.schoolClass?.name || 'N/A';
  }

  getRoomDisplay(): string {
    if (this.room) return this.room;
    return 'No Room Assigned';
  }

  isMorning(): boolean {
    return this.startTime.getHours() < 12;
  }

  isAfternoon(): boolean {
    return this.startTime.getHours() >= 12;
  }

  getTimeSlot(): string {
    const hour = this.startTime.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  // ==================== Role views ====================

  toAdminJSON() {
    return {
      id: this.id,
      classId: this.classId,
      curriculumId: this.curriculumId,
      teacherId: this.teacherId,
      room: this.room,
      dayOfWeek: this.dayOfWeek,
      dayName: this.getDayName(),
      dayShortName: this.getDayShortName(),
      startTime: this.startTime,
      endTime: this.endTime,
      timeRange: this.getFormattedTimeRange(),
      durationInMinutes: this.getDurationInMinutes(),
      timeSlot: this.getTimeSlot(),
      schoolClass: this.schoolClass,
      curriculum: this.curriculum,
      teacher: this.teacher,
    };
  }

  toTeacherJSON() {
    return {
      id: this.id,
      classId: this.classId,
      curriculumId: this.curriculumId,
      teacherId: this.teacherId,
      room: this.room,
      dayOfWeek: this.dayOfWeek,
      dayName: this.getDayName(),
      dayShortName: this.getDayShortName(),
      startTime: this.startTime,
      endTime: this.endTime,
      timeRange: this.getFormattedTimeRange(),
      durationInMinutes: this.getDurationInMinutes(),
      timeSlot: this.getTimeSlot(),
      className: this.getClassName(),
      subjectName: this.getSubjectName(),
      subjectCode: this.getSubjectCode(),
      schoolClass: this.schoolClass,
      curriculum: this.curriculum,
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      dayOfWeek: this.dayOfWeek,
      dayName: this.getDayName(),
      dayShortName: this.getDayShortName(),
      startTime: this.startTime,
      endTime: this.endTime,
      timeRange: this.getFormattedTimeRange(),
      durationInMinutes: this.getDurationInMinutes(),
      room: this.getRoomDisplay(),
      subjectName: this.getSubjectName(),
      subjectCode: this.getSubjectCode(),
      teacherName: this.getTeacherName(),
      className: this.getClassName(),
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
