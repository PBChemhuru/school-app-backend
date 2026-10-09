import {
  Announcement,
  AnnouncementAudience,
  AnnouncementScope,
  SchoolClass,
} from '@prisma/client';

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type ClassSummary = Pick<SchoolClass, 'id' | 'name' | 'gradeLevel' | 'section'>;
export class AnnouncementEntity implements Announcement {
  id!: string;
  title!: string;
  body!: string;
  scope!: AnnouncementScope;
  audience!: AnnouncementAudience;
  classId!: string | null;
  createdById!: string;
  publishAt!: Date | null;
  expiresAt!: Date | null;
  attachmentUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  createdBy?: UserSummary;
  targetClass?: ClassSummary | null;

  constructor(partial: Partial<AnnouncementEntity>) {
    Object.assign(this, partial);
  }

  getScopeLabel(): string {
    const labels: Record<AnnouncementScope, string> = {
      SCHOOL: 'Whole School',
      CLASS: 'Specific Class',
    };
    return labels[this.scope] ?? this.scope;
  }

  getAudienceLabel(): string {
    const labels: Record<AnnouncementAudience, string> = {
      ALL: 'Everyone',
      TEACHERS: 'Teachers Only',
      STUDENTS: 'Students Only',
      PARENTS: 'Parents Only',
    };
    return labels[this.audience] ?? this.audience;
  }
  getTargetSummary(): string {
    if (this.scope === 'SCHOOL') {
      return this.getAudienceLabel();
    }

    const className = this.getTargetClassName() ?? 'Unknown Class';
    return `${this.getAudienceLabel()} (${className})`;
  }
  isSchoolWide(): boolean {
    return this.scope === 'SCHOOL';
  }
  isClassTargeted(): boolean {
    return this.scope === 'CLASS';
  }
  // ==================== Class helpers ====================
  getTargetClassName(): string | null {
    if (this.targetClass) {
      const section = this.targetClass.section
        ? ` ${this.targetClass.section}`
        : '';
      return `${this.targetClass.gradeLevel}${section}`;
    }
    return null;
  }
  // ==================== Author helpers ====================
  getAuthorName(): string {
    if (this.createdBy) {
      return `${this.createdBy.firstName} ${this.createdBy.lastName}`;
    }
    return 'Unknown Author';
  }

  getAuthorEmail(): string | null {
    return this.createdBy?.email ?? null;
  }
  // ==================== Content helpers ===================
  hasAttachment(): boolean {
    return !!this.attachmentUrl && this.attachmentUrl.trim().length > 0;
  }

  getPreview(length: number = 150): string {
    const plain = this.body.replace(/<[^>]*>/g, '').trim();
    if (plain.length <= length) return plain;
    return plain.substring(0, length) + '…';
  }

  // ==================== Serialization ====================
  toAdminJSON() {
    return {
      id: this.id,
      title: this.title,
      body: this.body,
      preview: this.getPreview(),

      // Targeting
      scope: this.scope,
      scopeLabel: this.getScopeLabel(),
      audience: this.audience,
      audienceLabel: this.getAudienceLabel(),
      classId: this.classId,
      targetClassName: this.getTargetClassName(),
      targetSummary: this.getTargetSummary(),
      isSchoolWide: this.isSchoolWide(),
      isClassTargeted: this.isClassTargeted(),

      // Author
      createdById: this.createdById,
      authorName: this.getAuthorName(),
      authorEmail: this.getAuthorEmail(),

      // Scheduling
      publishAt: this.publishAt,
      expiresAt: this.expiresAt,

      // Content
      attachmentUrl: this.attachmentUrl,
      hasAttachment: this.hasAttachment(),

      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,

      // Relations
      createdBy: this.createdBy,
      targetClass: this.targetClass,
    };
  }
  toStaffJSON() {
    return {
      id: this.id,
      title: this.title,
      body: this.body,
      preview: this.getPreview(),

      scope: this.scope,
      scopeLabel: this.getScopeLabel(),
      audience: this.audience,
      audienceLabel: this.getAudienceLabel(),
      targetClassName: this.getTargetClassName(),
      targetSummary: this.getTargetSummary(),

      authorName: this.getAuthorName(),

      publishAt: this.publishAt,
      expiresAt: this.expiresAt,

      attachmentUrl: this.attachmentUrl,
      hasAttachment: this.hasAttachment(),

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      body: this.body,
      authorName: this.getAuthorName(),
      targetSummary: this.getTargetSummary(),
      attachmentUrl: this.attachmentUrl,
      hasAttachment: this.hasAttachment(),
      publishedAt: this.publishAt ?? this.createdAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
    };
  }
  toListJSON() {
    return {
      id: this.id,
      title: this.title,
      preview: this.getPreview(),
      audienceLabel: this.getAudienceLabel(),
      scopeLabel: this.getScopeLabel(),
      targetClassName: this.getTargetClassName(),
      authorName: this.getAuthorName(),
      hasAttachment: this.hasAttachment(),
      publishedAt: this.publishAt ?? this.createdAt,
    };
  }
  toJSON() {
    return this.toAdminJSON();
  }
}
