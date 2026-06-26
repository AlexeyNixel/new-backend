import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  if (process.env.NODE_ENV !== 'production') {
    const extraOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : [];

    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://localhost:3333',
        'http://192.168.0.243:3000',
        ...extraOrigins,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  }
  await app.listen(process.env.PORT ?? 3333);
}

bootstrap();
