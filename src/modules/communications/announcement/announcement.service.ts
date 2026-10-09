import { Injectable } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnnouncementEntity } from './entities/announcement.entity';
import {
  AnnouncementScope,
  Prisma,
  AnnouncementAudience,
  Role,
} from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common/exceptions';

import { FilterAnnouncementDto } from './dto/filter-announcement.dto';

const announcementWithRelations =
  Prisma.validator<Prisma.AnnouncementDefaultArgs>()({
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      targetClass: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          section: true,
        },
      },
    },
  });

type AnnouncementWithRelations = Prisma.AnnouncementGetPayload<
  typeof announcementWithRelations
>;
@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    createById: string,
  ): Promise<AnnouncementEntity> {
    this.validateScopeAndClass(
      createAnnouncementDto.scope,
      createAnnouncementDto.classId,
    );
    if (
      createAnnouncementDto.scope === AnnouncementScope.CLASS &&
      createAnnouncementDto.classId
    ) {
      const schoolClass = await this.prisma.schoolClass.findUnique({
        where: { id: createAnnouncementDto.classId },
      });
      if (!schoolClass) {
        throw new NotFoundException('Class not found');
      }
    }

    // 3. Validate dates
    const publishAt = createAnnouncementDto.publishAt
      ? new Date(createAnnouncementDto.publishAt)
      : null;
    const expiresAt = createAnnouncementDto.expiresAt
      ? new Date(createAnnouncementDto.expiresAt)
      : null;

    if (publishAt && expiresAt && expiresAt <= publishAt) {
      throw new BadRequestException('Expiry date must be after publish date');
    }

    // 4. Create announcement
    const announcement = await this.prisma.announcement.create({
      data: {
        title: createAnnouncementDto.title,
        body: createAnnouncementDto.body,
        scope: createAnnouncementDto.scope,
        audience: createAnnouncementDto.audience,
        classId:
          createAnnouncementDto.scope === AnnouncementScope.CLASS
            ? (createAnnouncementDto.classId ?? null)
            : null,
        createdById: createById,
        publishAt,
        expiresAt,
        attachmentUrl: createAnnouncementDto.attachmentUrl ?? null,
      },
      include: this.defaultIncludes(),
    });

    // NOTE: Notifications will be created here later:
    // await this.notificationService.notifyAnnouncement(announcement);

    return new AnnouncementEntity(announcement);
  }

  async findAll(userRole: Role): Promise<AnnouncementEntity[]> {
    const announcements = await this.prisma.announcement.findMany({
      where: this.buildRoleFilter(userRole),
      include: this.defaultIncludes(),
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
    });

    return announcements.map((a) => new AnnouncementEntity(a));
  }

  async findOne(id: string, userRole: Role): Promise<AnnouncementEntity> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (!announcement) throw new NotFoundException('Announcement not found');

    // Students/parents can't see TEACHERS-only announcements
    if (
      (userRole === Role.STUDENT || userRole === Role.PARENT) &&
      announcement.audience === AnnouncementAudience.TEACHERS
    ) {
      throw new ForbiddenException('This announcement is not available');
    }

    // Teachers can't see STUDENTS/PARENTS-only? Actually, teachers CAN see everything
    // (they're staff). Skip that check.

    return new AnnouncementEntity(announcement);
  }

  /**
   * The user's personal feed.
   *
   * Rules:
   * - Only active announcements (published, not expired)
   * - Matches their role
   * - If they're a student/parent: also matches their class (via student's class)
   * - If they're a teacher: school-wide + their class-scoped announcements
   */
  async findForUser(
    userId: string,
    userRole: Role,
  ): Promise<AnnouncementEntity[]> {
    const now = new Date();

    // Build the base filter: active announcements only
    const activeFilter: Prisma.AnnouncementWhereInput = {
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    };

    // Role-specific targeting
    let roleFilter: Prisma.AnnouncementWhereInput;

    if (userRole === Role.ADMIN) {
      // Admins see everything
      roleFilter = {};
    } else if (userRole === Role.TEACHER) {
      // Teachers see:
      //   - SCHOOL scope, audience ALL or TEACHERS
      //   - CLASS scope (any audience) for their own classes
      roleFilter = {
        OR: [
          {
            scope: AnnouncementScope.SCHOOL,
            audience: {
              in: [AnnouncementAudience.ALL, AnnouncementAudience.TEACHERS],
            },
          },
          {
            scope: AnnouncementScope.CLASS,
            targetClass: {
              OR: [
                { classTeacherId: { not: null } },
                { curricula: { some: {} } },
              ],
            },
          },
        ],
      };

      // Refine: teacher's own classes
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (teacher) {
        roleFilter = {
          OR: [
            {
              scope: AnnouncementScope.SCHOOL,
              audience: {
                in: [AnnouncementAudience.ALL, AnnouncementAudience.TEACHERS],
              },
            },
            {
              scope: AnnouncementScope.CLASS,
              targetClass: {
                OR: [
                  { classTeacherId: teacher.id },
                  { curricula: { some: { teacherId: teacher.id } } },
                ],
              },
            },
          ],
        };
      } else {
        // Teacher profile missing — only school-wide
        roleFilter = {
          scope: AnnouncementScope.SCHOOL,
          audience: {
            in: [AnnouncementAudience.ALL, AnnouncementAudience.TEACHERS],
          },
        };
      }
    } else if (userRole === Role.STUDENT) {
      // Students see:
      //   - SCHOOL scope, audience ALL or STUDENTS
      //   - CLASS scope, audience ALL or STUDENTS where they are in the class
      const student = await this.prisma.student.findUnique({
        where: { userId },
        select: { currentClassId: true },
      });

      const schoolScope: Prisma.AnnouncementWhereInput = {
        scope: AnnouncementScope.SCHOOL,
        audience: {
          in: [AnnouncementAudience.ALL, AnnouncementAudience.STUDENTS],
        },
      };

      const classScope: Prisma.AnnouncementWhereInput = student?.currentClassId
        ? {
            scope: AnnouncementScope.CLASS,
            classId: student.currentClassId,
            audience: {
              in: [AnnouncementAudience.ALL, AnnouncementAudience.STUDENTS],
            },
          }
        : { id: 'never-matches' }; // sentinel: no class = no class-scope announcements

      roleFilter = { OR: [schoolScope, classScope] };
    } else {
      // PARENT
      const parent = await this.prisma.parent.findUnique({
        where: { userId },
        include: {
          children: {
            where: { approved: true },
            select: { studentId: true },
          },
        },
      });

      const childClassIds: string[] = [];
      if (parent && parent.children.length > 0) {
        const students = await this.prisma.student.findMany({
          where: { id: { in: parent.children.map((c) => c.studentId) } },
          select: { currentClassId: true },
        });
        students.forEach((s) => {
          if (s.currentClassId) childClassIds.push(s.currentClassId);
        });
      }

      const schoolScope: Prisma.AnnouncementWhereInput = {
        scope: AnnouncementScope.SCHOOL,
        audience: {
          in: [AnnouncementAudience.ALL, AnnouncementAudience.PARENTS],
        },
      };

      const classScope: Prisma.AnnouncementWhereInput =
        childClassIds.length > 0
          ? {
              scope: AnnouncementScope.CLASS,
              classId: { in: childClassIds },
              audience: {
                in: [AnnouncementAudience.ALL, AnnouncementAudience.PARENTS],
              },
            }
          : { id: 'never-matches' };

      roleFilter = { OR: [schoolScope, classScope] };
    }

    const announcements = await this.prisma.announcement.findMany({
      where: {
        AND: [activeFilter, roleFilter],
      },
      include: this.defaultIncludes(),
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
    });

    return announcements.map((a) => new AnnouncementEntity(a));
  }

  // ==================== UPDATE ====================

  async update(
    id: string,
    updateDto: UpdateAnnouncementDto,
  ): Promise<AnnouncementEntity> {
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    // Determine final values
    const finalScope = updateDto.scope ?? existing.scope;
    const finalClassId =
      updateDto.classId !== undefined ? updateDto.classId : existing.classId;

    // Validate scope/classId consistency
    this.validateScopeAndClass(finalScope, finalClassId);

    // If CLASS scope, verify class exists
    if (finalScope === AnnouncementScope.CLASS && finalClassId) {
      const schoolClass = await this.prisma.schoolClass.findUnique({
        where: { id: finalClassId },
      });
      if (!schoolClass) {
        throw new NotFoundException('Class not found');
      }
    }

    // Validate dates if provided
    const finalPublishAt =
      updateDto.publishAt !== undefined
        ? updateDto.publishAt
          ? new Date(updateDto.publishAt)
          : null
        : existing.publishAt;

    const finalExpiresAt =
      updateDto.expiresAt !== undefined
        ? updateDto.expiresAt
          ? new Date(updateDto.expiresAt)
          : null
        : existing.expiresAt;

    if (finalPublishAt && finalExpiresAt && finalExpiresAt <= finalPublishAt) {
      throw new BadRequestException('Expiry date must be after publish date');
    }

    // Build update data
    const data: Prisma.AnnouncementUpdateInput = {};

    if (updateDto.title !== undefined) data.title = updateDto.title;
    if (updateDto.body !== undefined) data.body = updateDto.body;
    if (updateDto.scope !== undefined) data.scope = updateDto.scope;
    if (updateDto.audience !== undefined) data.audience = updateDto.audience;
    if (updateDto.publishAt !== undefined) data.publishAt = finalPublishAt;
    if (updateDto.expiresAt !== undefined) data.expiresAt = finalExpiresAt;
    if (updateDto.attachmentUrl !== undefined)
      data.attachmentUrl = updateDto.attachmentUrl;

    // Handle scope/classId relation
    if (finalScope === AnnouncementScope.CLASS && finalClassId) {
      data.targetClass = { connect: { id: finalClassId } };
    } else {
      data.targetClass = { disconnect: true };
    }

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    return new AnnouncementEntity(announcement);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');

    await this.prisma.announcement.delete({ where: { id } });
  }

  // ==================== FILTER / SEARCH ====================

  async filter(
    filterDto: FilterAnnouncementDto,
    userRole: Role,
  ): Promise<AnnouncementEntity[]> {
    const where: Prisma.AnnouncementWhereInput = {
      ...this.buildRoleFilter(userRole),
    };

    if (filterDto.scope) where.scope = filterDto.scope;
    if (filterDto.audience) where.audience = filterDto.audience;
    if (filterDto.classId) where.classId = filterDto.classId;
    if (filterDto.createdById) where.createdById = filterDto.createdById;

    if (filterDto.activeOnly) {
      const now = new Date();
      where.AND = [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ];
    }

    if (filterDto.fromDate || filterDto.toDate) {
      where.publishAt = {};
      if (filterDto.fromDate) {
        where.publishAt.gte = new Date(filterDto.fromDate);
      }
      if (filterDto.toDate) {
        where.publishAt.lte = new Date(filterDto.toDate);
      }
    }

    if (filterDto.search) {
      where.OR = [
        { title: { contains: filterDto.search, mode: 'insensitive' } },
        { body: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
    });

    return announcements.map((a) => new AnnouncementEntity(a));
  }

  // ==================== RECIPIENT RESOLUTION (for notifications) ====================

  /**
   * Compute which User IDs should receive this announcement.
   * Used by the notification service later — the announcement service
   * doesn't itself create notifications, it just tells the caller who to notify.
   */
  async resolveRecipientUserIds(
    announcement: AnnouncementEntity,
  ): Promise<string[]> {
    // ============ Step 1: Get candidate users by scope ============
    let candidates: { userId: string; role: Role }[] = [];

    if (announcement.scope === AnnouncementScope.SCHOOL) {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, role: true },
      });
      candidates = users.map((u) => ({ userId: u.id, role: u.role }));
    } else {
      // CLASS scope: students + their parents + teachers of the class
      const studentsInClass = await this.prisma.student.findMany({
        where: {
          currentClassId: announcement.classId,
          enrollmentStatus: 'ACTIVE',
        },
        include: {
          user: { select: { id: true } },
          parents: {
            where: { approved: true },
            include: {
              parent: {
                include: { user: { select: { id: true } } },
              },
            },
          },
        },
      });

      for (const student of studentsInClass) {
        candidates.push({ userId: student.user.id, role: Role.STUDENT });
        for (const link of student.parents) {
          candidates.push({
            userId: link.parent.user.id,
            role: Role.PARENT,
          });
        }
      }

      // Add teachers of this class
      if (announcement.classId) {
        const schoolClass = await this.prisma.schoolClass.findUnique({
          where: { id: announcement.classId },
          include: {
            classTeacher: {
              include: { user: { select: { id: true, status: true } } },
            },
            curricula: {
              include: {
                teacher: {
                  include: { user: { select: { id: true, status: true } } },
                },
              },
            },
          },
        });

        if (schoolClass) {
          if (schoolClass.classTeacher?.user) {
            candidates.push({
              userId: schoolClass.classTeacher.user.id,
              role: Role.TEACHER,
            });
          }
          for (const c of schoolClass.curricula) {
            if (c.teacher?.user) {
              candidates.push({
                userId: c.teacher.user.id,
                role: Role.TEACHER,
              });
            }
          }
        }
      }
    }

    // ============ Step 2: Filter by audience ============
    let filtered: string[];

    switch (announcement.audience) {
      case AnnouncementAudience.ALL:
        filtered = candidates.map((c) => c.userId);
        break;

      case AnnouncementAudience.TEACHERS:
        filtered = candidates
          .filter((c) => c.role === Role.TEACHER)
          .map((c) => c.userId);
        break;

      case AnnouncementAudience.STUDENTS:
        filtered = candidates
          .filter((c) => c.role === Role.STUDENT)
          .map((c) => c.userId);
        break;

      case AnnouncementAudience.PARENTS:
        filtered = candidates
          .filter((c) => c.role === Role.PARENT)
          .map((c) => c.userId);
        break;

      default:
        filtered = [];
    }

    // Deduplicate (a user might be both a parent and teacher in rare cases)
    return Array.from(new Set(filtered));
  }

  private validateScopeAndClass(
    scope: AnnouncementScope,
    classId: string | null | undefined,
  ): void {
    if (scope === AnnouncementScope.SCHOOL) {
      if (classId) {
        throw new BadRequestException(
          'classId must not be provided when scope is SCHOOL',
        );
      }
    } else if (scope === AnnouncementScope.CLASS) {
      if (!classId) {
        throw new BadRequestException(
          'classId is required when scope is CLASS',
        );
      }
    }
  }

  private buildRoleFilter(userRole: Role): Prisma.AnnouncementWhereInput {
    // Admins see everything
    if (userRole === Role.ADMIN) {
      return {};
    }

    // Teachers see SCHOOL-wide ALL/TEACHERS + their CLASS-scoped
    // (Simplified: teachers can see all school-wide + class-targeted)
    if (userRole === Role.TEACHER) {
      return {
        OR: [
          { scope: AnnouncementScope.SCHOOL },
          { scope: AnnouncementScope.CLASS },
        ],
      };
    }

    // Students and parents should use `findForUser` for their personal feed.
    // If they hit `findAll`, restrict to SCHOOL-wide ALL announcements.
    return {
      scope: AnnouncementScope.SCHOOL,
      audience: AnnouncementAudience.ALL,
    };
  }

  private defaultIncludes() {
    return announcementWithRelations.include;
  }
}
