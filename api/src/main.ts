// Precisa ser o primeiro import: preenche process.env antes de qualquer
// provider (PrismaService, DiscogsService) ser instanciado pelo Nest. Sem
// isso, DATABASE_URL e DISCOGS_TOKEN chegam undefined em runtime — só a CLI
// do Prisma carrega o .env sozinha, via prisma.config.ts.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AuthMiddleware } from './auth/auth.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  // Precisa vir antes do AuthMiddleware: é o que preenche req.cookies.
  app.use(cookieParser());

  // Aplicado aqui, e não via configure(consumer), porque a sintaxe de
  // curinga para middleware mudou no Express 5. app.get() resolve a
  // injeção de dependência igual e funciona em qualquer versão.
  const auth = app.get(AuthMiddleware);
  app.use(auth.use.bind(auth));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // descarta campos não declarados no DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  await app.listen(3000);
}
bootstrap();