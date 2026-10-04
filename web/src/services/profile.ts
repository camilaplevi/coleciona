import type { AccountUpdate, MyAccount, PublicProfile } from '@/types/profile'
import { request } from './http'

export function fetchPublicProfile(username: string, signal?: AbortSignal): Promise<PublicProfile> {
  return request<PublicProfile>(`/perfis/${encodeURIComponent(username)}`, { signal })
}

export function fetchMyAccount(signal?: AbortSignal): Promise<MyAccount> {
  return request<MyAccount>('/perfil/eu', { signal })
}

export function updateMyAccount(input: AccountUpdate): Promise<MyAccount> {
  return request<MyAccount>('/perfil/eu', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** Envia a foto já redimensionada (data URL). Devolve a conta com a foto nova. */
export function uploadAvatar(imagem: string): Promise<MyAccount> {
  return request<MyAccount>('/perfil/eu/foto', {
    method: 'PUT',
    body: JSON.stringify({ imagem }),
  })
}

export function removeAvatar(): Promise<MyAccount> {
  return request<MyAccount>('/perfil/eu/foto', { method: 'DELETE' })
}
