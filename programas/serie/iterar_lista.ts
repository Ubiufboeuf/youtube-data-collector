import { exec, spawn, spawnSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import util from 'util'
const execPromise = util.promisify(exec)

const cwd = process.cwd()
let numeroDePendientes = 0

async function iterarLista () {
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

  const lineas = lista.split('\n')
  const regex = /(.*)\|==1==\|(.*)\|==2==\|(.*)\|==3==\|(.*)\|==4==\|/i

  for (const idx in lineas) {
    const linea = lineas[idx]
    const match = linea.match(regex)
    if (!match) continue

    // 4 separadores, 5 valores, el último indefinido
    // console.log(match[1], match[2], match[3], match[4])

    let [, state, id, uploader, title] = match

    if (!id) {
      // console.warn(`Falta id en la línea ${idx + 1}`)
    }

    if (state === '[x]') continue
    
    let newState = state

    if (listaAudiosDescargados.some(a => a.includes(id)) && listaVideosDescargados.some(v => v.includes(id))) {
      newState = '[d]'
    } else if (listaAudiosDescargados.some(a => a.includes(id))) {
      newState = '[a]'
    } else if (listaVideosDescargados.some(v => v.includes(id))) {
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

    console.log(state, id)

    await execPromise(`bun ${cwd}/programas/serie/verificar_elementos.ts ${id}`)

    if (state === '[a]' || state === '[v]' || state === '[ ]') {
      // console.log('Descargando...')
      const downloadProcess = spawn('bun', [`${cwd}/programas/serie/descargar.ts`, id], { stdio: 'inherit' })

      await new Promise((resolve, reject) => {
        downloadProcess.on('close', (code) => {
          if (code === 0) {
            lineas[idx] = `${newState}|==1==|${id}|==2==|${uploader}|==3==|${title}|==4==|`
            const newData = lineas.join('\n')
            writeFileSync('listaVideos.txt', newData, { encoding: 'utf8', mode: '' })
            resolve(code)
          }
          else reject(new Error(`El proceso de descarga terminó con código ${code}`))
        })

        downloadProcess.on('error', (err) => {
          reject(new Error(`Fallo al iniciar el proceso de descarga: ${err.message}`))
        })
      })
      // console.log('Descarga completa.')
    }

    lineas[idx] = `${newState}|==1==|${id}|==2==|${uploader}|==3==|${title}|==4==|`
    const newData = lineas.join('\n')
    writeFileSync('listaVideos.txt', newData, { encoding: 'utf8', mode: '' })
  }
}

iterarLista()
