import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { RegisterDTO } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDTO) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result: any = this.authService.login(
      {
        id: user.id,
        username: user.username,
        name: user.name || undefined,
      },
      res,
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      user: result.user,
      access_token: result.access_token,
    });
  }
}
