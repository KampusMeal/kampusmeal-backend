import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Buat instance aplikasi NestJS
  const app = await NestFactory.create(AppModule);

  // Set global prefix untuk semua endpoint
  // Semua endpoint akan diawali dengan /api/v1
  // Contoh: /auth/login menjadi /api/v1/auth/login
  app.setGlobalPrefix('api/v1');

  // Gunakan global exception filter
  // Filter ini akan menangkap semua error dan format response-nya
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS (Cross-Origin Resource Sharing)
  // Ini penting kalau frontend dan backend beda domain
  // Enable CORS - untuk web dev dan mobile
  app.enableCors({
    origin: true, // Terima semua origin
    credentials: true, // Izinkan cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Jalankan server di port yang ditentukan
  const port = process.env.PORT ?? 8002;
  await app.listen(port);

  console.log(`Server running on http://localhost:${port}`);
  console.log(`API endpoint: http://localhost:${port}/api/v1`);
}

void bootstrap();
