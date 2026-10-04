import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { EmailVerifiedGuard } from '../auth/email-verified.guard.js'
import { CollectionFilters, CollectionService } from './collection.service.js'

interface RequestWithUser extends Request {
  user?: { id: string }
}

@Controller()
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Get('perfis/:username/colecao')
  list(
    @Param('username') username: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: RequestWithUser,
  ) {
    // Rota aberta de propósito: o service decide entre a coleção e o 404 de perfil privado.
    return this.collection.findByUsername(
      username,
      parseFilters(query),
      req.user?.id ?? null,
    )
  }

  @Post('colecao')
  @UseGuards(EmailVerifiedGuard)
  add(@Body('albumId', ParseUUIDPipe) albumId: string, @Req() req: RequestWithUser) {
    return this.collection.add(requireUser(req), albumId)
  }

  @Delete('colecao/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.collection.remove(requireUser(req), id)
  }
}

function requireUser(req: RequestWithUser): string {
  if (!req.user) {
    throw new UnauthorizedException('Entre na sua conta para fazer isso.')
  }
  return req.user.id
}

/** Valores inválidos são descartados em silêncio: um filtro errado na URL não quebra a tela. */
function parseFilters(query: Record<string, string | undefined>): CollectionFilters {
  const list = (value?: string) =>
    value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []

  const sorts = ['artista-az', 'album-az', 'ano-desc', 'adicionado-desc'] as const
  const sort = sorts.find((s) => s === query.ordenar) ?? 'artista-az'

  return {
    search: query.busca?.trim() || undefined,
    label: query.gravadora?.trim() || undefined,
    styleSlugs: list(query.estilos),
    decades: list(query.decadas)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1900 && n <= 2100),
    sort,
  }
}