// src/modules/academics/attendance/entities/attendance.entity.ts

import { Attendance, Student } from '@prisma/client';

export class AttendanceEntity implements Attendance {
  id!: string;
  studentId!: string;
  date!: Date;
  present!: boolean;
  remarks!: string | null;

  // Relations
  student?: Student & {
    user?: { firstName: string; lastName: string; email: string };
  };

  constructor(partial: Partial<AttendanceEntity>) {
    Object.assign(this, partial);
  }

  // ==================== Helper methods ====================

  getStudentName(): string {
    if (this.student?.user) {
      return `${this.student.user.firstName} ${this.student.user.lastName}`;
    }
    return 'Unknown Student';
  }

  getStatus(): 'PRESENT' | 'ABSENT' {
    return this.present ? 'PRESENT' : 'ABSENT';
  }

  getStatusLabel(): string {
    return this.present ? 'Present' : 'Absent';
  }

  getFormattedDate(): string {
    return this.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getShortDate(): string {
    return this.date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  getDayOfWeek(): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[this.date.getDay()];
  }

  hasRemarks(): boolean {
    return !!this.remarks && this.remarks.trim().length > 0;
  }

  isToday(): boolean {
    const today = new Date();
    const d = this.date;
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }

  // ==================== Role views ====================

  toAdminJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      date: this.date,
      formattedDate: this.getFormattedDate(),
      present: this.present,
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      remarks: this.remarks,
      student: this.student,
    };
  }

  toTeacherJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      date: this.date,
      formattedDate: this.getFormattedDate(),
      present: this.present,
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      remarks: this.remarks,
      studentName: this.getStudentName(),
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      date: this.date,
      formattedDate: this.getFormattedDate(),
      present: this.present,
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      remarks: this.remarks,
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
