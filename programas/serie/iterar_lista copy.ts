import { exec, spawn, spawnSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import util from 'util'
const execPromise = util.promisify(exec)

const cwd = process.cwd()

async function iterarLista () {
  const { argv } = process

  console.log('- iterarLista')
  let lista: string
  try {
    const data = readFileSync(`listaVideos.txt`, { encoding: 'utf8' })
    lista = data.toString()
  } catch {
    console.error('Error leyendo la lista de videos')
    return
  }

  let listaVideosDescargados: string[] = []
  try {
    listaVideosDescargados = readdirSync('recursos/por_procesar/1_videos_sin_audio', 'utf8')
  } catch {
    console.error('Error leyendo la carpeta de videos sin procesar (recursos/por_procesar/1_videos_sin_audio)')
  }

  let listaAudiosDescargados: string[] = []
  try {
    listaAudiosDescargados = readdirSync('recursos/por_procesar/1_audios', 'utf8')
  } catch {
    console.error('Error leyendo la carpeta de audios sin procesar (recursos/por_procesar/1_audios)')
  }

  if (!listaAudiosDescargados?.length && !listaVideosDescargados?.length) {
    console.error('No se pudieron leer ni los videos ni audios sin procesar, probablemente porque no haya ninguno')
    return
  }

  let completos: string[] = []
  try {
    
  } catch {
    return
  }

  const lineas = lista.split('\n')
  const regex = /(.*)\|==1==\|(.*)\|==2==\|(.*)\|==3==\|(.*)\|==4==\|/i

  console.log('Iterando lista...')

  if (argv.includes('completo')) {
    completo(argv, lineas, regex, listaAudiosDescargados, listaVideosDescargados)
    return
  }

  for (const idx in lineas) {
    const linea = lineas[idx]
    const match = linea.match(regex)
    if (!match) continue

    // 4 separadores, 5 valores, el último indefinido
    // console.log(match[1], match[2], match[3], match[4])

    let [, state, id, uploader, title] = match

    if (!id) {
      // console.warn(`Falta id en la línea ${idx + 1}`)
      continue
    }

    if (state === '[x]') continue
    
    let newState = state
    const existeAudio = listaAudiosDescargados.some(a => a.includes(id))
    const existeVideo = listaVideosDescargados.some(v => v.includes(id))

    if (existeAudio && existeVideo) {
      newState = '[d]'
    } else if (existeAudio) {
      newState = '[a]'
    } else if (existeVideo) {
      newState = '[v]'
    } else {
      newState = '[ ]'
    }

    // if (newState === state) {
    //   lineas[idx] = `${newState}|==1==|${id}|==2==|${uploader}|==3==|${title}|==4==|`
    //   const newData = lineas.join('\n')
    //   writeFileSync('listaVideos.txt', newData, { encoding: 'utf8', mode: '' })
    //   // continue
    // }

    if (state !== '[d]' || newState !== '[d]') {
      console.log(state, '→', newState, id)
    }

    await execPromise(`bun ${cwd}/programas/serie/verificar_elementos.ts ${id}`)

    if (state === '[a]' || state === '[v]' || state === '[ ]') {
      // console.log('Descargando...')
      const downloadProcess = spawn('bun', [`${cwd}/programas/serie/descargar.ts`, id], { stdio: 'inherit' })

      try {
        newState = await new Promise((resolve, reject) => {
          downloadProcess.on('close', (code) => {
            if (code === 0) {
              // lineas[idx] = `${newState}|==1==|${id}|==2==|${uploader}|==3==|${title}|==4==|`
              resolve('[d]')
            }
            else reject(newState)
          })

          downloadProcess.on('error', (err) => {
            reject(newState)
          })
        })
      } catch (err) {
        console.error(err)
      }
    }

    if (state !== '[d]' || newState !== '[d]') {
      console.log('?', '→', newState, id, '\n')
    }

    lineas[idx] = `${newState}|==1==|${id}|==2==|${uploader}|==3==|${title}|==4==|`
    const newData = lineas.join('\n')
    writeFileSync('listaVideos.txt', newData, { encoding: 'utf8', mode: '' })
  }
  console.log('Lista iterada')
}

async function completo (argv: string[], lineas: string[], regex: RegExp, audios: string[], videos: string[]) {
  for (const idx in lineas) {
    const linea = lineas[idx]
    const match = linea.match(regex)
    if (!match) continue

    let [, state, id, uploader, title] = match
    if (!state || !id || state === '[x]') continue

    let localState = state
    const existeAudio = audios.some(a => a.includes(id))
    const existeVideo = videos.some(v => v.includes(id))

    if (existeAudio && existeVideo) {
      localState = '[d]'
    } else if (existeAudio) {
      localState = '[a]'
    } else if (existeVideo) {
      localState = '[v]'
    } else {
      localState = '[ ]'
    }

  }
}

async function descargar () {
  
}