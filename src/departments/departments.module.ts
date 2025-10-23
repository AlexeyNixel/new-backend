import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { PrismaService } from '../prisma.service';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService, ResponseService],
})
export class DepartmentsModule {}
