import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MainSliderService } from './main-slider.service';
import { CreateMainSliderDto } from './dto/create-main-slider.dto';
import { UpdateMainSliderDto } from './dto/update-main-slider.dto';

@Controller('main-slider')
export class MainSliderController {
  constructor(private readonly mainSliderService: MainSliderService) {}

  @Post()
  create(@Body() createMainSliderDto: CreateMainSliderDto) {
    return this.mainSliderService.create(createMainSliderDto);
  }

  @Get()
  findAll() {
    return this.mainSliderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mainSliderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMainSliderDto: UpdateMainSliderDto) {
    return this.mainSliderService.update(+id, updateMainSliderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mainSliderService.remove(+id);
  }
}
