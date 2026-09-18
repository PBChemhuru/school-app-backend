// src/modules/academics/activity/activity-membership/activity-membership.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignUpActivityDto } from './dto/sign-up-activity.dto';
import { FilterMembershipDto } from './dto/filter-membership.dto';
import { ActivityMembershipEntity } from './entities/activity-membership.entity';

// ==================== Response Interfaces ====================

export interface SignUpResponse {
  membership: ActivityMembershipEntity;
  message: string;
}

export interface ApproveResponse {
  membership: ActivityMembershipEntity;
  message: string;
}

export interface WithdrawResponse {
  message: string;
}

// ==================== Include Shape ====================

const membershipWithRelations =
  Prisma.validator<Prisma.ActivityMembershipDefaultArgs>()({
    include: {
      student: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
            },
          },
        },
      },
      activity: {
        include: {
          coordinator: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          _count: {
            select: { memberships: true },
          },
        },
      },
      reviewedBy: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

type MembershipWithRelations = Prisma.ActivityMembershipGetPayload<
  typeof membershipWithRelations
>;

// ==================== Service ====================

@Injectable()
export class ActivityMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== STUDENT: SIGN UP ====================
  async signUp(
    activityId: string,
    studentUserId: string,
    dto: SignUpActivityDto,
  ): Promise<SignUpResponse> {
    // 1. Find student from the auth user
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    if (student.enrollmentStatus !== 'ACTIVE') {
      throw new BadRequestException('Only active students can join activities');
    }

    // 2. Validate activity exists
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // 3. Check for existing membership
    const existing = await this.prisma.activityMembership.findUnique({
      where: {
        activityId_studentId: {
          activityId,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        throw new ConflictException(
          'You are already a member of this activity',
        );
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Your signup is already pending approval');
      }
      // WITHDRAWN or REJECTED — shouldn't happen since we delete on withdraw,
      // but just in case, allow them to be reopened via update
    }

    // 4. Check capacity (only counts APPROVED members)
    const approvedCount = await this.prisma.activityMembership.count({
      where: { activityId, status: 'APPROVED' },
    });

    if (activity.maxMembers && approvedCount >= activity.maxMembers) {
      throw new BadRequestException(
        'This activity is currently full. Please try again later.',
      );
    }

    // 5. Create PENDING membership
    const membership = await this.prisma.activityMembership.create({
      data: {
        activityId,
        studentId: student.id,
        status: 'PENDING',
      },
      include: this.defaultIncludes(),
    });

    return {
      membership: new ActivityMembershipEntity(membership),
      message:
        'Your signup was submitted. The coordinator will review it shortly.',
    };
  }

  // ==================== COORDINATOR: APPROVE ====================

  /**
   * Coordinator approves a pending signup.
   * Only the assigned coordinator (or admin) can approve.
   */
  async approve(
    membershipId: string,
    reviewerUserId: string,
  ): Promise<ApproveResponse> {
    // 1. Find the membership
    const membership = await this.prisma.activityMembership.findUnique({
      where: { id: membershipId },
      include: { activity: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.status !== 'PENDING') {
      throw new BadRequestException('Only pending signups can be approved');
    }

    // 2. Verify reviewer is the coordinator (or an admin)
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      include: { teacherProfile: true },
    });

    if (!reviewer) {
      throw new NotFoundException('Reviewer not found');
    }

    const isAdmin = reviewer.role === 'ADMIN';
    const isCoordinator =
      reviewer.teacherProfile?.id === membership.activity.coordinatorId;

    if (!isAdmin && !isCoordinator) {
      throw new ForbiddenException(
        'Only the activity coordinator or an admin can approve signups',
      );
    }

    // 3. Check capacity again — other students may have filled it
    const approvedCount = await this.prisma.activityMembership.count({
      where: {
        activityId: membership.activityId,
        status: 'APPROVED',
      },
    });

    if (
      membership.activity.maxMembers &&
      approvedCount >= membership.activity.maxMembers
    ) {
      throw new BadRequestException(
        'Cannot approve — activity is already full',
      );
    }

    // 4. Update membership
    const updated = await this.prisma.activityMembership.update({
      where: { id: membershipId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: reviewer.teacherProfile?.id ?? null,
      },
      include: this.defaultIncludes(),
    });

    return {
      membership: new ActivityMembershipEntity(updated),
      message: 'Member approved successfully',
    };
  }

  // ==================== STUDENT: WITHDRAW ====================

  /**
   * Student withdraws from an activity.
   * The membership row is deleted so the student can rejoin later.
   */
  async withdraw(
    membershipId: string,
    studentUserId: string,
  ): Promise<WithdrawResponse> {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    const membership = await this.prisma.activityMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) throw new NotFoundException('Membership not found');

    if (membership.studentId !== student.id) {
      throw new ForbiddenException(
        'You can only withdraw your own memberships',
      );
    }

    // Delete the row
    await this.prisma.activityMembership.delete({
      where: { id: membershipId },
    });

    return {
      message: 'You have successfully withdrawn from this activity',
    };
  }

  // ==================== ADMIN: REMOVE MEMBER ====================

  /**
   * Admin removes a member from any activity.
   * Works regardless of status (PENDING, APPROVED).
   */
  async removeMember(membershipId: string): Promise<WithdrawResponse> {
    const membership = await this.prisma.activityMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) throw new NotFoundException('Membership not found');

    await this.prisma.activityMembership.delete({
      where: { id: membershipId },
    });

    return { message: 'Member removed successfully' };
  }

  // ==================== READ ====================

  async findOne(id: string): Promise<ActivityMembershipEntity> {
    const membership = await this.prisma.activityMembership.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (!membership) throw new NotFoundException('Membership not found');
    return new ActivityMembershipEntity(membership);
  }

  /**
   * List all memberships for an activity.
   * Optionally filter by status (e.g., only APPROVED, only PENDING).
   */
  async findByActivity(
    activityId: string,
    status?: 'PENDING' | 'APPROVED',
  ): Promise<ActivityMembershipEntity[]> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');

    const where: Prisma.ActivityMembershipWhereInput = { activityId };
    if (status) where.status = status;

    const memberships = await this.prisma.activityMembership.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ status: 'asc' }, { joinedAt: 'asc' }],
    });

    return memberships.map((m) => new ActivityMembershipEntity(m));
  }

  /**
   * List pending memberships for an activity.
   * Shortcut for findByActivity(id, 'PENDING').
   */
  async findPending(activityId: string): Promise<ActivityMembershipEntity[]> {
    return this.findByActivity(activityId, 'PENDING');
  }

  /**
   * Get all memberships for the current student.
   */
  async findByStudent(
    studentUserId: string,
  ): Promise<ActivityMembershipEntity[]> {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    const memberships = await this.prisma.activityMembership.findMany({
      where: { studentId: student.id },
      include: this.defaultIncludes(),
      orderBy: [{ joinedAt: 'desc' }],
    });

    return memberships.map((m) => new ActivityMembershipEntity(m));
  }

  /**
   * General filter — used by admin/teacher dashboards.
   */
  async filter(
    filterDto: FilterMembershipDto,
  ): Promise<ActivityMembershipEntity[]> {
    const where: Prisma.ActivityMembershipWhereInput = {};

    if (filterDto.activityId) where.activityId = filterDto.activityId;
    if (filterDto.studentId) where.studentId = filterDto.studentId;
    if (filterDto.status) where.status = filterDto.status;

    const memberships = await this.prisma.activityMembership.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ joinedAt: 'desc' }],
    });

    return memberships.map((m) => new ActivityMembershipEntity(m));
  }

  // ==================== STATISTICS ====================

  /**
   * Get pending and approved counts for an activity.
   * Useful for coordinator dashboard.
   */
  async getActivityMembershipStats(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');

    const [pendingCount, approvedCount] = await Promise.all([
      this.prisma.activityMembership.count({
        where: { activityId, status: 'PENDING' },
      }),
      this.prisma.activityMembership.count({
        where: { activityId, status: 'APPROVED' },
      }),
    ]);

    return {
      activityId,
      activityName: activity.name,
      maxMembers: activity.maxMembers,
      pendingCount,
      approvedCount,
      availableSpots: activity.maxMembers
        ? Math.max(0, activity.maxMembers - approvedCount)
        : null,
      isFull: activity.maxMembers
        ? approvedCount >= activity.maxMembers
        : false,
    };
  }

  // ==================== HELPERS ====================

  private defaultIncludes() {
    return membershipWithRelations.include;
  }
}
