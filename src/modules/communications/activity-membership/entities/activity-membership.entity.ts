// src/modules/academics/activity/activity-membership/entities/activity-membership.entity.ts

import {
  ActivityMembership,
  ActivityMembershipStatus,
  Student,
  Activity,
} from '@prisma/client';

// ==================== Relation shapes ====================

type StudentWithUser = Student & {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    profilePhoto?: string | null;
  };
};

type ActivitySummary = Pick<
  Activity,
  'id' | 'name' | 'category' | 'schedule' | 'maxMembers' | 'coordinatorId'
>;

// ==================== Entity ====================

export class ActivityMembershipEntity implements ActivityMembership {
  id!: string;
  activityId!: string;
  studentId!: string;
  status!: ActivityMembershipStatus;
  joinedAt!: Date;
  student?: StudentWithUser;
  activity?: ActivitySummary;
  constructor(partial: Partial<ActivityMembershipEntity>) {
    Object.assign(this, partial);
  }

  // ==================== Student helpers ====================

  getStudentName(): string {
    if (this.student?.user) {
      return `${this.student.user.firstName} ${this.student.user.lastName}`;
    }
    return 'Unknown Student';
  }

  getStudentEmail(): string | null {
    return this.student?.user?.email ?? null;
  }

  getAdmissionNumber(): string | null {
    return this.student?.admissionNumber ?? null;
  }

  getStudentPhoto(): string | null {
    return this.student?.user?.profilePhoto ?? null;
  }

  // ==================== Activity helpers ====================

  getActivityName(): string {
    return this.activity?.name ?? 'Unknown Activity';
  }

  getActivityCategory(): string {
    return this.activity?.category ?? 'N/A';
  }

  getActivitySchedule(): string | null {
    return this.activity?.schedule ?? null;
  }
  // ==================== Status helpers ====================

  isPending(): boolean {
    return this.status === ActivityMembershipStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === ActivityMembershipStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === ActivityMembershipStatus.REJECTED;
  }

  isWithdrawn(): boolean {
    return this.status === ActivityMembershipStatus.WITHDRAWN;
  }

  /**
   * Whether the membership currently counts as an active member.
   */
  isActive(): boolean {
    return this.isApproved();
  }

  /**
   * Human-friendly status label.
   */
  getStatusLabel(): string {
    const labels: Record<ActivityMembershipStatus, string> = {
      PENDING: 'Pending Approval',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      WITHDRAWN: 'Withdrawn',
    };
    return labels[this.status] ?? this.status;
  }

  /**
   * Whether the membership can still be approved.
   */
  canBeApproved(): boolean {
    return this.isPending();
  }

  // ==================== Timeline helpers ====================

  /**
   * How many days since the student first signed up.
   */
  getDaysSinceJoined(): number {
    const now = new Date();
    const diff = now.getTime() - this.joinedAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
  /**
   * Whether the membership has been waiting > 7 days for review.
   * Useful for "please review" nudges in the coordinator dashboard.
   */
  isOverdueForReview(): boolean {
    if (!this.isPending()) return false;
    return this.getDaysSinceJoined() > 7;
  }

  // ==================== Serialization ====================

  /**
   * Admin view — full detail.
   */
  toAdminJSON() {
    return {
      id: this.id,
      activityId: this.activityId,
      studentId: this.studentId,
      status: this.status,
      statusLabel: this.getStatusLabel(),
      joinedAt: this.joinedAt,
      // Computed
      daysSinceJoined: this.getDaysSinceJoined(),
      isOverdueForReview: this.isOverdueForReview(),
      canBeApproved: this.canBeApproved(),
      isActive: this.isActive(),

      // Flattened names
      studentName: this.getStudentName(),
      studentEmail: this.getStudentEmail(),
      admissionNumber: this.getAdmissionNumber(),
      activityName: this.getActivityName(),
      // Relations
      student: this.student,
      activity: this.activity,
    };
  }

  toCoordinatorJSON() {
    return {
      id: this.id,
      activityId: this.activityId,
      studentId: this.studentId,
      status: this.status,
      statusLabel: this.getStatusLabel(),
      joinedAt: this.joinedAt,
      // Computed
      daysSinceJoined: this.getDaysSinceJoined(),
      isOverdueForReview: this.isOverdueForReview(),
      canBeApproved: this.canBeApproved(),

      // Flattened
      studentName: this.getStudentName(),
      admissionNumber: this.getAdmissionNumber(),
      studentPhoto: this.getStudentPhoto(),
    };
  }

  /**
   * Student / parent view — own memberships.
   */
  toPublicJSON() {
    return {
      id: this.id,
      activityId: this.activityId,
      status: this.status,
      statusLabel: this.getStatusLabel(),
      joinedAt: this.joinedAt,
      activityName: this.getActivityName(),
      activityCategory: this.getActivityCategory(),
      activitySchedule: this.getActivitySchedule(),
    };
  }

  /**
   * Summary view — for embedding in other responses.
   */
  toSummaryJSON() {
    return {
      id: this.id,
      activityId: this.activityId,
      status: this.status,
      statusLabel: this.getStatusLabel(),
      activityName: this.getActivityName(),
      studentName: this.getStudentName(),
      joinedAt: this.joinedAt,
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
