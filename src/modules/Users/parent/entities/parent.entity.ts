import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '../../user/entities/user.entity';

export class ParentEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  address?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    required: false,
    type: () => UserEntity,
  })
  user?: UserEntity | null;

  constructor(partial: Partial<ParentEntity>) {
    Object.assign(this, partial);
  }
}
