import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentEntity } from './entities/student.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { EnrollmentStatus, UserStatus } from '@prisma/client';
import { CreateStudentAdminDto } from 'src/modules/Users/student/dto/create-student-admin.dto';
import { UpdateStudentAdminDto } from './dto/update-admin.dto';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class StudentService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async remove(id: string): Promise<string> {
    await this.prisma.student.delete({
      where: { id },
    });
    return `This action removes a #${id} student`;
  }

  async findByUserId(userId: string): Promise<StudentEntity> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return new StudentEntity(student);
  }

  async findByStudentId(id: string): Promise<StudentEntity> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return new StudentEntity(student);
  }

  async findAll(): Promise<StudentEntity[]> {
    const students = await this.prisma.student.findMany({
      include: {
        user: true,
      },
    });

    return students.map((s) => new StudentEntity(s));
  }

  async studentUpdate(
    id: string,
    dto: UpdateStudentDto,
    userId: string,
  ): Promise<StudentEntity> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!currentUser || !currentUser.studentProfile) {
      throw new BadRequestException('You are not a student');
    }

    if (currentUser.studentProfile.id !== id) {
      throw new BadRequestException(
        'You cannot update another student’s details',
      );
    }

    const student = await this.prisma.student.update({
      where: { id },
      data: dto,
    });

    return new StudentEntity(student);
  }

  async adminUpdate(id: string, dto: UpdateStudentAdminDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.student.update({
      where: { id },
      data: {
        admissionNumber: dto.admissionNumber,
        enrollmentStatus: dto.enrollmentStatus,
        currentClassId: dto.currentClassId,
        academicYearId: dto.academicYearId,
        address: dto.address,
        medicalNotes: dto.medicalNotes,
      },
    });
  }

  async createStudentProfile(
    userId: string,
    dto: CreateStudentAdminDto,
  ): Promise<StudentEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.studentProfile) {
      throw new BadRequestException('Student already exists');
    }

    const admissionNumber = await this.generateAdmissionNumber();

    const student = await this.prisma.student.create({
      data: {
        userId,
        admissionNumber,

        enrollmentStatus: dto.enrollmentStatus ?? EnrollmentStatus.ACTIVE,

        // TODO:
        // Uncomment when SchoolClass module exists
        // currentClassId: dto.currentClassId,

        // TODO:
        // Uncomment when AcademicYear module exists
        // academicYearId: dto.academicYearId,
      },
      include: {
        user: true,
      },
    });

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: UserStatus.ACTIVE,
        profileComplete: true,
      },
    });

    return new StudentEntity(student);
  }

  private async generateAdmissionNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const lastStudent = await this.prisma.student.findFirst({
      where: {
        admissionNumber: {
          startsWith: `SMS-${year}-`,
        },
      },
      orderBy: {
        admissionNumber: 'desc',
      },
      select: {
        admissionNumber: true,
      },
    });

    if (!lastStudent) {
      return `SMS-${year}-0001`;
    }

    const lastSequence = Number(lastStudent.admissionNumber.split('-')[2]);

    const nextSequence = lastSequence + 1;

    return `SMS-${year}-${String(nextSequence).padStart(4, '0')}`;
  }
}
