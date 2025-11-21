import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { ResponseService } from '../common/services/response.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, ResponseService, JwtService],
})
export class DepartmentsModule {}
