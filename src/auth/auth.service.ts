import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.userService.findByUsername(username);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.userService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const { password: _, ...result } = user;
    return result;
  }

  login(user: { username: string; id: string; name?: string }) {
    const payload = {
      username: user.username,
      sub: user.id,
      name: user.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    };
  }

  async register(registerDto: {
    username: string;
    password: string;
    name?: string;
  }) {
    const user = await this.userService.create(registerDto);
    return this.login({
      id: user.id,
      username: user.username,
      name: registerDto.name || undefined,
    });
  }

  async validateToken(payload: any) {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return user;
  }
}
