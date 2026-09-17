import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { DiscogsModule } from './discogs/discogs.module.js';

@Module({
  imports: [PrismaModule, CollectionModule, DiscogsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
