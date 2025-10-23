// src/common/services/response.service.ts
import { Injectable } from '@nestjs/common';
import { Meta, ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseService {
  success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    const meta: Meta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date(),
    };
  }

  error(message: string): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      timestamp: new Date(),
    };
  }
}
