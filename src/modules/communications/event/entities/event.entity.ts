// src/modules/academics/event/event/entities/event.entity.ts

import { Event, EventType, VisibilityType } from '@prisma/client';

export class EventEntity implements Event {
  id!: string;
  title!: string;
  description!: string | null;
  location!: string | null;
  startDate!: Date;
  endDate!: Date;
  eventType!: EventType;
  visibility!: VisibilityType;
  createdAt!: Date;

  // Only ID-level counts — full RSVP data lives in the EventRsvp module
  _count?: {
    attendees: number;
  };

  constructor(partial: Partial<EventEntity>) {
    Object.assign(this, partial);
  }

  // ==================== Display helpers ====================

  getEventTypeLabel(): string {
    const labels: Record<EventType, string> = {
      ACADEMIC: 'Academic',
      SPORTS: 'Sports',
      CULTURAL: 'Cultural',
      OTHER: 'Other',
    };
    return labels[this.eventType] ?? this.eventType;
  }

  getVisibilityLabel(): string {
    return this.visibility === 'PUBLIC' ? 'Public' : 'Internal';
  }

  hasDescription(): boolean {
    return !!this.description && this.description.trim().length > 0;
  }

  hasLocation(): boolean {
    return !!this.location && this.location.trim().length > 0;
  }

  // ==================== Date / time helpers ====================

  getDurationInHours(): number {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  }

  getDurationInDays(): number {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  isOngoing(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  isPast(): boolean {
    return new Date() > this.endDate;
  }

  isUpcoming(): boolean {
    return new Date() < this.startDate;
  }

  getDaysUntilStart(): number {
    const now = new Date();
    if (now >= this.startDate) return 0;
    const diff = this.startDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getStatus(): 'UPCOMING' | 'ONGOING' | 'PAST' {
    if (this.isOngoing()) return 'ONGOING';
    if (this.isPast()) return 'PAST';
    return 'UPCOMING';
  }

  getStatusLabel(): string {
    const labels = {
      UPCOMING: 'Upcoming',
      ONGOING: 'Happening Now',
      PAST: 'Past',
    };
    return labels[this.getStatus()];
  }

  // ==================== Visibility helpers ====================

  isPublic(): boolean {
    return this.visibility === 'PUBLIC';
  }

  isInternal(): boolean {
    return this.visibility === 'INTERNAL';
  }

  isVisibleToCommunity(): boolean {
    return this.isPublic();
  }

  // ==================== RSVP count (display only) ====================

  /**
   * Number of RSVPs recorded.
   * Only accurate when `_count.attendees` is loaded.
   * For full RSVP data (attending count, attendance rate, etc.),
   * use the EventRsvp module.
   */
  getRsvpCount(): number {
    return this._count?.attendees ?? 0;
  }

  // ==================== Serialization ====================

  toAdminJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      location: this.location,
      startDate: this.startDate,
      endDate: this.endDate,
      eventType: this.eventType,
      eventTypeLabel: this.getEventTypeLabel(),
      visibility: this.visibility,
      visibilityLabel: this.getVisibilityLabel(),
      createdAt: this.createdAt,

      durationInHours: this.getDurationInHours(),
      durationInDays: this.getDurationInDays(),
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      isUpcoming: this.isUpcoming(),
      isOngoing: this.isOngoing(),
      isPast: this.isPast(),
      daysUntilStart: this.getDaysUntilStart(),
      isPublic: this.isPublic(),

      rsvpCount: this.getRsvpCount(),
      _count: this._count,
    };
  }

  toStaffJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      location: this.location,
      startDate: this.startDate,
      endDate: this.endDate,
      eventType: this.eventType,
      eventTypeLabel: this.getEventTypeLabel(),
      visibility: this.visibility,
      visibilityLabel: this.getVisibilityLabel(),

      durationInHours: this.getDurationInHours(),
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      daysUntilStart: this.getDaysUntilStart(),

      rsvpCount: this.getRsvpCount(),
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      location: this.location,
      startDate: this.startDate,
      endDate: this.endDate,
      eventType: this.eventType,
      eventTypeLabel: this.getEventTypeLabel(),

      durationInHours: this.getDurationInHours(),
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      daysUntilStart: this.getDaysUntilStart(),
      isPublic: this.isPublic(),
    };
  }

  toCalendarJSON() {
    return {
      id: this.id,
      title: this.title,
      startDate: this.startDate,
      endDate: this.endDate,
      eventType: this.eventType,
      eventTypeLabel: this.getEventTypeLabel(),
      visibility: this.visibility,
      status: this.getStatus(),
      location: this.location,
    };
  }

  toSummaryJSON() {
    return {
      id: this.id,
      title: this.title,
      startDate: this.startDate,
      eventType: this.eventType,
      eventTypeLabel: this.getEventTypeLabel(),
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
    };
  }

  toJSON() {
    return this.toAdminJSON();
  }
}
