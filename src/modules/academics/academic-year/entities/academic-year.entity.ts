// src/modules/academics/entities/academic-year.entity.ts

import { AcademicYear, Term } from '@prisma/client';

export class AcademicYearEntity implements AcademicYear {
  id!: string;
  name!: string;
  startDate!: Date;
  endDate!: Date;
  isActive!: boolean;
  createdAt!: Date;

  // Relations
  terms?: Term[];
  _count?: {
    terms: number;
    students: number;
    classes: number;
    curricula: number;
  };

  constructor(partial: Partial<AcademicYearEntity>) {
    Object.assign(this, partial);
  }

  // Helper methods
  getStatus(): string {
    const now = new Date();
    if (this.isActive) {
      return 'ACTIVE';
    }
    if (now < this.startDate) {
      return 'UPCOMING';
    }
    if (now > this.endDate) {
      return 'COMPLETED';
    }
    return 'ONGOING';
  }

  getDurationInDays(): number {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getTermCount(): number {
    return this.terms?.length || 0;
  }

  isCurrent(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  getDateRange(): string {
    return `${this.startDate.toLocaleDateString()} - ${this.endDate.toLocaleDateString()}`;
  }

  getFormattedDateRange(format: 'short' | 'long' = 'short'): string {
    const options: Intl.DateTimeFormatOptions =
      format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return `${this.startDate.toLocaleDateString('en-US', options)} - ${this.endDate.toLocaleDateString('en-US', options)}`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      isActive: this.isActive,
      status: this.getStatus(),
      dateRange: this.getDateRange(),
      termCount: this.getTermCount(),
      durationInDays: this.getDurationInDays(),
      createdAt: this.createdAt,
      terms: this.terms,
      _count: this._count,
    };
  }
}
