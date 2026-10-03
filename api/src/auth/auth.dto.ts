// api/src/auth/auth.dto.ts

import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string

  // 8 caracteres sem exigência de símbolo e maiúscula: as regras de
  // composição levam a senhas previsíveis ("Senha1!") e estão fora das
  // recomendações atuais do NIST. Comprimento é o que importa.
  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  password!: string

  @IsString()
  @Length(2, 60, { message: 'O nome precisa ter entre 2 e 60 caracteres.' })
  displayName!: string
}

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string

  @IsString()
  @MinLength(1, { message: 'Informe sua senha.' })
  password!: string
}

export class UpdateProfileDto {
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'O endereço do perfil aceita apenas letras minúsculas, números, hífen e sublinhado.',
  })
  username!: string
}