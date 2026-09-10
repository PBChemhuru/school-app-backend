import { Module } from '@nestjs/common';
import { SchoolclassService } from './schoolclass.service';
import { SchoolclassController } from './schoolclass.controller';

@Module({
  controllers: [SchoolclassController],
  providers: [SchoolclassService],
})
export class SchoolclassModule {}
