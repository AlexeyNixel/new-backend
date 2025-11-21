import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { MainSliderService } from './main-slider.service';
import { CreateMainSliderDto } from './dto/create-main-slider.dto';
import { UpdateMainSliderDto } from './dto/update-main-slider.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('main-slider')
export class MainSliderController {
  constructor(private readonly mainSliderService: MainSliderService) {}

  @Get('/migrate')
  migrate() {
    return this.mainSliderService.migrate();
  }

  @Post()
  create(@Body() createMainSliderDto: CreateMainSliderDto) {
    return this.mainSliderService.create(createMainSliderDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.mainSliderService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mainSliderService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMainSliderDto: UpdateMainSliderDto,
  ) {
    return this.mainSliderService.update(+id, updateMainSliderDto);
  }
}
