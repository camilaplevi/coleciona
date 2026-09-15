// api/src/collection/collection.controller.ts

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
} from '@nestjs/common'
import type { Request } from 'express'
import { CollectionFilters, CollectionService } from './collection.service.js'

/** Formato que o guard de autenticação vai anexar à requisição. */
interface RequestWithUser extends Request {
  user?: { id: string }
}

@Controller()
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  /** GET /api/perfis/:username/colecao */
  @Get('perfis/:username/colecao')
  list(
    @Param('username') username: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: RequestWithUser,
  ) {
    // Rota deliberadamente aberta: sem login ela devolve a coleção se o perfil
    // for público, e 404 se não for. Quem aplica a regra é o RLS.
    return this.collection.findByUsername(
      username,
      parseFilters(query),
      req.user?.id ?? null,
    )
  }

  /** POST /api/colecao */
  @Post('colecao')
  add(@Body('albumId', ParseUUIDPipe) albumId: string, @Req() req: RequestWithUser) {
    return this.collection.add(requireUser(req), albumId)
  }

  /** DELETE /api/colecao/:id */
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

/**
 * Converte a query string no formato que o front monta em toQueryString().
 * Valores inválidos são descartados em silêncio em vez de virarem erro: um
 * filtro digitado errado na URL não deve quebrar a tela inteira.
 */
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