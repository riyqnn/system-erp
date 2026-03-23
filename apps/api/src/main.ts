import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parser
  app.use(cookieParser());

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    credentials: true,
  });

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Allow implicit type conversion
      },
    })
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  await app.listen(3001);
  console.log('API is running on http://localhost:3001/api');
}
bootstrap();
