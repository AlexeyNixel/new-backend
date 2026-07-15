import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Get,
  UseGuards,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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

  @Post('upload/exhibition')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZip(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadExhibition(file);
  }
}
