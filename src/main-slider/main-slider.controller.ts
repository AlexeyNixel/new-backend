import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MainSliderService } from './main-slider.service';
import { CreateMainSliderDto } from './dto/create-main-slider.dto';
import { UpdateMainSliderDto } from './dto/update-main-slider.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('main-slider')
export class MainSliderController {
  constructor(private readonly mainSliderService: MainSliderService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/migrate')
  migrate() {
    return this.mainSliderService.migrate();
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMainSliderDto: UpdateMainSliderDto,
  ) {
    return this.mainSliderService.update(id, updateMainSliderDto);
  }
}
