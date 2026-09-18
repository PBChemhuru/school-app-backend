// src/modules/academics/activity/activity/entities/activity.entity.ts

import {
  Activity,
  ActivityCategory,
  ActivityMembership,
  Teacher,
} from '@prisma/client';

// ==================== Relation shapes ====================

type TeacherWithUser = Teacher & {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

/** Lightweight membership shape when only IDs are selected */
type MembershipWithId = Pick<ActivityMembership, 'id'>;

// ==================== Entity ====================

export class ActivityEntity implements Activity {
  id!: string;
  name!: string;
  description!: string | null;
  category!: ActivityCategory;
  schedule!: string | null;
  maxMembers!: number | null;
  coordinatorId!: string | null;
  createdAt!: Date;

  // Relations
  coordinator?: TeacherWithUser | null;
  memberships?: MembershipWithId[];

  _count?: {
    memberships: number;
  };

  constructor(partial: Partial<ActivityEntity>) {
    Object.assign(this, partial);
  }

  // ==================== Display helpers ====================

  getCategoryLabel(): string {
    const labels: Record<ActivityCategory, string> = {
      SPORTS: 'Sports',
      CLUB: 'Club',
      CULTURAL: 'Cultural',
      OTHER: 'Other',
    };
    return labels[this.category] ?? this.category;
  }

  hasDescription(): boolean {
    return !!this.description && this.description.trim().length > 0;
  }

  hasSchedule(): boolean {
    return !!this.schedule && this.schedule.trim().length > 0;
  }

  // ==================== Coordinator helpers ====================

  hasCoordinator(): boolean {
    return !!this.coordinatorId;
  }

  getCoordinatorName(): string {
    if (this.coordinator?.user) {
      return `${this.coordinator.user.firstName} ${this.coordinator.user.lastName}`;
    }
    return 'Not Assigned';
  }

  getCoordinatorEmail(): string | null {
    return this.coordinator?.user?.email ?? null;
  }
  /**
   * Admin view — full detail.
   */
  toAdminJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      categoryLabel: this.getCategoryLabel(),
      schedule: this.schedule,
      maxMembers: this.maxMembers,
      coordinatorId: this.coordinatorId,
      coordinatorName: this.getCoordinatorName(),
      createdAt: this.createdAt,

      // Relations
      coordinator: this.coordinator,
      _count: this._count,
    };
  }

  /**
   * Coordinator view — same as admin but no raw teacher relation.
   */
  toCoordinatorJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      categoryLabel: this.getCategoryLabel(),
      schedule: this.schedule,
      maxMembers: this.maxMembers,
      coordinatorId: this.coordinatorId,
      coordinatorName: this.getCoordinatorName(),
      createdAt: this.createdAt,
    };
  }

  /**
   * Public view — students and parents.
   */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      categoryLabel: this.getCategoryLabel(),
      schedule: this.schedule,
      coordinatorName: this.getCoordinatorName(),
      maxMembers: this.maxMembers,
    };
  }

  /**
   * Summary view — for embedding in lists.
   */
  toSummaryJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      categoryLabel: this.getCategoryLabel(),
      schedule: this.schedule,
      coordinatorName: this.getCoordinatorName(),
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
