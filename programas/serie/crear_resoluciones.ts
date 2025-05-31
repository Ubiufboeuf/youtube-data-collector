import { spawnSync } from 'child_process'
import { mkdirpSync, readdirSync } from 'fs-extra'

const RESOLUCIONES_POR_DEFECTO: string[] = [
  '32p',
  // '144p',
  '360p',
  // '720p'
] // Si quieres quitar una resolución no la elimines, coméntala

crear_resoluciones()
// No confundas esto con streams.ts, si solo ves los video.mp4
// entonces se hizo mal en streams, no acá

// export function crear_resoluciones (videoId: string, resoluciones: string[] = RESOLUCIONES_POR_DEFECTO) {
export function crear_resoluciones (resoluciones = RESOLUCIONES_POR_DEFECTO) {
  const videoId = process.argv[2]
  console.log('- crear_resoluciones:', videoId)
  if (!resoluciones || !resoluciones.length) {
    console.warn('No se especificó ninguna resolución, no se creará ninguna (no estoy contando audio, eso es aparte)')
    return
  }

  const partesDeParametros: { [key: string]: string[] } = {
    '720p': ['-map', '0:v', '-c:v', 'libx264', '-vf', 'scale=1280:720', '-b:v', '3000k', '-maxrate', '3210k', '-bufsize', '6000k', '-g', '24', '-sc_threshold', '0', '-keyint_min', '24', '-x264-params', 'keyint=24:min-keyint=24', '-an', '-f', 'mp4', `resultados/${videoId}/720p/video.mp4`],
    '360p': ['-map', '0:v', '-c:v', 'libx264', '-vf', 'scale=640:360', '-b:v', '1000k', '-maxrate', '1070k', '-bufsize', '2000k', '-g', '24', '-sc_threshold', '0', '-keyint_min', '24', '-x264-params', 'keyint=24:min-keyint=24', '-an', '-f', 'mp4', `resultados/${videoId}/360p/video.mp4`],
    '144p': ['-map', '0:v', '-c:v', 'libx264', '-vf', 'scale=256:144', '-b:v', '400k', '-maxrate', '428k', '-bufsize', '800k', '-g', '24', '-sc_threshold', '0', '-keyint_min', '24', '-x264-params', 'keyint=24:min-keyint=24', '-an', '-f', 'mp4', `resultados/${videoId}/144p/video.mp4`],
    '32p': ['-map', '0:v', '-c:v', 'libx264', '-vf', 'scale=32:18', '-b:v', '8k', '-maxrate', '8k', '-bufsize', '8k', '-g', '24', '-sc_threshold', '0', '-keyint_min', '24', '-x264-params', 'keyint=24:min-keyint=24', '-an', '-f', 'mp4', `resultados/${videoId}/32p/video.mp4`],
  }

  // 256px × 144px se usa porque concide para 640 y 360 en dividir entre 2.5

  const parametros = ['-i', `recursos/procesados/3_videos_sin_audio/${videoId}.mp4`]

  let resolucionesEnCarpeta: string[]
  try {
    resolucionesEnCarpeta = readdirSync(`resultados/${videoId}`)
  } catch {
    mkdirpSync(`resultados/${videoId}`)
    resolucionesEnCarpeta = []
  }
  let faltaResolucion = false
  for (const resolucion of resoluciones) {
    if (resolucionesEnCarpeta.includes(resolucion)) continue
    faltaResolucion = true
    mkdirpSync(`resultados/${videoId}/${resolucion}`)
    if (partesDeParametros[resolucion]) {
      parametros.push(...partesDeParametros[resolucion])
    }
  }

  if (!faltaResolucion) {
    console.log(`Todas las resoluciones deseadas para ${videoId} están hechas, omitiendo`)
    return
  }
  spawnSync('ffmpeg', parametros)
  
  console.log('Si el proceso se completó muy rápido seguramente sea porque dió error')
  // const proceso = spawnSync('ffmpeg', parametros)

  // const stdout = proceso.stdout.toString()
  // const stderr = proceso.stderr.toString()

  // console.log('stdout:', stdout, 'stderr:', stderr)
}