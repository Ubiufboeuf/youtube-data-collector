import { spawnSync } from 'node:child_process'
import { readdirSync, unlinkSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'

const DEFAULT_RESOLUTIONS = '243,251'
descargar()

// export async function descargar (videoId: string) {
export async function descargar () {
  const videoId = process.argv[2]
  console.log('- descargar:', videoId)
  const audiosPorProcesar = readdirSync('recursos/por_procesar/1_audios')
  const videosPorProcesar = readdirSync('recursos/por_procesar/1_videos_sin_audio')

  let faltaAudio = !(audiosPorProcesar.some(f => f.includes(videoId)))
  let faltaVideo = !(videosPorProcesar.some(f => f.includes(videoId)))

  if (!faltaAudio && !faltaVideo) {
    console.log(`Existen audio y video de ${videoId}, no se descargará nada`)
    return
  }

  const paramsShowOptions = ['-F', `https://www.youtube.com/watch?v=${videoId}`]
  const ytDlpOptions = spawnSync('yt-dlp', paramsShowOptions).stdout.toString()
  console.log(ytDlpOptions)

  const rl = createInterface({ input: stdin, output: stdout })
  let answer: string

  console.log('Elije el id de los elementos a descargar, de la forma [videoId],[audioId] (omite todos los espacios que puedas)')
  if (faltaAudio && faltaVideo) {
    console.log('Falta audio y video')
  } else if (faltaAudio) {
    console.log('Sólo falta audio, entonces escribe: ,[audioId]')
  } else if (faltaVideo) {
    console.log('Sólo falta video, entonces escribe: [videoId],')
  }

  answer = await rl.question(`Para descargar (por defecto ${DEFAULT_RESOLUTIONS}): `) || DEFAULT_RESOLUTIONS

  rl.close()

  const ytDlpParamsVideo = ['-f', `${answer.split(',')[0]}/mp4`, '-o', '%(id)s.%(ext)s', '-P', 'recursos/por_procesar/1_videos_sin_audio', `https://www.youtube.com/watch?v=${videoId}`]
  const ytDlpParamsAudio = ['-f', `${answer.split(',')[1]}`, '-x', '--audio-format', 'opus', '-o', '%(id)s.%(ext)s', '-P', 'recursos/por_procesar/1_audios', `https://www.youtube.com/watch?v=${videoId}`]
  const ffmpegParamsAudio = ['-i', `recursos/por_procesar/1_audios/${videoId}.opus`, `recursos/por_procesar/1_audios/${videoId}.mp4`]

  // console.log('yt-dlp', paramsVideo.join(' '))
  // console.log('yt-dlp', paramsAudio.join(' '))
  
  if (faltaVideo) {
    spawnSync('yt-dlp', ytDlpParamsVideo)
  }
  if (faltaAudio) {
    spawnSync('yt-dlp', ytDlpParamsAudio)
    spawnSync('ffmpeg', ffmpegParamsAudio)
    unlinkSync(`recursos/por_procesar/1_audios/${videoId}.opus`)
  }
}