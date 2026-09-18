import { Injectable } from '@nestjs/common';
import { CreateActivityMemembershipDto } from './dto/create-activity-memembership.dto';
import { UpdateActivityMemembershipDto } from './dto/update-activity-memembership.dto';

@Injectable()
export class ActivityMemembershipService {
  create(createActivityMemembershipDto: CreateActivityMemembershipDto) {
    return 'This action adds a new activityMemembership';
  }

  findAll() {
    return `This action returns all activityMemembership`;
  }

  findOne(id: number) {
    return `This action returns a #${id} activityMemembership`;
  }

  update(id: number, updateActivityMemembershipDto: UpdateActivityMemembershipDto) {
    return `This action updates a #${id} activityMemembership`;
  }

  remove(id: number) {
    return `This action removes a #${id} activityMemembership`;
  }
}
