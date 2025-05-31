import { readdirSync } from 'fs-extra'
import { spawnSync } from 'node:child_process'
import { Buffer } from 'node:buffer'

separar_audio()

// export function separar_audio (videoId: string) {
export function separar_audio () {
  const videoId = process.argv[2]
  console.log('- separar_audio:', videoId)
  const videosProcesados = readdirSync(`recursos/procesados/2_videos`)
  const audiosProcesados = readdirSync(`recursos/procesados/3_audios`)

  if (audiosProcesados.some(a => a.includes(videoId))) {
    console.log(`Hay un audio de ${videoId} en recursos/procesados/3_audios, omitiendo`)
    return
  }

  if (!videosProcesados.some(v => v.includes(videoId))) {
    console.error(`No existe ${videoId} en recursos/procesados/2_videos, no se puede separar el audio`)
    return
  }

  const hayUnSoloVideo = verificarUnicaExistencia({ arr: videosProcesados, videoId })

  if (!hayUnSoloVideo) {
    console.error(`Hay más de 1 video en recursos/procesados/2_videos con nombre ${videoId}, debe haber como máximo 1 nombre diferente por video`)
    return
  }

  const video = videosProcesados[0]

  // Usa ffmpeg -i video | audio para tener información sobre este
  const parametros = ['-i', `recursos/procesados/2_videos/${video}`, '-vn', '-map', '0:a', '-c:a', 'copy', `recursos/procesados/3_audios/${videoId}.mp4`]
  spawnSync('ffmpeg', parametros)
  // const proceso = spawnSync('ffmpeg', parametros)
  // ffmpeg -i recursos/procesados/audios/${videoId}.mp4 -vn -c:a libopus -b:a 64k recursos/procesados/audios/${videoId}.opus

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