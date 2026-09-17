// api/src/catalog/catalog.controller.ts

import { Controller, Get, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AlbumQuery, CatalogService } from './catalog.service.js'

interface RequestWithUser extends Request {
  user?: { id: string }
}

const MAX_PER_PAGE = 60

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** GET /api/inicio */
  @Get('inicio')
  home(@Req() req: RequestWithUser) {
    return this.catalog.home(req.user?.id ?? null)
  }

  /** GET /api/albuns?busca=&estilos=&decadas=&gravadora=&ordenar=&pagina= */
  @Get('albuns')
  list(@Query() query: Record<string, string | undefined>, @Req() req: RequestWithUser) {
    return this.catalog.list(parseQuery(query), req.user?.id ?? null)
  }
}

/**
 * Converte a query string no formato que o front monta.
 * Valor inválido é descartado em silêncio: um parâmetro digitado errado na
 * URL não deve derrubar a tela inteira.
 */
function parseQuery(query: Record<string, string | undefined>): AlbumQuery {
  const list = (value?: string) =>
    value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []

  const number = (value: string | undefined, fallback: number) => {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }

  const sorts = ['album-az', 'ano-desc', 'recentes'] as const
  const sort = sorts.find((s) => s === query.ordenar) ?? 'album-az'

  return {
    search: query.busca?.trim() || undefined,
    label: query.gravadora?.trim() || undefined,
    styleSlugs: list(query.estilos),
    decades: list(query.decadas)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1900 && n <= 2100),
    sort,
    page: number(query.pagina, 1),
    perPage: Math.min(number(query.limite, 24), MAX_PER_PAGE),
  }
}