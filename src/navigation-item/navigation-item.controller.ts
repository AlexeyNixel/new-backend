import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { NavigationItemService } from './navigation-item.service';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { BatchUpdateNavigationItemDto } from './dto/update-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audited } from '../common/decorators/audited.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Controller('navigation-item')
export class NavigationItemController {
  constructor(private readonly navigationItemService: NavigationItemService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('NavigationItem')
  @Post()
  create(@Body() createNavigationItemDto: CreateNavigationItemDto) {
    return this.navigationItemService.create(createNavigationItemDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('batch-update')
  updateOrderBatch(@Body() batchUpdateDto: BatchUpdateNavigationItemDto) {
    return this.navigationItemService.updateOrderBatch(batchUpdateDto.data);
  }

  @Get('updateTo')
  updateTo() {
    return this.navigationItemService.updateTo();
  }

  @Get('/untree')
  findAllWithoutTree() {
    return this.navigationItemService.findAllWithoutTree();
  }

  @Get()
  findAll() {
    return this.navigationItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.navigationItemService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('NavigationItem')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNavigationItemDto: UpdateNavigationItemDto,
  ) {
    return this.navigationItemService.update(id, updateNavigationItemDto);
  }
}
