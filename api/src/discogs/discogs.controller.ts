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

interface RequestWithUser extends Request {
  user?: { id: string }
}

@Controller('discogs')
export class DiscogsController {
  constructor(private readonly discogs: DiscogsService) {}

  @Get('artistas')
  search(@Query('busca') busca?: string) {
    const query = busca?.trim()
    if (!query) {
      throw new BadRequestException('Informe um termo de busca.')
    }
    return this.discogs.searchArtists(query)
  }

  // Escrita no catálogo compartilhado: exige login, como POST /colecao.
  @Post('artistas/:discogsId/importar')
  import(@Param('discogsId', ParseIntPipe) discogsId: number, @Req() req: RequestWithUser) {
    return this.discogs.importArtist(discogsId, requireUser(req))
  }

  /** GET /api/discogs/discos?busca=&pagina= — discos de vinil, para o que ainda não está no catálogo. */
  @Get('discos')
  searchReleases(@Query('busca') busca?: string, @Query('pagina') pagina?: string) {
    const query = busca?.trim()
    if (!query) {
      throw new BadRequestException('Informe um termo de busca.')
    }
    const page = Math.min(Math.max(Number(pagina) || 1, 1), 10)
    return this.discogs.searchReleases(query, page)
  }

  /** POST /api/discogs/discos/:releaseId/importar — grava o disco no catálogo e devolve o resumo. */
  @Post('discos/:releaseId/importar')
  importRelease(@Param('releaseId', ParseIntPipe) releaseId: number, @Req() req: RequestWithUser) {
    return this.discogs.importRelease(releaseId, requireUser(req))
  }
}

function requireUser(req: RequestWithUser): string {
  if (!req.user) {
    throw new UnauthorizedException('Entre na sua conta para fazer isso.')
  }
  return req.user.id
}
