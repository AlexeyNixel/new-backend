import { Module } from '@nestjs/common';
import { NavigationItemService } from './navigation-item.service';
import { NavigationItemController } from './navigation-item.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [NavigationItemController],
  providers: [NavigationItemService, PrismaService],
})
export class NavigationItemModule {}
