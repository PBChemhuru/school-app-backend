import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const AdminRole = () => Roles(Role.ADMIN);
export const TeacherRole = () => Roles(Role.TEACHER);
export const ParentRole = () => Roles(Role.PARENT);
export const StudentRole = () => Roles(Role.STUDENT);
