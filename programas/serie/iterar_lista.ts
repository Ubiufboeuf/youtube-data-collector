import { exec, spawn, spawnSync } from 'child_process'
import { readdirSync, readFileSync, writeFile, writeFileSync } from 'fs'
import { verificarElementos } from './verificar_elementos'

const COMPLETO = '[x]'
const DESCARGADO = '[d]'
const AUDIO = '[a]'
const VIDEO = '[v]'
const PENDIENTE = '[ ]'

iterarLista()

async function iterarLista () {
  const { argv } = process
  if (argv.includes('completo') && argv.includes('descargar')) {
    console.error('No uses completo y descargar a la vez, despistao')
    return
  }
  const noAsk = argv.some(a => a.toLowerCase() === 'noask')
  const noSearch = argv.some(a => a.toLowerCase() === 'nosearch')
  const skipX = argv.some(a => a.toLowerCase() === 'skipx')

  console.log('- iterarLista')
  let lista: string
  try {
    const data = readFileSync(`listaVideos.txt`, { encoding: 'utf8' })
    lista = data.toString()
  } catch {
    console.error('Error leyendo la lista de videos')
    return
  }

  let videosDescargados: string[] = []
  try {
    videosDescargados = readdirSync('recursos/por_procesar/1_videos_sin_audio', 'utf8')
  } catch {
    console.error('Error leyendo la carpeta de videos sin procesar (recursos/por_procesar/1_videos_sin_audio)')
  }

  let audiosDescargados: string[] = []
  try {
    audiosDescargados = readdirSync('recursos/por_procesar/1_audios', 'utf8')
  } catch {
    console.error('Error leyendo la carpeta de audios sin procesar (recursos/por_procesar/1_audios)')
  }

  if (!audiosDescargados?.length && !videosDescargados?.length) {
    console.error('No se pudieron leer los videos y audios descargados')
    return
  }

  let completos: string[] = []
  try {
    completos = readdirSync('resultados', 'utf8')
  } catch {
    console.error('Error leyendo la carpeta de resultados')
    return
  }

  const lineas = lista.split('\n')
  const regex = /(.*)\|==1==\|(.*)\|==2==\|(.*)\|==3==\|(.*)\|==4==\|/i

  console.log('Iterando lista...')

  for (const idx in lineas) {
    const linea = lineas[idx]
    const match = linea.match(regex)
    if (!match) continue

    let [, state, id] = match
    if (!state || !id) continue

    let localState = state
    const existeAudio = audiosDescargados.some(a => a.includes(id))
    const existeVideo = videosDescargados.some(v => v.includes(id))
    const terminado = completos.some(c => c.includes(id))

    if (terminado) {
      localState = COMPLETO
    } else if (existeAudio && existeVideo) {
      localState = DESCARGADO
    } else if (existeAudio) {
      localState = AUDIO
    } else if (existeVideo) {
      localState = VIDEO
    } else {
      localState = PENDIENTE
    }

    // console.log(`${state} → ${localState}: ${id} - ${nombre}`)
    
    if (argv.includes('completo')) {
      await completo({ idx, lineas, localState, match, noAsk, noSearch })
    } else {
      await descargar({ idx, lineas, localState, match, noAsk, skipX })
    }
  }

  console.log('Lista iterada')
}

function getLinea ({ newState, id, uploader, title }: { newState: string, id: string, uploader: string, title: string }) {
  return `${newState}|==1==|${id}|==2==|${uploader}|==3==|${title}|==4==|`
}

function write ({ lineas, idx, newState, match }) {
  const [_, __, id, uploader, title] = match
  lineas[idx] = getLinea({ newState, id, uploader, title })
  const newData = lineas.join('\n')
  writeFileSync('listaVideos.txt', newData, 'utf8')
}

async function completo ({ idx, match, lineas, localState, noAsk, noSearch }: { idx: string, match: RegExpMatchArray, lineas: string[], localState: string, noAsk: boolean, noSearch: boolean }) {
  const [, state, id, uploader, title] = match

  let completoSegunArchivos = false
  if (!noSearch) {
    try {
      const resultado = readdirSync(`resultados/${id}/`, 'utf8')
      const validos = { 'manifest': true, 'hidden': true, 'audio': true }
      if (resultado.some(file => validos[file] || file.includes('p'))) {
        completoSegunArchivos = true
      }
    } catch {
      console.error(`Error leyendo la carpeta resultados/${id}/`)
    }
  }

  if (localState !== DESCARGADO || completoSegunArchivos) return

  console.log(`${state} → ${localState}: ${id}`)
  
  let newState = ''
  try {
    await new Promise((resolve, reject) => {
      const params = [`programas/serie/completo2.ts`, id, noAsk ? 'noAsk' : '']
      const process = spawn('bun', params, { stdio: 'inherit' })
      process.on('close', (code) => (code) ? resolve(COMPLETO) : reject(null))
      process.on('error', () => reject(null))
    })
  } catch {
    console.error(`Error procesando el video: ${id}`)
    return
  }

  lineas[idx] = getLinea({ newState, id, uploader, title })
  const newData = lineas.join('\n')
  writeFileSync('listaVideos.txt', newData, 'utf8')
}

async function descargar ({ idx, match, lineas, localState, noAsk, skipX }: { idx: string, match: RegExpMatchArray, lineas: string[], localState: string, noAsk: boolean, skipX: boolean }) {
  const [, state, id, uploader, title] = match
  
  if (skipX && state === COMPLETO) return
  if ((localState === DESCARGADO || localState === COMPLETO)) {
    write({ lineas, idx, newState: localState, match })
    return
  }

  console.log(`${state} → ${localState}: ${id}`)
  
  let newState = ''
  try {
    await new Promise((resolve, reject) => {
      const params = [`programas/serie/descargar.ts`, id, noAsk ? 'noAsk' : '']
      const process = spawn('bun', params, { stdio: 'inherit' })
      process.on('close', (code) => (code) ? resolve(DESCARGADO) : reject(''))
      process.on('error', () => reject(''))
    })
  } catch {
    console.error(`Error descargando el video: ${id}`)
    return
  }

  write({ lineas, idx, newState, match })
}
