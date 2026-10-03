import type { ArtistRef, StyleRef } from '@/types/catalog'
import { request } from './http'

export interface OnboardingOptions {
  styles: StyleRef[]
  artists: Array<ArtistRef & { imageUrl: string | null }>
}

export interface OnboardingPreferences {
  styleIds: string[]
  artistIds: string[]
}

export function fetchOptions(signal?: AbortSignal): Promise<OnboardingOptions> {
  return request<OnboardingOptions>('/onboarding/opcoes', { signal })
}

export function fetchPreferences(signal?: AbortSignal): Promise<OnboardingPreferences> {
  return request<OnboardingPreferences>('/onboarding/preferencias', { signal })
}

export function completeOnboarding(
  preferences: OnboardingPreferences,
): Promise<OnboardingPreferences> {
  return request<OnboardingPreferences>('/onboarding', {
    method: 'POST',
    body: JSON.stringify(preferences),
  })
}

export function skipOnboarding(): Promise<void> {
  return request<void>('/onboarding/pular', { method: 'POST' })
}