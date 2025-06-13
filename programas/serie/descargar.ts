import { spawnSync } from 'node:child_process'
import { readdirSync, unlinkSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'

const DEFAULT_VIDEO_RESOLUTION = '278' // ~144p
const DEFAULT_AUDIO_RESOLUTION = '251' // ~audio
descargar()

// export async function descargar (videoId: string) {
export async function descargar () {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }
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
  const ytDlpOptions = spawnSync('yt-dlp_linux', paramsShowOptions).stdout.toString()
  console.log(ytDlpOptions)

  const rl = createInterface({ input: stdin, output: stdout })
  let answer: string

  let default_resolutions = `${DEFAULT_VIDEO_RESOLUTION},${DEFAULT_AUDIO_RESOLUTION}`
  console.log('Elije el id del audio y video a descargar, sepáralos por coma.')
  if (faltaAudio && faltaVideo) {
    console.log(`Falta tanto audio como video, por defecto ${default_resolutions}, entonces escribe: [videoId],[audioId]`)
  } else if (faltaAudio) {
    default_resolutions = DEFAULT_AUDIO_RESOLUTION
    console.log(`Sólo falta el audio, por defecto ${default_resolutions}, entonces escribe: [audioId]`)
  } else if (faltaVideo) {
    default_resolutions = DEFAULT_VIDEO_RESOLUTION
    console.log(`Sólo falta el video, por defecto ${default_resolutions}, entonces escribe: [videoId]`)
  }

  // answer = await rl.question(`Descargar (${videoId}): `) || default_resolutions
  answer = default_resolutions

  rl.close()

  if (!answer.includes(',') && faltaAudio) {
    answer = `,${answer}`
  } else if (!answer.includes(',') && faltaVideo) {
    answer = `${answer},`
  }

  const ytDlpParamsVideo = ['-f', `${answer.split(',')[0]}/mp4`, '-o', '%(id)s.%(ext)s', '-P', 'recursos/por_procesar/1_videos_sin_audio', `https://www.youtube.com/watch?v=${videoId}`]
  const ytDlpParamsAudio = ['-f', `${answer.split(',')[1]}`, '-x', '--audio-format', 'opus', '-o', '%(id)s.%(ext)s', '-P', 'recursos/por_procesar/1_audios', `https://www.youtube.com/watch?v=${videoId}`]
  const ffmpegParamsAudio = ['-i', `recursos/por_procesar/1_audios/${videoId}.opus`, `recursos/por_procesar/1_audios/${videoId}.mp4`]

  if (faltaVideo) {
    console.log('Descargando video...')
    spawnSync('yt-dlp_linux', ytDlpParamsVideo)
  }
  if (faltaAudio) {
    console.log('Descargando audio...')
    spawnSync('yt-dlp_linux', ytDlpParamsAudio)
    console.log('Convirtiendo audio...')
    spawnSync('ffmpeg', ffmpegParamsAudio)

    const audios = readdirSync(`recursos/por_procesar/1_audios/`)
    if (audios.includes(`${videoId}.opus`)) {
      unlinkSync(`recursos/por_procesar/1_audios/${videoId}.opus`)
    } else {
      console.log('No se descargó el audio')
      process.exit(1)
    }
  }
}