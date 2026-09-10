// src/modules/academics/subject/entities/subject.entity.ts

import { Subject } from '@prisma/client';

export class SubjectEntity implements Subject {
  id!: string;
  name!: string;
  code!: string;
  creditHours!: number | null;
  description!: string | null;
  createdAt!: Date;

  // Relations
  _count?: {
    curricula: number;
    results: number;
  };

  constructor(partial: Partial<SubjectEntity>) {
    Object.assign(this, partial);
  }

  // Helper methods
  getFullDisplay(): string {
    return `${this.code} - ${this.name}`;
  }

  getCreditLabel(): string {
    if (!this.creditHours) return 'No credits';
    return `${this.creditHours} credit${this.creditHours > 1 ? 's' : ''}`;
  }

  getShortCode(): string {
    return this.code.substring(0, 4).toUpperCase();
  }

  getDepartment(): string {
    // You can extract department from code or have a separate field
    const codeParts = this.code.split('-');
    return codeParts.length > 1 ? codeParts[0] : 'General';
  }

  getLevel(): number {
    // Extract level from code (e.g., MATH101 -> 1, MATH201 -> 2)
    const match = this.code.match(/\d/);
    return match ? parseInt(match[0]) : 0;
  }

  isActive(): boolean {
    // A subject is active if it's being taught this year
    // This would require checking if there are active curricula
    return this._count?.curricula ? this._count.curricula > 0 : false;
  }

  hasResults(): boolean {
    return this._count?.results ? this._count.results > 0 : false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      creditHours: this.creditHours,
      description: this.description,
      fullDisplay: this.getFullDisplay(),
      creditLabel: this.getCreditLabel(),
      shortCode: this.getShortCode(),
      department: this.getDepartment(),
      level: this.getLevel(),
      isActive: this.isActive(),
      hasResults: this.hasResults(),
      createdAt: this.createdAt,
      _count: this._count,
    };
  }
}
