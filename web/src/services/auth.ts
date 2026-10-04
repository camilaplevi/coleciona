import type { Profile } from '@/types/catalog'
import { request } from './http'

export interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export interface LoginInput {
  email: string
  password: string
}

export function register(input: RegisterInput): Promise<Profile> {
  return request<Profile>('/auth/registro', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function login(input: LoginInput): Promise<Profile> {
  return request<Profile>('/auth/sessao', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function logout(): Promise<void> {
  return request<void>('/auth/sessao', { method: 'DELETE' })
}

/** 401 aqui é resposta normal para visitante, não falha: quem chama mostra o catálogo. */
export function fetchMe(signal?: AbortSignal): Promise<Profile> {
  return request<Profile>('/auth/eu', { signal })
}

export function updateUsername(username: string): Promise<Profile> {
  return request<Profile>('/auth/eu', {
    method: 'PATCH',
    body: JSON.stringify({ username }),
  })
}
/** Confirma o e-mail com o token do link. Não exige sessão. */
export function confirmEmail(token: string): Promise<void> {
  return request<void>('/auth/confirmar', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function resendConfirmation(): Promise<void> {
  return request<void>('/auth/reenviar-confirmacao', { method: 'POST' })
}
