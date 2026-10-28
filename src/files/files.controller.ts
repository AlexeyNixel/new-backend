import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Get,
  UseGuards,
  Param,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { ExhibitionsService } from './exhibitions.service';
import type { UpdateExhibitionDto } from './exhibitions.service';
import { MediaService } from './media.service';
import type { MediaQuery } from './media.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Audited } from '../common/decorators/audited.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ADMIN_ONLY, Section } from '../auth/sections';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly exhibitionsService: ExhibitionsService,
    private readonly mediaService: MediaService,
  ) {}

  // ---------- Виртуальные выставки ----------

  /** Публичный: сайт показывает только не скрытые */
  @Get('exhibitions')
  findAllExhibitions(@Query() paginationQuery: PaginationQueryDto) {
    return this.exhibitionsService.findAll(paginationQuery);
  }

  /** Админка: все выставки, включая скрытые */
  @Section('exhibitions')
  @UseGuards(JwtAuthGuard)
  @Get('exhibitions/admin')
  findAllExhibitionsAdmin(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('status') status?: 'visible' | 'hidden',
  ) {
    return this.exhibitionsService.findAllAdmin(paginationQuery, status);
  }

  @Get('exhibitions/:id')
  findOneExhibition(@Param('id') id: string) {
    return this.exhibitionsService.findOne(id);
  }

  @Section('exhibitions')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('Exhibition')
  @Patch('exhibitions/:id')
  updateExhibition(@Param('id') id: string, @Body() dto: UpdateExhibitionDto) {
    return this.exhibitionsService.update(id, dto);
  }

  @Section('exhibitions')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cover'), AuditInterceptor)
  @Audited('Exhibition')
  @Post('exhibitions/:id/cover')
  replaceExhibitionCover(
    @Param('id') id: string,
    @UploadedFile() cover: Express.Multer.File | undefined,
  ) {
    return this.exhibitionsService.replaceCover(id, cover);
  }

  @Section('exhibitions')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
    AuditInterceptor,
  )
  @Audited('Exhibition')
  @Post('upload/exhibition')
  uploadExhibition(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @Body('title') title?: string,
  ) {
    return this.exhibitionsService.upload(
      files?.file?.[0],
      files?.cover?.[0],
      title,
    );
  }

  // ---------- Медиатека ----------

  @Section('media')
  @UseGuards(JwtAuthGuard)
  @Get('media')
  findAllMedia(@Query() query: MediaQuery) {
    return this.mediaService.findAll(query);
  }

  @Section('media')
  @UseGuards(JwtAuthGuard)
  @Get('media/:id/usage')
  mediaUsage(@Param('id') id: string) {
    return this.mediaService.usage(id);
  }

  @Section('media')
  @UseGuards(JwtAuthGuard)
  @Delete('media/:id')
  removeMedia(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }

  // ---------- Загрузка ----------

  @Section(ADMIN_ONLY)
  @UseGuards(JwtAuthGuard)
  @Get('migrate')
  async migrate() {
    return this.filesService.migrate();
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: { quality?: string; maxWidth?: string },
  ) {
    const quality = body.quality ? parseInt(body.quality) : 80;
    const maxWidth = body.maxWidth ? parseInt(body.maxWidth) : 1920;
    return this.filesService.uploadImage(file, {
      quality,
      maxWidth,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload/document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadDocument(file);
  }
}
