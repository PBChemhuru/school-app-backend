import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { LinkStudentDto } from './dto/link-student.dto';
import { JwtAuthGuard } from 'src/modules/auth/gaurds/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/gaurds/roles.guard';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
@ApiTags('Parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parent')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all parents (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all parents' })
  async findAll() {
    return this.parentService.findAll();
  }

  @Get('me')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get current parent profile' })
  @ApiResponse({ status: 200, description: 'Returns current parent profile' })
  async getMyProfile(@Req() req: RequestWithUser) {
    const userId = req.user['sub'];
    return this.parentService.findByUserId(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get parent by ID (Admin/Teacher only)' })
  @ApiParam({ name: 'id', description: 'Parent ID' })
  @ApiResponse({ status: 200, description: 'Returns parent details' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async findOne(@Param('id') id: string) {
    const parent = await this.parentService.findByUserId(id);
    return parent;
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get parent by user ID (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns parent details' })
  async findByUserId(@Param('userId') userId: string) {
    return this.parentService.findByUserId(userId);
  }

  @Get('me/students')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get all students linked to current parent' })
  @ApiResponse({ status: 200, description: 'Returns list of linked students' })
  async getMyStudents(@Req() req: RequestWithUser) {
    const parentId = await this.getParentIdFromUser(req.user['sub']);
    return this.parentService.getParentStudents(parentId);
  }

  @Get('me/children')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get parent with all children details' })
  @ApiResponse({
    status: 200,
    description: 'Returns parent with children details',
  })
  async getMyChildren(@Req() req: RequestWithUser) {
    const parentId = await this.getParentIdFromUser(req.user['sub']);
    return this.parentService.getParentWithChildren(parentId);
  }

  @Get('me/pending-requests')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get pending link requests for current parent' })
  @ApiResponse({ status: 200, description: 'Returns pending link requests' })
  async getMyPendingRequests(@Req() req: RequestWithUser) {
    const parentId = await this.getParentIdFromUser(req.user['sub']);
    return this.parentService.getParentPendingRequests(parentId);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get all parents for a student (Admin/Teacher only)',
  })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Returns list of parents' })
  async getStudentParents(@Param('studentId') studentId: string) {
    return this.parentService.getStudentParents(studentId);
  }

  @Get('pending-requests')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all pending link requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all pending requests' })
  async getPendingRequests() {
    return this.parentService.getPendingRequests();
  }
  // ==================== POST ENDPOINTS ====================

  @Post('me/profile')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Create parent profile for current user' })
  @ApiResponse({
    status: 201,
    description: 'Parent profile created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createMyProfile(
    @Req() req: RequestWithUser,
    @Body() createParentDto: CreateParentDto,
  ) {
    const userId = req.user['sub'];
    await this.parentService.createParentProfile(userId, createParentDto);
    return { message: 'Parent profile created successfully' };
  }

  @Post('link-request')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Request to link parent to a student' })
  @ApiResponse({
    status: 201,
    description: 'Link request created successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Link already exists' })
  async requestLink(
    @Req() req: RequestWithUser,
    @Body() linkStudentDto: LinkStudentDto,
  ) {
    const parentId = await this.getParentIdFromUser(req.user['sub']);
    return this.parentService.requestLinkByAdmission(parentId, linkStudentDto);
  }

  @Post('link-request/by-id')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: 'Request to link parent to a student by student ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Link request created successfully',
  })
  async requestLinkById(
    @Req() req: RequestWithUser,
    @Body() body: { studentId: string; relationship?: string },
    linkStudentDto: LinkStudentDto,
  ) {
    const parentId = await this.getParentIdFromUser(req.user['sub']);
    return this.parentService.requestLinkByStudentId(
      parentId,
      body.studentId,
      linkStudentDto,
    );
  }

  @Post('approve/:linkId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Approve a parent-student link request (Admin only)',
  })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 200, description: 'Link approved successfully' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async approveLink(@Param('linkId') linkId: string) {
    return this.parentService.approveLinkRequest(linkId);
  }

  @Post('reject/:linkId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reject a parent-student link request (Admin only)',
  })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 200, description: 'Link rejected successfully' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async rejectLink(@Param('linkId') linkId: string) {
    return this.parentService.rejectLink(linkId);
  }

  // ==================== PATCH ENDPOINTS ====================

  @Patch('me')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Update current parent profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateMyProfile(
    @Req() req: RequestWithUser,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    const userId = req.user['sub'];
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }
    return this.parentService.parentUpdate(parent.id, updateParentDto, userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update any parent profile (Admin only)' })
  @ApiParam({ name: 'id', description: 'Parent ID' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async updateParent(
    @Param('id') id: string,
    @Body() updateParentDto: UpdateParentDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user['sub'];
    return this.parentService.parentUpdate(id, updateParentDto, userId);
  }

  // ==================== DELETE ENDPOINTS ====================

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete parent (Admin only)' })
  @ApiParam({ name: 'id', description: 'Parent ID' })
  @ApiResponse({ status: 204, description: 'Parent deleted successfully' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async remove(@Param('id') id: string) {
    await this.parentService.remove(id);
  }

  @Delete('link/:linkId')
  @Roles(Role.ADMIN, Role.PARENT)
  @ApiOperation({ summary: 'Remove a parent-student link' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 200, description: 'Link removed successfully' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async removeLink(
    @Param('linkId') linkId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user['sub'];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { parentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Check if user is admin or the parent owning the link
    if (user.role !== Role.ADMIN) {
      const link = await this.prisma.parentStudent.findUnique({
        where: { id: linkId },
      });
      if (!link || link.parentId !== user.parentProfile?.id) {
        throw new ForbiddenException('You can only remove your own links');
      }
    }

    return this.parentService.removeLink(linkId);
  }

  @Delete('parent/:parentId/all-links')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove all links for a parent (Admin only)' })
  @ApiParam({ name: 'parentId', description: 'Parent ID' })
  @ApiResponse({ status: 200, description: 'All links removed successfully' })
  async removeAllParentLinks(@Param('parentId') parentId: string) {
    return this.parentService.removeAllParentLinks(parentId);
  }

  @Delete('student/:studentId/all-links')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove all links for a student (Admin only)' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'All links removed successfully' })
  async removeAllStudentLinks(@Param('studentId') studentId: string) {
    return this.parentService.removeAllStudentLinks(studentId);
  }

  // ==================== HELPER METHODS ====================

  private async getParentIdFromUser(userId: string): Promise<string> {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }
    return parent.id;
  }

  // Inject Prisma for helper method
  private get prisma() {
    return this.parentService['prisma'];
  }
}
