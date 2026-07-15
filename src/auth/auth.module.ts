import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Правильный импорт
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1d',
        },
      }),
      inject: [ConfigService], // Правильное внедрение
    }),
  ],
  providers: [AuthService, JwtStrategy, UserService, PrismaService],
  controllers: [AuthController],
})
export class AuthModule {}
