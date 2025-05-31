import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

streams()

// export function streams (videoId: string) {
export function streams () {
  const videoId = process.argv[2]
  console.log('- streams:', videoId)
  let contenidoCarpetaVideo: string[]
  try {
    contenidoCarpetaVideo = readdirSync(`resultados/${videoId}`)
  } catch {
    console.error(`Error leyendo resultados/${videoId}`)
    return
  }

  if (!contenidoCarpetaVideo) {
    console.error(`No hay contenido en resultados/${videoId}, omitiendo`)
    return
  }

  if (contenidoCarpetaVideo.includes('manifest.mpd') || contenidoCarpetaVideo.includes('mp4box_manifest.mpd')) {
    console.warn(`Ya existe un manifiesto en resultados/${videoId}, se sobreescribirá`)
  }

  const resolucionesEnCarpeta: string[] = []

  for (const res of contenidoCarpetaVideo) {
    if (contenidoCarpetaVideo.includes(res) && !res.includes('.')) {
      resolucionesEnCarpeta.push(res)
    }
  }

  const partesDeParametros = {
    '32p': `resultados/${videoId}/32p/video.mp4#video:id=32p/32p`,
    '144p': `resultados/${videoId}/144p/video.mp4#video:id=144p/144p`,
    '360p': `resultados/${videoId}/360p/video.mp4#video:id=360p/360p`,
    '720p': `resultados/${videoId}/720p/video.mp4#video:id=720p/720p`,
    'audio': `resultados/${videoId}/audio/audio.mp4#audio:id=audio/audio:role=main`,
  }

  const params = ['-dash', '4000', '-frag', '4000', '-rap', '-segment-name', '$RepresentationID$_', '-fps', '24']
  let algunaResolucion = false
  
  for (const res of resolucionesEnCarpeta) {
    if (partesDeParametros[res]) {
      algunaResolucion = true
      params.push(partesDeParametros[res])
    }
  }
  params.push('-out', `resultados/${videoId}/mp4box_manifest.mpd`)

  if (!algunaResolucion) {
    console.error(`No se encontró ninguna resolución válida en resultados/${videoId}`)
    return
  }
  spawnSync('MP4Box', params)
  // const proceso = spawnSync('MP4Box', params)

  // const stdout = proceso.stdout.toString()
  // const stderr = proceso.stderr.toString()

  // console.log('stdout:', stdout, 'stderr:', stderr)
}