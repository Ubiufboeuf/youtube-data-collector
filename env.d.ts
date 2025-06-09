export interface YTVideoInfo extends Object {
  id?: string
  title?: string
  description?: string
  channel_id?: string
  channel_url?: string
  duration?: number
  view_count?: number
  webpage_url?: string
  categories?: string[]
  tags?: string[]
  like_count?: number
  is_live?: boolean
  was_live?: boolean
  release_datestring?: string
  availability?: string
  uploader?: string
  uploader_id?: `@${string}`
  uploader_url?: `${string}@${string}`
  language?: string
  thumbnails?: Thumbnail[]
  thumbnail?: string
  minimalThumbnail?: string
  formats?: Format[]
  release_timestamp?: number
  timestamp?: number
}

export interface Thumbnail {
  id?: string
  height?: number
  width?: number
  resolution?: `${number}x${number}`
  url?: string
}

export interface Format {
  duration?: number
  ext?: string
  type?: 'audio' | 'video'
  resolution?: string
  aspect_ratio?: number
  height?: number
  width?: number
}

interface CountryTimezoneInfo {
  isoCode: string; // ISO 3166-1 alpha-2 code
  capitalCity: string;
  ianaTimezone: string; // IANA Time Zone Database identifier (e.g., 'America/New_York')
}
