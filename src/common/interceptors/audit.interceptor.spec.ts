// AuditInterceptor использует AuditAction как значение (не только тип) —
// нужен реальный импорт generated/prisma, который не резолвится в jest.
// Подменяем оба модуля заглушками.
jest.mock(
  'generated/prisma',
  () => ({
    AuditAction: { CREATE: 'CREATE', UPDATE: 'UPDATE' },
  }),
  { virtual: true },
);
jest.mock('../../audit-log/audit-log.service', () => ({
  AuditLogService: class {},
}));

import { throwError, of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  const makeContext = (
    method: string,
    user: unknown,
    handler: () => void = function create() {},
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ method, user }),
      }),
    }) as unknown as ExecutionContext;

  const makeHandler = (response: unknown): CallHandler => ({
    handle: () => of(response),
  });

  it('пропускает поток без записи в лог, если нет @Audited metadata', (done) => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) };
    const auditLogService = { log: jest.fn() };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('POST', { id: 'user1' });

    interceptor
      .intercept(context, makeHandler({ id: 'post1' }))
      .subscribe(() => {
        expect(auditLogService.log).not.toHaveBeenCalled();
        done();
      });
  });

  it('пишет CREATE для POST-запроса с @Audited', (done) => {
    const reflector = { get: jest.fn().mockReturnValue('Post') };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('POST', { id: 'user1' });

    interceptor
      .intercept(context, makeHandler({ id: 'post1' }))
      .subscribe(() => {
        setImmediate(() => {
          expect(auditLogService.log).toHaveBeenCalledWith({
            entityType: 'Post',
            entityId: 'post1',
            action: 'CREATE',
            userId: 'user1',
          });
          done();
        });
      });
  });

  it('пишет UPDATE для PATCH-запроса с @Audited', (done) => {
    const reflector = { get: jest.fn().mockReturnValue('Post') };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('PATCH', { id: 'user1' });

    interceptor
      .intercept(context, makeHandler({ id: 'post1' }))
      .subscribe(() => {
        setImmediate(() => {
          expect(auditLogService.log).toHaveBeenCalledWith({
            entityType: 'Post',
            entityId: 'post1',
            action: 'UPDATE',
            userId: 'user1',
          });
          done();
        });
      });
  });

  it('userId = null, если request.user не установлен', (done) => {
    const reflector = { get: jest.fn().mockReturnValue('Post') };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('POST', undefined);

    interceptor
      .intercept(context, makeHandler({ id: 'post1' }))
      .subscribe(() => {
        setImmediate(() => {
          expect(auditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ userId: null }),
          );
          done();
        });
      });
  });

  it('не пишет лог, если в ответе нет id', (done) => {
    const reflector = { get: jest.fn().mockReturnValue('Post') };
    const auditLogService = { log: jest.fn() };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('POST', { id: 'user1' });

    interceptor
      .intercept(context, makeHandler({ message: 'slug занят' }))
      .subscribe(() => {
        expect(auditLogService.log).not.toHaveBeenCalled();
        done();
      });
  });

  it('не ломает поток, если запись в лог падает с ошибкой', (done) => {
    const reflector = { get: jest.fn().mockReturnValue('Post') };
    const auditLogService = {
      log: jest.fn().mockRejectedValue(new Error('db down')),
    };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('POST', { id: 'user1' });

    interceptor
      .intercept(context, makeHandler({ id: 'post1' }))
      .subscribe((response) => {
        expect(response).toEqual({ id: 'post1' });
        done();
      });
  });

  it('не вызывает лог, если основной хендлер бросил ошибку', (done) => {
    const reflector = { get: jest.fn().mockReturnValue('Post') };
    const auditLogService = { log: jest.fn() };
    const interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditLogService as never,
    );
    const context = makeContext('POST', { id: 'user1' });
    const failingHandler: CallHandler = {
      handle: () => throwError(() => new Error('validation failed')),
    };

    interceptor.intercept(context, failingHandler).subscribe({
      error: () => {
        expect(auditLogService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
