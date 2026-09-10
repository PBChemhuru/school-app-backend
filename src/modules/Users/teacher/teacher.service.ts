import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeacherEntity } from './entities/teacher.entity';
import { Role, Teacher } from '@prisma/client';
import { CreateTeacherDto } from './dto/create-teacher-admin.dto';
import { EmploymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTeacherDto: CreateTeacherDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingTeacher = await this.prisma.teacher.findUnique({
      where: {
        userId,
      },
    });

    if (existingTeacher) {
      throw new ConflictException(
        'Teacher profile already exists for this user',
      );
    }

    const employeeNumber = await this.generateEmployeeNumber();

    const qualifications = createTeacherDto.qualifications || [];

    const teacher = await this.prisma.teacher.create({
      data: {
        employeeNumber: employeeNumber,
        qualifications,
        bio: createTeacherDto.bio || null,
        hireDate: createTeacherDto.hireDate
          ? new Date(createTeacherDto.hireDate)
          : null,
        employmentStatus:
          createTeacherDto.employmentStatus || EmploymentStatus.ACTIVE,

        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        user: true,
      },
    });

    return new TeacherEntity(teacher);
  }

  async findAll(): Promise<TeacherEntity[]> {
    const teachers = await this.prisma.teacher.findMany({
      include: {
        user: true,
        classes: {
          include: {
            academicYear: true,
          },
        },
        subjects: {
          include: {
            subject: true,
            schoolClass: true,
            term: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return teachers.map((teacher) => new TeacherEntity(teacher));
  }

  async findOne(id: string): Promise<TeacherEntity> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
        classes: {
          include: {
            academicYear: true,
          },
        },
        subjects: {
          include: {
            subject: true,
            schoolClass: true,
            term: true,
          },
        },
        timetableEntries: {
          include: {
            schoolClass: true,
            curriculum: {
              include: {
                subject: true,
              },
            },
          },
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        activities: true,
        results: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            subject: true,
            term: true,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return new TeacherEntity(teacher);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<TeacherEntity> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { employeeNumber },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return new TeacherEntity(teacher);
  }

  async update(
    id: string,
    updateTeacherDto: UpdateTeacherDto,
    userId: string,
  ): Promise<TeacherEntity> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true },
    });

    if (!currentUser) {
      throw new BadRequestException('User not found');
    }

    // Check permissions
    if (currentUser.role === Role.TEACHER) {
      if (!currentUser.teacherProfile) {
        throw new BadRequestException('Teacher profile not found');
      }

      if (currentUser.teacherProfile.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
    }

    // Find teacher
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Build update object
    const data: Prisma.TeacherUpdateInput = {};

    // Qualifications
    if (updateTeacherDto.qualifications !== undefined) {
      data.qualifications =
        updateTeacherDto.qualifications === null
          ? Prisma.JsonNull
          : updateTeacherDto.qualifications;
    }

    // Bio
    if (updateTeacherDto.bio !== undefined) {
      data.bio = updateTeacherDto.bio;
    }

    // Employment status
    if (updateTeacherDto.employmentStatus !== undefined) {
      data.employmentStatus = updateTeacherDto.employmentStatus;
    }

    // Update teacher
    const updated = await this.prisma.teacher.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });

    // If employment status is updated to TERMINATED,
    // suspend the associated user
    if (updateTeacherDto.employmentStatus === EmploymentStatus.TERMINATED) {
      await this.prisma.user.update({
        where: { id: teacher.userId },
        data: {
          status: 'SUSPENDED',
        },
      });
    }

    return new TeacherEntity(updated);
  }
  async remove(id: string): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Remove teacher from classes they're teaching
    await this.prisma.schoolClass.updateMany({
      where: { classTeacherId: id },
      data: { classTeacherId: null },
    });

    // Remove teacher from curriculum
    await this.prisma.curriculum.deleteMany({
      where: { teacherId: id },
    });

    // Remove teacher from timetable
    await this.prisma.timetable.deleteMany({
      where: { teacherId: id },
    });

    // Delete teacher profile
    await this.prisma.teacher.delete({
      where: { id },
    });

    // Update user role back to default
    await this.prisma.user.update({
      where: { id: teacher.userId },
      data: { role: Role.PARENT }, // Or whatever default role
    });
  }
  async searchTeachers(searchTerm: string, limit: number = 10) {
    return this.prisma.teacher.findMany({
      where: {
        OR: [
          { employeeNumber: { contains: searchTerm, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
          { bio: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
          },
        },
        classes: {
          include: {
            academicYear: true,
          },
        },
        subjects: {
          include: {
            subject: true,
            schoolClass: true,
          },
        },
      },
      take: limit,
    });
  }

  async generateEmployeeNumber(): Promise<string> {
    let employeeNumber: string;
    let exists: Teacher | null;

    do {
      const number = Math.floor(100000 + Math.random() * 900000);
      employeeNumber = `TCH-${number}`;

      exists = await this.prisma.teacher.findUnique({
        where: {
          employeeNumber,
        },
      });
    } while (exists);

    return employeeNumber;
  }
}
