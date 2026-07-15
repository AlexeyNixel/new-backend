import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  create(@Body() createClubDto: CreateClubDto) {
    return this.clubsService.create(createClubDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.clubsService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClubDto: UpdateClubDto) {
    return this.clubsService.update(id, updateClubDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clubsService.remove(+id);
  }
}
