import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  findByUsername(username: string) {
    return this.prismaService.user.findUnique({
      where: {
        username: username,
      },
    });
  }

  findById(id: string) {
    return this.prismaService.user.findUnique({
      where: { id: id },
    });
  }

  async create(userData: {
    username: string;
    password: string;
    name?: string;
  }) {
    const existingUser = await this.findByUsername(userData.username);

    if (existingUser) {
      throw new ConflictException('Такой логин уже занят');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username: userData.username,
        password: hashedPassword,
        name: userData.name,
      },
    });

    const { password, ...result } = user;

    return result;
  }

  async validatePassword(plainPassword: string, hashedPassword: string) {
    if (!hashedPassword) {
      return false;
    }

    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
