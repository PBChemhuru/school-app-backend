import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserEntity } from '../Users/user/entities/user.entity';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiBearerAuth()
  @Get('/pendingUser')
  getPendingUser(): Promise<UserEntity[]> {
    return this.adminService.getPendingUsers();
  }

  @ApiBearerAuth()
  @Patch('users/:id/approve')
  activateUser(@Param('id') userId: string) {
    return this.adminService.approveUser(userId);
  }

  @Patch('users/:id/reject')
  rejectUser(@Param('id') id: string) {
    return this.adminService.rejectUser(id);
  }
}
