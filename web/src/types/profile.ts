export interface Ranked {
  key: string
  label: string
  count: number
}

export interface CollectionStats {
  totals: {
    items: number
    artists: number
    labels: number
    styles: number
    oldestYear: number | null
    newestYear: number | null
    /** Discos com estado de conservação informado. */
    rated: number
  }
  byStyle: Ranked[]
  byArtist: Ranked[]
  byDecade: Ranked[]
  byLabel: Ranked[]
  byCondition: Ranked[]
}

/** Perfil público: o que qualquer visitante pode ver. */
export interface PublicProfile {
  profile: {
    username: string
    displayName: string
    bio: string | null
    avatarUrl: string | null
    memberSince: string
    isOwner: boolean
  }
  stats: CollectionStats
}

/** Conta da própria pessoa: inclui e-mail e estado de verificação. */
export interface MyAccount {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isPublic: boolean
  memberSince: string
  email: string
  emailVerified: boolean
}

export interface AccountUpdate {
  displayName?: string
  bio?: string | null
  avatarUrl?: string | null
  isPublic?: boolean
  username?: string
}
