// api/src/discogs/discogs.module.ts

import { Module } from '@nestjs/common'
import { DiscogsController } from './discogs.controller.js'
import { DiscogsService } from './discogs.service.js'

@Module({
  controllers: [DiscogsController],
  providers: [DiscogsService],
})
export class DiscogsModule {}
