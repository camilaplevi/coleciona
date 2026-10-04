import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { DiscogsModule } from './discogs/discogs.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { AuthModule } from './auth/auth.module.js'
import { MailModule } from './mail/mail.module.js'
import { ProfileModule } from './profile/profile.module.js';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    CollectionModule,
    CatalogModule,
    DiscogsModule,
    OnboardingModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
