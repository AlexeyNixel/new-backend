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
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('migrate')
  async migrate() {
    return this.filesService.migrateTag();
  }

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
    console.log(body);
    const quality = body.quality ? parseInt(body.quality) : 80;
    const maxWidth = body.maxWidth ? parseInt(body.maxWidth) : 1920;
    return this.filesService.uploadImage(file, {
      quality,
      maxWidth,
    });
  }
}
