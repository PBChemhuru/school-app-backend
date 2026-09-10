import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: {
        status: UserStatus.PENDING,
      },
    });
  }

  async approveUser(userId: string) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: UserStatus.ACTIVE,
      },
    });
  }

  async rejectUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.REJECTED,
      },
    });
  }

  async suspendUser(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.SUSPENDED,
      },
    });
  }

  async approveLink(linkId: string) {
    const link = await this.prisma.parentStudent.update({
      where: { id: linkId },
      data: { approved: true },
      include: {
        parent: {
          include: {
            user: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    // TODO: Send notifications
    return link;
  }

  // Remove a specific parent-student link
  async removeLink(linkId: string) {
    return this.prisma.parentStudent.delete({
      where: { id: linkId },
    });
  }

  // Remove all links for a parent (e.g., when parent leaves)
  async removeAllParentLinks(parentId: string) {
    return this.prisma.parentStudent.deleteMany({
      where: { parentId },
    });
  }

  // Remove all links for a student (e.g., when student graduates)
  async removeAllStudentLinks(studentId: string) {
    return this.prisma.parentStudent.deleteMany({
      where: { studentId },
    });
  }

  // Check if a parent is linked to a student
  async isParentLinked(parentId: string, studentId: string): Promise<boolean> {
    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });
    return link?.approved || false;
  }

  // Get all pending link requests (admin dashboard)
  async getPendingRequests() {
    return this.prisma.parentStudent.findMany({
      where: { approved: false },
      include: {
        parent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  // Get all pending requests for a specific parent
  async getParentPendingRequests(parentId: string) {
    return this.prisma.parentStudent.findMany({
      where: {
        parentId,
        approved: false,
      },
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
          },
        },
      },
    });
  }
}
