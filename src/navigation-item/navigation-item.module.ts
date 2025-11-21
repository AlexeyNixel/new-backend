import { Module } from '@nestjs/common';
import { NavigationItemService } from './navigation-item.service';
import { NavigationItemController } from './navigation-item.controller';

@Module({
  controllers: [NavigationItemController],
  providers: [NavigationItemService],
})
export class NavigationItemModule {}
