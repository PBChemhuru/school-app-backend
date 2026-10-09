// src/modules/academics/event/event/event.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { EventEntity } from './entities/event.entity';

// ==================== Include Shape ====================

const eventWithRelations = Prisma.validator<Prisma.EventDefaultArgs>()({
  include: {
    _count: {
      select: { attendees: true },
    },
  },
});

type EventWithRelations = Prisma.EventGetPayload<typeof eventWithRelations>;

// ==================== Service ====================

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(createDto: CreateEventDto): Promise<EventEntity> {
    // 1. Parse and validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }
    // 2. Create event and announcement in one transaction

    const created = await this.prisma.event.create({
      data: {
        title: createDto.title,
        description: createDto.description ?? null,
        location: createDto.location ?? null,
        startDate,
        endDate,
        eventType: createDto.eventType,
        visibility: createDto.visibilityType,
      },
      include: this.defaultIncludes(),
    });

    return new EventEntity(created);
  }

  // ==================== READ ====================

  async findAll(): Promise<EventEntity[]> {
    const events = await this.prisma.event.findMany();
    return events.map((e) => new EventEntity(e));
  }

  async findOne(id: string, userRole: Role): Promise<EventEntity> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (!event) throw new NotFoundException('Event not found');

    // Parents and students can only see PUBLIC events
    if (
      (userRole === Role.PARENT || userRole === Role.STUDENT) &&
      event.visibility !== 'PUBLIC'
    ) {
      throw new ForbiddenException('This event is not available');
    }

    return new EventEntity(event);
  }

  async findUpcoming(userRole: Role): Promise<EventEntity[]> {
    const now = new Date();
    const visibilityFilter = this.buildVisibilityFilter(userRole);

    const events = await this.prisma.event.findMany({
      where: {
        ...visibilityFilter,
        startDate: { gte: now },
      },
      include: this.defaultIncludes(),
      orderBy: [{ startDate: 'asc' }],
    });

    return events.map((e) => new EventEntity(e));
  }

  async findOngoing(userRole: Role): Promise<EventEntity[]> {
    const now = new Date();
    const visibilityFilter = this.buildVisibilityFilter(userRole);

    const events = await this.prisma.event.findMany({
      where: {
        ...visibilityFilter,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: this.defaultIncludes(),
      orderBy: [{ startDate: 'asc' }],
    });

    return events.map((e) => new EventEntity(e));
  }

  async findPast(userRole: Role): Promise<EventEntity[]> {
    const now = new Date();
    const visibilityFilter = this.buildVisibilityFilter(userRole);

    const events = await this.prisma.event.findMany({
      where: {
        ...visibilityFilter,
        endDate: { lt: now },
      },
      include: this.defaultIncludes(),
      orderBy: [{ startDate: 'desc' }],
    });

    return events.map((e) => new EventEntity(e));
  }

  // ==================== UPDATE ====================

  async update(id: string, updateDto: UpdateEventDto): Promise<EventEntity> {
    const existing = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Event not found');

    // Validate dates if both are provided
    if (updateDto.startDate && updateDto.endDate) {
      const startDate = new Date(updateDto.startDate);
      const endDate = new Date(updateDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    // If only one date is changing, validate against the existing one
    if (updateDto.startDate && !updateDto.endDate) {
      const newStart = new Date(updateDto.startDate);
      if (newStart >= existing.endDate) {
        throw new BadRequestException(
          'Start date must be before the existing end date',
        );
      }
    }

    if (updateDto.endDate && !updateDto.startDate) {
      const newEnd = new Date(updateDto.endDate);
      if (existing.startDate >= newEnd) {
        throw new BadRequestException(
          'End date must be after the existing start date',
        );
      }
    }

    // Build update data — only fields explicitly provided
    const data: Prisma.EventUpdateInput = {};

    if (updateDto.title !== undefined) data.title = updateDto.title;
    if (updateDto.description !== undefined)
      data.description = updateDto.description;
    if (updateDto.location !== undefined) data.location = updateDto.location;
    if (updateDto.startDate !== undefined)
      data.startDate = new Date(updateDto.startDate);
    if (updateDto.endDate !== undefined)
      data.endDate = new Date(updateDto.endDate);
    if (updateDto.eventType !== undefined) data.eventType = updateDto.eventType;
    if (updateDto.visibilityType !== undefined)
      data.visibility = updateDto.visibilityType;

    const event = await this.prisma.event.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    return new EventEntity(event);
  }

  // ==================== DELETE ====================

  async remove(id: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!event) throw new NotFoundException('Event not found');

    // Cascade delete will remove associated RSVPs (once you add onDelete: Cascade)
    await this.prisma.event.delete({ where: { id } });
  }

  // ==================== SEARCH / FILTER ====================

  async search(searchTerm: string, userRole: Role): Promise<EventEntity[]> {
    const visibilityFilter = this.buildVisibilityFilter(userRole);

    const events = await this.prisma.event.findMany({
      where: {
        ...visibilityFilter,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { location: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: this.defaultIncludes(),
      orderBy: [{ startDate: 'desc' }],
    });

    return events.map((e) => new EventEntity(e));
  }

  async filter(
    filterDto: FilterEventDto,
    userRole: Role,
  ): Promise<EventEntity[]> {
    const where: Prisma.EventWhereInput = {
      ...this.buildVisibilityFilter(userRole),
    };

    if (filterDto.eventType) where.eventType = filterDto.eventType;
    if (filterDto.visibilityType) where.visibility = filterDto.visibilityType;

    if (filterDto.startDate || filterDto.endDate) {
      where.startDate = {};
      if (filterDto.startDate) {
        where.startDate.gte = new Date(filterDto.startDate);
      }
      if (filterDto.endDate) {
        where.startDate.lte = new Date(filterDto.endDate);
      }
    }

    if (filterDto.search) {
      where.OR = [
        { title: { contains: filterDto.search, mode: 'insensitive' } },
        { description: { contains: filterDto.search, mode: 'insensitive' } },
        { location: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    const events = await this.prisma.event.findMany({
      where,
      include: this.defaultIncludes(),
      orderBy: [{ startDate: 'asc' }],
    });

    return events.map((e) => new EventEntity(e));
  }

  async getCalendar(
    fromDate: string,
    toDate: string,
    userRole: Role,
  ): Promise<EventEntity[]> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from > to) {
      throw new BadRequestException('fromDate must be before toDate');
    }

    const events = await this.prisma.event.findMany({
      where: {
        ...this.buildVisibilityFilter(userRole),
        // Events that overlap the range (started before `to` AND ended after `from`)
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: this.defaultIncludes(),
      orderBy: [{ startDate: 'asc' }],
    });

    return events.map((e) => new EventEntity(e));
  }

  // ==================== STATS ====================

  async getStats(userRole: Role) {
    const now = new Date();
    const visibilityFilter = this.buildVisibilityFilter(userRole);

    const [total, upcoming, ongoing, past] = await Promise.all([
      this.prisma.event.count({ where: visibilityFilter }),
      this.prisma.event.count({
        where: { ...visibilityFilter, startDate: { gt: now } },
      }),
      this.prisma.event.count({
        where: {
          ...visibilityFilter,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      this.prisma.event.count({
        where: { ...visibilityFilter, endDate: { lt: now } },
      }),
    ]);

    return { total, upcoming, ongoing, past };
  }

  // ==================== HELPERS ====================

  /**
   * Build a visibility filter based on the user's role.
   * Parents and students only see PUBLIC events.
   * Admin and teachers see everything.
   */
  private buildVisibilityFilter(userRole: Role): Prisma.EventWhereInput {
    if (userRole === Role.ADMIN || userRole === Role.TEACHER) {
      return {};
    }
    return { visibility: 'PUBLIC' };
  }

  /**
   * Build a friendly announcement body from event data.
   */
  private buildAnnouncementBody(event: {
    title: string;
    description: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date;
  }): string {
    const lines: string[] = [];

    if (event.description) {
      lines.push(event.description);
      lines.push('');
    }

    lines.push(
      `📅 ${event.startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
    );

    lines.push(
      `🕐 ${event.startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${event.endDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );

    if (event.location) {
      lines.push(`📍 ${event.location}`);
    }

    return lines.join('\n');
  }

  private defaultIncludes() {
    return eventWithRelations.include;
  }
}
