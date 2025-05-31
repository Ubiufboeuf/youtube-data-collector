import { copyFileSync, mkdirpSync, readdirSync } from 'fs-extra'

mover_audio()

// export function mover_audio (videoId: string) {
export function mover_audio () {
  const videoId = process.argv[2]
  console.log('- mover_audio')
  const audios = readdirSync(`recursos/procesados/3_audios/`)

  let existeProcesado = false

  for (const audio of audios) {
    if (audio.includes(videoId)) {
      existeProcesado = true
    }
  }

  if (!existeProcesado) {
    console.log(`No existe un audio en recursos/procesados/3_audios/ de ${videoId}, omitiendo`)
    return
  }

  let videoResultado: string[]
  try {
    videoResultado = readdirSync(`resultados/${videoId}`)
  } catch {
    console.error(`No se pudo leer resultados/${videoId}`)
    return
  }

  let existeAudio = false
  for (const resolucion of videoResultado) {
    if (resolucion === 'audio') {
      existeAudio = true
    }
  }

  if (existeAudio) {
    console.log(`Existe audio en resultados/${videoId}/audio, omitiendo`)
    return
  }

  mkdirpSync(`resultados/${videoId}/audio`)
  copyFileSync(`recursos/procesados/3_audios/${videoId}.mp4`, `resultados/${videoId}/audio/audio.mp4`)
}