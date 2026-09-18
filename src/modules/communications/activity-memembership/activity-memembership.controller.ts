import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ActivityMemembershipService } from './activity-memembership.service';
import { CreateActivityMemembershipDto } from './dto/create-activity-memembership.dto';
import { UpdateActivityMemembershipDto } from './dto/update-activity-memembership.dto';

@Controller('activity-memembership')
export class ActivityMemembershipController {
  constructor(private readonly activityMemembershipService: ActivityMemembershipService) {}

  @Post()
  create(@Body() createActivityMemembershipDto: CreateActivityMemembershipDto) {
    return this.activityMemembershipService.create(createActivityMemembershipDto);
  }

  @Get()
  findAll() {
    return this.activityMemembershipService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityMemembershipService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivityMemembershipDto: UpdateActivityMemembershipDto) {
    return this.activityMemembershipService.update(+id, updateActivityMemembershipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activityMemembershipService.remove(+id);
  }
}
