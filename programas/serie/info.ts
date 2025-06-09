import { Format, Thumbnail, YTVideoInfo } from '../../env'
import { readdirSync, readFileSync } from 'fs-extra'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { Temporal } from 'temporal-polyfill'

info()

// export function info (videoId: string) {
export function info () {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }
  console.log(`- info: ${videoId}`)
  let formats: string[]
  try {
    formats = readdirSync(`resultados/${videoId}`)
  } catch {
    console.error(`Hubo un error leyendo la carpeta resultados/${videoId}`)
    return
  }

  const jsonBaseStr = readFileSync('base.json', 'utf8')
  const jsonBase: YTVideoInfo = JSON.parse(jsonBaseStr)

  const params = ['-j', `https://www.youtube.com/watch?v=${videoId}`]
  const ytdlp = spawnSync('yt-dlp', params)

  const stdout = ytdlp.stdout.toString()
  const ytInfo: YTVideoInfo = JSON.parse(stdout)
  
  let newInfo: YTVideoInfo = new Object()
  newInfo = {
    ...newInfo,
    ...jsonBase
  }

  let durationAvg = ytInfo?.duration ?? 0
  
  ;Object.entries(ytInfo).forEach(([key, value]) => {
    if (!(key in newInfo)) return

    if (key === 'thumbnails') {
      ;[...ytInfo.thumbnails || []].forEach(t => {
        if (!t.height || !t.width) return
        const thumbnail: Thumbnail = {
          id: `${t.height}p`,
          width: t.width,
          height: t.height,
          resolution: `${t.width}x${t.height}`,
          url: t?.url ?? '.'
        }
        if (!newInfo[key]) return
        newInfo[key].push(thumbnail)
      })
      return
    }
    
    if (key === 'formats') {
      ;[...formats].forEach(f => {
        if (f.includes('.')) return
        const fileType = f === 'audio' ? 'audio' : 'video'
        const params = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '-i', `resultados/${videoId}/${f}/${fileType}.mp4`]
        const process = spawnSync('ffprobe', params)

        const details = JSON.parse(process.stdout.toString())
        const df = details?.format
        const vs = details?.streams?.[0]
        const format: Format = {
          duration: Number(df?.duration),
          ext: 'mp4',
          resolution: f,
          aspect_ratio: vs?.width / vs?.height,
          width: vs?.width,
          height: vs?.height,
          type: fileType
        }

        durationAvg += Number(df?.duration)

        if (!newInfo[key]) return
        newInfo[key].push(format)
      })
      return
    }
    newInfo[key] = value
  })

  // durationAvg = durationAvg / durationLength
  newInfo.duration = durationAvg / ((newInfo.formats?.length ?? 0) + 1)
  
  const instant = Temporal.Instant.fromEpochMilliseconds((ytInfo?.timestamp || 1) * 1000)
  newInfo.release_datestring = instant.toString()
  if (newInfo?.timestamp) delete newInfo.timestamp

  writeFileSync(`recursos/info/${videoId}.json`, JSON.stringify(newInfo, null, 2))

  console.log(`Recopilación de la información del video ${videoId} terminada (podrían haber habido errores)`)
}
