import { Injectable } from '@nestjs/common';
import { CreateActivityDto } from './dto/create-activity.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterActivityDto } from './dto/filter-activity.dto';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ActivityEntity } from './entities/activity.entity';
import { ActivityCategory, Prisma } from '@prisma/client';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createActivityDto: CreateActivityDto) {
    //check for coordinatorId if provided
    if (createActivityDto.coordinatorId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: createActivityDto.coordinatorId },
      });

      if (!teacher) throw new NotFoundException('Coordinator not found');
      if (teacher.employmentStatus !== 'ACTIVE') {
        throw new BadRequestException(
          'Cannot assign an inactive teacher as coordinator',
        );
      }
    }
    const existing = await this.prisma.activity.findFirst({
      where: {
        name: {
          equals: createActivityDto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Activity with name "${createActivityDto.name}" already exists`,
      );
    }

    const activity = await this.prisma.activity.create({
      data: {
        name: createActivityDto.name,
        description: createActivityDto.description || null,
        category: createActivityDto.category,
        schedule: createActivityDto.schedule || null,
        maxMembers: createActivityDto.maxMembers || null,
        coordinatorId: createActivityDto.coordinatorId || null,
      },
    });

    return new ActivityEntity(activity);
  }

  async findAll(): Promise<ActivityEntity[]> {
    return this.prisma.activity
      .findMany({})
      .then((activities) => activities.map((a) => new ActivityEntity(a)));
  }

  async findOne(id: string): Promise<ActivityEntity> {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) throw new NotFoundException('Activity not found');
    return new ActivityEntity(activity);
  }

  async findByCategory(category: ActivityCategory): Promise<ActivityEntity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { category: category },
      orderBy: { name: 'asc' },
    });
    return activities.map((a) => new ActivityEntity(a));
  }

  async findByCoordinator(coordinatorId: string): Promise<ActivityEntity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { coordinatorId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return activities.map((a) => new ActivityEntity(a));
  }

  async remove(id: string): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true } },
      },
    });

    if (!activity) throw new NotFoundException('Activity not found');
    await this.prisma.activity.delete({ where: { id } });
  }

  async update(
    id: string,
    updateDto: UpdateActivityDto,
  ): Promise<ActivityEntity> {
    const existing = await this.prisma.activity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Activity not found');

    // Check name uniqueness if changing
    if (updateDto.name && updateDto.name !== existing.name) {
      const duplicate = await this.prisma.activity.findFirst({
        where: {
          name: { equals: updateDto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Activity with name "${updateDto.name}" already exists`,
        );
      }
    }

    // Validate coordinator if changing
    if (updateDto.coordinatorId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateDto.coordinatorId },
      });

      if (!teacher) throw new NotFoundException('Coordinator not found');
      if (teacher.employmentStatus !== 'ACTIVE') {
        throw new BadRequestException(
          'Cannot assign an inactive teacher as coordinator',
        );
      }
    }

    // If reducing capacity, check it's not below current approved count
    if (updateDto.maxMembers !== undefined && updateDto.maxMembers !== null) {
      const approvedCount = await this.prisma.activityMembership.count({
        where: { activityId: id, status: 'APPROVED' },
      });

      if (updateDto.maxMembers < approvedCount) {
        throw new BadRequestException(
          `Cannot reduce capacity to ${updateDto.maxMembers} — ${approvedCount} member(s) already approved`,
        );
      }
    }

    // Build typed update data
    const data: Prisma.ActivityUpdateInput = {};

    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.description !== undefined)
      data.description = updateDto.description;
    if (updateDto.category !== undefined) data.category = updateDto.category;
    if (updateDto.schedule !== undefined) data.schedule = updateDto.schedule;
    if (updateDto.maxMembers !== undefined)
      data.maxMembers = updateDto.maxMembers;

    if (updateDto.coordinatorId !== undefined) {
      data.coordinator = updateDto.coordinatorId
        ? { connect: { id: updateDto.coordinatorId } }
        : { disconnect: true };
    }

    const activity = await this.prisma.activity.update({
      where: { id },
      data,
    });

    return new ActivityEntity(activity);
  }
  // ==================== SEARCH / FILTER ====================

  async search(
    searchTerm: string,
    limit: number = 10,
  ): Promise<ActivityEntity[]> {
    const activities = await this.prisma.activity.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { schedule: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return activities.map((a) => new ActivityEntity(a));
  }

  async filter(filterDto: FilterActivityDto): Promise<ActivityEntity[]> {
    const where: Prisma.ActivityWhereInput = {};

    if (filterDto.category) where.category = filterDto.category;
    if (filterDto.coordinatorId) where.coordinatorId = filterDto.coordinatorId;

    if (filterDto.search) {
      where.OR = [
        { name: { contains: filterDto.search, mode: 'insensitive' } },
        { description: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    const activities = await this.prisma.activity.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return activities.map((a) => new ActivityEntity(a));
  }

  // ==================== HELPERS ====================

  /**
   * Standalone check used by the membership module:
   * given an activity ID, return the current approved count + capacity info.
   * The membership service can call this or query Prisma directly.
   */
  async getCapacityInfo(id: string): Promise<{
    maxMembers: number | null;
    approvedCount: number;
    availableSpots: number | null;
    isFull: boolean;
  }> {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      select: { id: true, maxMembers: true },
    });

    if (!activity) throw new NotFoundException('Activity not found');

    const approvedCount = await this.prisma.activityMembership.count({
      where: { activityId: id, status: 'APPROVED' },
    });

    const hasLimit =
      activity.maxMembers !== null && activity.maxMembers !== undefined;

    return {
      maxMembers: activity.maxMembers,
      approvedCount,
      availableSpots: hasLimit
        ? Math.max(0, activity.maxMembers! - approvedCount)
        : null,
      isFull: hasLimit ? approvedCount >= activity.maxMembers! : false,
    };
  }
}
