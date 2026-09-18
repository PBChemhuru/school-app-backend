import { PartialType } from '@nestjs/swagger';
import { CreateActivityMemembershipDto } from './create-activity-memembership.dto';

export class UpdateActivityMemembershipDto extends PartialType(CreateActivityMemembershipDto) {}
