// api/src/discogs/discogs.controller.ts

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { DiscogsService } from './discogs.service.js'

/** Formato que o guard de autenticação vai anexar à requisição. */
interface RequestWithUser extends Request {
  user?: { id: string }
}

@Controller('discogs')
export class DiscogsController {
  constructor(private readonly discogs: DiscogsService) {}

  /** GET /api/discogs/artistas?busca=... */
  @Get('artistas')
  search(@Query('busca') busca?: string) {
    const query = busca?.trim()
    if (!query) {
      throw new BadRequestException('Informe um termo de busca.')
    }
    return this.discogs.searchArtists(query)
  }

  /**
   * POST /api/discogs/artistas/:discogsId/importar
   *
   * Escrita no catálogo compartilhado — exige login, igual a POST /colecao.
   * Quem decide se a escrita é permitida no fim das contas é o RLS.
   */
  @Post('artistas/:discogsId/importar')
  import(@Param('discogsId', ParseIntPipe) discogsId: number, @Req() req: RequestWithUser) {
    return this.discogs.importArtist(discogsId, requireUser(req))
  }
}

function requireUser(req: RequestWithUser): string {
  if (!req.user) {
    throw new UnauthorizedException('Entre na sua conta para fazer isso.')
  }
  return req.user.id
}
