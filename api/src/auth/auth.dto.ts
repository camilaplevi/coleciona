import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string

  // Só comprimento: regras de composição levam a senhas previsíveis (NIST).
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
export class ConfirmEmailDto {
  @IsString()
  @Length(20, 200, { message: 'Link de confirmação inválido.' })
  token!: string
}
