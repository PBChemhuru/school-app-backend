import { Injectable } from '@nestjs/common';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { ParentEntity } from './entities/parent.entity';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { LinkStudentDto } from './dto/link-stundent.dto';

@Injectable()
export class ParentService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async remove(id: string): Promise<string> {
    await this.prisma.parent.delete({
      where: { id },
    });
    return `This action removes a #${id} parent`;
  }

  async findByUserId(userId: string): Promise<ParentEntity> {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return new ParentEntity(parent);
  }

  async getStudentParents(studentId: string) {
    return this.prisma.parentStudent.findMany({
      where: {
        studentId,
        approved: true,
      },
      include: {
        parent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });
  }

  async getParentStudents(parentId: string) {
    return this.prisma.parentStudent.findMany({
      where: {
        parentId,
        approved: true,
      },
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
            currentClass: true,
            academicYear: true,
          },
        },
      },
    });
  }

  async getParentWithChildren(parentId: string) {
    return this.prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        user: true,
        children: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                currentClass: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(): Promise<ParentEntity[]> {
    const parents = await this.prisma.parent.findMany({
      include: {
        user: true,
      },
    });

    return parents.map((p) => new ParentEntity(p));
  }

  async parentUpdate(
    id: string,
    dto: UpdateParentDto,
    userId: string,
  ): Promise<ParentEntity> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { parentProfile: true },
    });

    if (!currentUser) {
      throw new BadRequestException('User not found');
    }

    if (currentUser.role === Role.PARENT) {
      if (!currentUser.parentProfile) {
        throw new BadRequestException('Parent profile not found');
      }

      if (currentUser.parentProfile.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
    }

    // ADMIN can update any parent

    const parent = await this.prisma.parent.update({
      where: { id },
      data: dto,
    });

    return new ParentEntity(parent);
  }

  async adminUpdate(id: string, dto: UpdateParentDto) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) throw new NotFoundException('Parent not found');

    await this.prisma.parent.update({
      where: { id },
      data: {
        address: dto.address ?? parent.address,
      },
    });
  }

  async createParentProfile(
    userId: string,
    dto: CreateParentDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { parentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.parentProfile) {
      throw new BadRequestException('Parent already exists');
    }

    await this.prisma.parent.create({
      data: {
        userId: userId,
        address: dto.address,
      },
    });
  }

  async getParentPendingRequests(parentId: string) {
    const pending = await this.prisma.parentStudent.findMany({
      where: {
        parentId,
        approved: false,
      },
    });
    return pending.map((p) => ({
      studentId: p.studentId,
      approved: p.approved,
    }));
  }

  async getPendingRequests() {
    const pending = await this.prisma.parentStudent.findMany({
      where: {
        approved: false,
      },
    });
    return pending.map((p) => ({
      parentId: p.parentId,
      studentId: p.studentId,
      approved: p.approved,
      relationship: p.relationship,
    }));
  }
  async requestLinkByAdmission(
    parentId: string,
    linkStudentDto: LinkStudentDto,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { admissionNumber: linkStudentDto.admissionNumber },
    });

    if (!student) throw new NotFoundException('Student not found');

    if (student.enrollmentStatus !== 'ACTIVE') {
      throw new BadRequestException('This student is not currently active');
    }

    const existingLink = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId: student.id,
        },
      },
    });

    if (existingLink) {
      if (existingLink.approved) {
        throw new ConflictException('You are already linked to this student');
      }
      throw new ConflictException('A link request is already pending approval');
    }

    // Create parent-student link
    return this.prisma.parentStudent.create({
      data: {
        parentId,
        studentId: student.id,
        approved: false,
        relationship: linkStudentDto.relationship,
      },
    });
  }

  async requestLinkByStudentId(
    parentId: string,
    studentId: string,
    linkStudentDto: LinkStudentDto,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) throw new NotFoundException('Student not found');

    if (student.enrollmentStatus !== 'ACTIVE') {
      throw new BadRequestException('This student is not currently active');
    }

    const existingLink = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId: student.id,
        },
      },
    });

    if (existingLink) {
      if (existingLink.approved) {
        throw new ConflictException('You are already linked to this student');
      }
      throw new ConflictException('A link request is already pending approval');
    }

    // Create parent-student link
    return this.prisma.parentStudent.create({
      data: {
        parentId,
        studentId: student.id,
        approved: false,
        relationship: linkStudentDto.relationship,
      },
    });
  }

  async approveLinkRequest(linkId: string) {
    const linkRequest = await this.prisma.parentStudent.findUnique({
      where: {
        id: linkId,
      },
    });
    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }
    return this.prisma.parentStudent.update({
      where: {
        id: linkId,
      },
      data: {
        approved: true,
      },
    });
  }

  async rejectLink(linkId: string) {
    const linkRequest = await this.prisma.parentStudent.findUnique({
      where: {
        id: linkId,
      },
    });
    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }
    return this.prisma.parentStudent.update({
      where: {
        id: linkId,
      },
      data: {
        approved: false,
      },
    });
  }

  async removeLink(linkId: string) {
    const linkRequest = await this.prisma.parentStudent.findUnique({
      where: {
        id: linkId,
      },
    });
    if (!linkRequest) {
      throw new NotFoundException('Link request not found');
    }
    return this.prisma.parentStudent.delete({
      where: {
        id: linkId,
      },
    });
  }

  async removeAllParentLinks(parentId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }
    return this.prisma.parentStudent.deleteMany({
      where: { parentId },
    });
  }

  async removeAllStudentLinks(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return this.prisma.parentStudent.deleteMany({
      where: { studentId },
    });
  }
}
