import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RequestWithUser } from 'src/modules/auth/types/request-with-user';
import { Role } from '@prisma/client';
import { ApiQuery } from '@nestjs/swagger';
import { FilterEventDto } from './dto/filter-event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Get()
  async findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.eventService.findOne(id, req.user.role as Role);
  }

  @Get('upcoming')
  async findUpcoming(@Req() req: RequestWithUser) {
    return this.eventService.findUpcoming(req.user.role as Role);
  }

  @Get('ongoing')
  async findOngoing(@Req() req: RequestWithUser) {
    return this.eventService.findOngoing(req.user.role as Role);
  }

  @Get('past')
  async findPast(@Req() req: RequestWithUser) {
    return this.eventService.findPast(req.user.role as Role);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Get('search')
  @ApiQuery({ name: 'q', description: 'Search term' })
  async search(@Query('q') searchTerm: string, @Req() req: RequestWithUser) {
    return this.eventService.search(searchTerm, req.user.role as Role);
  }

  @Get('filter')
  async filter(
    @Query() filterDto: FilterEventDto,
    @Req() req: RequestWithUser,
  ) {
    const events = await this.eventService.filter(
      filterDto,
      req.user.role as Role,
    );
    return events;
  }

  @Get('calendar')
  async getCalendar(
    @Req() req: RequestWithUser,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const events = await this.eventService.getCalendar(
      fromDate,
      toDate,
      req.user.role as Role,
    );
    return events.map((e) => e.toCalendarJSON());
  }

  @Get('stats')
  async getStats(@Req() req: RequestWithUser) {
    return this.eventService.getStats(req.user.role as Role);
  }
}
