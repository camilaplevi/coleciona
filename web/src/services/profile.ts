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
