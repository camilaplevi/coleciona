// Precisa ser o primeiro import: preenche process.env antes de qualquer
// provider (PrismaService, DiscogsService) ser instanciado pelo Nest. Sem
// isso, DATABASE_URL e DISCOGS_TOKEN chegam undefined em runtime — só a CLI
// do Prisma carrega o .env sozinha, via prisma.config.ts.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(3000);
}
bootstrap();