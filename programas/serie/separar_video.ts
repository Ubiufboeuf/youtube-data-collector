import { readdirSync } from 'fs-extra'
import { spawnSync } from 'node:child_process'

separar_video()

// export function separar_video (videoId: string) {
export function separar_video () {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }
  console.log('- separar_video:', videoId)
  const videosProcesados = readdirSync(`recursos/procesados/2_videos`)
  const videosSinAudio = readdirSync(`recursos/procesados/3_videos_sin_audio`)

  if (videosSinAudio.some(a => a.includes(videoId))) {
    console.log(`Hay un video de ${videoId} en recursos/procesados/3_videos_sin_audio, omitiendo`)
    return
  }

  if (!videosProcesados.some(v => v.includes(videoId))) {
    console.error(`No existe ${videoId} en recursos/procesados/2_videos, no se puede separar el video`)
    return
  }

  const hayUnSoloVideo = verificarUnicaExistencia({ arr: videosProcesados, videoId })

  if (!hayUnSoloVideo) {
    console.error(`Hay más de 1 video en recursos/procesados/2_videos con nombre ${videoId}, debe haber como máximo 1 nombre diferente por video`)
    return
  }

  const video = videosProcesados[0]

  // Usa ffmpeg -i video | audio para tener información sobre este
  const parametros = ['-i', `recursos/procesados/2_videos/${video}`, '-an', '-map', '0:v', '-c:v', 'copy', `recursos/procesados/3_videos_sin_audio/${videoId}.mp4`]
  spawnSync('ffmpeg', parametros)
  // const proceso = spawnSync('ffmpeg', parametros)

  // const stdout = proceso.stdout.toString()
  // const stderr = proceso.stderr.toString()
  // const status = proceso.status
  
  // console.log(stdout, stderr, status)
}

function verificarUnicaExistencia ({ arr, videoId }: { arr: string[], videoId: string }){
  let count = 0
  let i = 0
  while (i < arr.length) {
    const el = arr[i]
    el.includes(videoId) && count++
    i++
  }
  if (count > 1 || count === 0) return false // Si hay más de 1 o ninguno devuelve false
  return true
}