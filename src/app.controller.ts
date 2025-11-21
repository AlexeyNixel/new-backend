import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    @InjectDataSource('targetDB')
    private readonly targetDB: DataSource,

    private prisma: PrismaService,
    private readonly appService: AppService,
  ) {}

  @Get()
  async getHello() {
    const departments = await this.sourceDB.query('SELECT * FROM Department');

    for (const department of departments) {
      console.log(department.id);
      await this.prisma.department.create({
        data: {
          id: department.id,
          title: department.title,
          isDeleted: !!department.isDeleted,
          slug: department.slug,
          createdAt: department.createdAt,
        },
      });
    }
  }
}
