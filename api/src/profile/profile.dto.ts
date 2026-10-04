import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'

/** Campos opcionais: a tela envia só o que mudou. A foto não entra aqui: tem rota própria. */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @Length(2, 60, { message: 'O nome precisa ter entre 2 e 60 caracteres.' })
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(280, { message: 'A bio pode ter até 280 caracteres.' })
  bio?: string | null

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @IsOptional()
  @IsString()
  @Length(3, 30, { message: 'O endereço do perfil precisa ter entre 3 e 30 caracteres.' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'O endereço do perfil aceita apenas letras minúsculas, números, hífen e sublinhado.',
  })
  username?: string
}

/** Foto de perfil como data URL (JPEG, PNG ou WebP), já redimensionada pelo navegador. */
export class AvatarDto {
  @IsString()
  @MaxLength(150_000, { message: 'A imagem é grande demais. Escolha uma foto menor.' })
  imagem!: string
}
