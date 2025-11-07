import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NavigationItemService } from './navigation-item.service';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';

@Controller('navigation-item')
export class NavigationItemController {
  constructor(private readonly navigationItemService: NavigationItemService) {}

  @Post()
  create(@Body() createNavigationItemDto: CreateNavigationItemDto) {
    return this.navigationItemService.create(createNavigationItemDto);
  }

  @Get()
  findAll() {
    return this.navigationItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.navigationItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNavigationItemDto: UpdateNavigationItemDto) {
    return this.navigationItemService.update(+id, updateNavigationItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.navigationItemService.remove(+id);
  }
}
