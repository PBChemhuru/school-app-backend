// src/modules/academics/term/entities/term.entity.ts

import { Term, AcademicYear } from '@prisma/client';

export class TermEntity implements Term {
  id!: string;
  name!: string;
  startDate!: Date;
  endDate!: Date;
  academicYearId!: string;

  // Relations
  academicYear?: AcademicYear;
  _count?: {
    curricula: number;
    results: number;
  };

  constructor(partial: Partial<TermEntity>) {
    Object.assign(this, partial);
  }

  // Helper methods
  getDurationInDays(): number {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getStatus(): 'UPCOMING' | 'ONGOING' | 'COMPLETED' {
    const now = new Date();
    if (now < this.startDate) return 'UPCOMING';
    if (now > this.endDate) return 'COMPLETED';
    return 'ONGOING';
  }

  getStatusLabel(): string {
    const labels = {
      UPCOMING: 'Upcoming',
      ONGOING: 'Ongoing',
      COMPLETED: 'Completed',
    };
    return labels[this.getStatus()];
  }

  getProgress(): number {
    const total = this.endDate.getTime() - this.startDate.getTime();
    const elapsed = new Date().getTime() - this.startDate.getTime();
    if (total <= 0) return 0;
    const progress = (elapsed / total) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }

  isWithinAcademicYear(): boolean {
    if (!this.academicYear) return true;
    const yearStart = this.academicYear.startDate;
    const yearEnd = this.academicYear.endDate;
    return this.startDate >= yearStart && this.endDate <= yearEnd;
  }

  getFormattedDateRange(format: 'short' | 'long' = 'short'): string {
    const options: Intl.DateTimeFormatOptions =
      format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return `${this.startDate.toLocaleDateString('en-US', options)} - ${this.endDate.toLocaleDateString('en-US', options)}`;
  }

  isActive(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  getWeeksRemaining(): number {
    const now = new Date();
    if (now > this.endDate) return 0;
    const diff = this.endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      academicYearId: this.academicYearId,
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      progress: this.getProgress(),
      durationInDays: this.getDurationInDays(),
      weeksRemaining: this.getWeeksRemaining(),
      dateRange: this.getFormattedDateRange(),
      isActive: this.isActive(),
      academicYear: this.academicYear,
      _count: this._count,
    };
  }
}
