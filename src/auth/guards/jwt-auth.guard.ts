import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.headers.authorization) {
      const token = this.parseToken(request);
      if (token) {
        request.headers.authorization = `Bearer ${token}`;
      }
    }
    return super.canActivate(context);
  }

  private parseToken(request: any): string | null {
    return request.cookies?.token || request.cookies?.access_token || null;
  }
}
