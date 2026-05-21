import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,

    private prisma: PrismaService,
    private readonly appService: AppService,
  ) {}
}
