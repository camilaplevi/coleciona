import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Put, Req } from '@nestjs/common'
import { requireUser } from '../auth/auth.controller.js'
import type { RequestWithUser } from '../auth/auth.types.js'
import { AvatarDto, UpdateAccountDto } from './profile.dto.js'
import { ProfileService } from './profile.service.js'

@Controller()
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('perfil/eu')
  me(@Req() req: RequestWithUser) {
    return this.profiles.myAccount(requireUser(req))
  }

  @Patch('perfil/eu')
  update(@Body() dto: UpdateAccountDto, @Req() req: RequestWithUser) {
    return this.profiles.updateMyAccount(requireUser(req), dto)
  }

  @Put('perfil/eu/foto')
  setAvatar(@Body() dto: AvatarDto, @Req() req: RequestWithUser) {
    return this.profiles.setAvatar(requireUser(req), dto.imagem)
  }

  @Delete('perfil/eu/foto')
  @HttpCode(200)
  removeAvatar(@Req() req: RequestWithUser) {
    return this.profiles.removeAvatar(requireUser(req))
  }

  // Perfil privado devolve 404, igual a um endereço inexistente.
  @Get('perfis/:username')
  publicProfile(@Param('username') username: string, @Req() req: RequestWithUser) {
    return this.profiles.publicProfile(username, req.user?.id ?? null)
  }
}
