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
import { MapPointService } from './map-point.service';
import { CreateMapPointDto } from './dto/create-map-point.dto';
import { UpdateMapPointDto } from './dto/update-map-point.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('map-point')
export class MapPointController {
  constructor(private readonly mapPointService: MapPointService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createMapPointDto: CreateMapPointDto) {
    return this.mapPointService.create(createMapPointDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.mapPointService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mapPointService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMapPointDto: UpdateMapPointDto,
  ) {
    return this.mapPointService.update(id, updateMapPointDto);
  }
}
