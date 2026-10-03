import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { DiscogsModule } from './discogs/discogs.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CollectionModule,
    CatalogModule,
    DiscogsModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
