import { mkdirpSync, writeFileSync } from 'fs-extra'

const DEFAULT_CWD_FOLDER = '/home/mango/Dev/youtube-data-collector'

verificarElementos()

// export function verificarElementos (videoId: string) {
export function verificarElementos () {
  const videoId = process.argv[2]
  console.log(`- verificar_elementos: ${videoId}`)
  const cwd = process.cwd()
  if (cwd !== DEFAULT_CWD_FOLDER) {
    console.error(`Este proceso espera ser ejecutado desde ${DEFAULT_CWD_FOLDER}. Como no lo está se detendrá la ejecución del programa.`)
    process.exit(1)
  }
  mkdirpSync(`recursos/assets/${videoId}`)
  mkdirpSync(`recursos/info`)
  mkdirpSync('recursos/por_procesar/1_audios')
  mkdirpSync('recursos/por_procesar/1_videos_sin_audio')
  mkdirpSync('recursos/procesados/2_videos')
  mkdirpSync('recursos/procesados/3_audios')
  mkdirpSync('recursos/procesados/3_videos_sin_audio')

  mkdirpSync(`resultados/${videoId}`)
}