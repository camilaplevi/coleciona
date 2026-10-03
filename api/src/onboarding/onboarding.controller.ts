// api/src/onboarding/onboarding.controller.ts

import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator'
import { requireUser } from '../auth/auth.controller.js'
import type { RequestWithUser } from '../auth/auth.types.js'
import { OnboardingService } from './onboarding.service.js'

export class CompleteOnboardingDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  styleIds!: string[]

  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  artistIds!: string[]
}

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /** GET /api/onboarding/opcoes */
  @Get('opcoes')
  options(@Req() req: RequestWithUser) {
    return this.onboarding.options(requireUser(req))
  }

  /** GET /api/onboarding/preferencias */
  @Get('preferencias')
  current(@Req() req: RequestWithUser) {
    return this.onboarding.current(requireUser(req))
  }

  /** POST /api/onboarding */
  @Post()
  complete(@Body() dto: CompleteOnboardingDto, @Req() req: RequestWithUser) {
    return this.onboarding.complete(requireUser(req), dto.styleIds, dto.artistIds)
  }

  /** POST /api/onboarding/pular */
  @Post('pular')
  @HttpCode(204)
  skip(@Req() req: RequestWithUser) {
    return this.onboarding.skip(requireUser(req))
  }
}