import { readdirSync } from 'fs-extra'
import { spawnSync } from 'node:child_process'
import { Buffer } from 'node:buffer'

unir()

// export function unir (videoId: string) {
export function unir () {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }
  console.log('- unir:', videoId)
  const videosSinAudioPorProcesar = readdirSync(`recursos/por_procesar/1_videos_sin_audio`)
  const audiosPorProcesar = readdirSync(`recursos/por_procesar/1_audios`)
  const videosProcesados = readdirSync(`recursos/procesados/2_videos`)

  if (videosProcesados.some(v => v.includes(videoId))) {
    console.log(`${videoId} ya está en recursos/procesados/2_videos, omitiendo`)
    return
  }

  if (!audiosPorProcesar.some(a => a.includes(videoId))) {
    console.error(`Falta el audio de ${videoId} en recursos/por_procesar/1_audios`)
    return
  }

  if (!videosSinAudioPorProcesar.some(v => v.includes(videoId))) {
    console.error(`Falta el video de ${videoId} en recursos/por_procesar/1_videos_sin_audio, incluso si el video tiene audio debe ir acá`)
    return
  }

  const hayUnSoloAudio = verificarUnicaExistencia({ arr: audiosPorProcesar, videoId })
  if (!hayUnSoloAudio) {
    console.error(`Hay más de 1 audio en recursos/por_procesar/1_audios con nombre ${videoId}, debe haber como máximo 1 nombre diferente por audio`)
    return
  }

  const hayUnSoloVideo = verificarUnicaExistencia({ arr: videosSinAudioPorProcesar, videoId })
  if (!hayUnSoloVideo) {
    console.error(`Hay más de 1 video en recursos/por_procesar/1_videos_sin_audio con nombre ${videoId}, debe haber como máximo 1 nombre diferente por video`)
    return
  }

  const audio = audiosPorProcesar[0]
  const video = videosSinAudioPorProcesar[0]

  const parametros = ['-i', `recursos/por_procesar/1_videos_sin_audio/${video}`, '-i', `recursos/por_procesar/1_audios/${audio}`, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-strict', 'experimental', '-shortest', `recursos/procesados/2_videos/${videoId}.mp4`]
  spawnSync('ffmpeg', parametros)
  // const process = spawnSync('ffmpeg', parametros)

  // const stdout = process.stdout.toString()
  // const stderr = process.stderr.toString()
  // console.log(stdout, stderr, process.status)
}

function verificarUnicaExistencia ({ arr, videoId: id }: { arr: string[], videoId: string }){
  let count = 0
  let i = 0
  while (i < arr.length) {
    const el = arr[i]
    el.includes(id) && count++
    i++
  }
  if (count > 1) return false
  return true
}