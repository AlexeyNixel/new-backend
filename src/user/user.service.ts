import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { canManageUsers } from './user-managers';
import { UpdateUserDto } from './dto/update-user.dto';

const USERNAME_PATTERN = /^[a-z0-9._-]{3,50}$/;
const MIN_PASSWORD_LENGTH = 8;

/** Что отдаём наружу — без хеша пароля */
const PUBLIC_FIELDS = {
  id: true,
  username: true,
  name: true,
  createdAt: true,
  isBlocked: true,
  lastLoginAt: true,
} as const;

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

  async findAll() {
    const users = await this.prismaService.user.findMany({
      select: { ...PUBLIC_FIELDS, _count: { select: { auditLogs: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return users.map(({ _count, ...user }) => ({
      ...user,
      changes: _count.auditLogs,
      canManageUsers: canManageUsers(user.username),
    }));
  }

  async create(userData: {
    username: string;
    password: string;
    name?: string | null;
  }) {
    const username = userData.username?.trim().toLowerCase() ?? '';
    if (!USERNAME_PATTERN.test(username)) {
      throw new BadRequestException(
        'Логин: 3–50 символов, латинские буквы, цифры, точка, дефис, подчёркивание',
      );
    }
    this.assertPassword(userData.password);

    const existingUser = await this.findByUsername(username);
    if (existingUser) {
      throw new ConflictException('Такой логин уже занят');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return this.prismaService.user.create({
      data: {
        username,
        password: hashedPassword,
        name: userData.name?.trim() || null,
      },
      select: PUBLIC_FIELDS,
    });
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (dto.isBlocked) {
      // Иначе можно остаться без единого администратора
      if (id === actorId) {
        throw new ForbiddenException('Нельзя заблокировать самого себя');
      }
      if (canManageUsers(user.username)) {
        throw new ForbiddenException('Администратора заблокировать нельзя');
      }
    }
    if (dto.password !== undefined) {
      this.assertPassword(dto.password);
    }

    return this.prismaService.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name?.trim() || null }),
        ...(dto.isBlocked !== undefined && { isBlocked: !!dto.isBlocked }),
        ...(dto.password !== undefined && {
          password: await bcrypt.hash(dto.password, 10),
        }),
      },
      select: PUBLIC_FIELDS,
    });
  }

  touchLastLogin(id: string) {
    return this.prismaService.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async validatePassword(plainPassword: string, hashedPassword: string) {
    if (!hashedPassword) {
      return false;
    }

    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private assertPassword(password: unknown) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
      );
    }
  }
}
