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
}
