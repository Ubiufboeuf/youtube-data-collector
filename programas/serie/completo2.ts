// Haría falta un programa para descargar los videos, pero al menos esto por ahora funciona.

import { exec, spawn, spawnSync } from 'child_process' // Import spawn here
import { cwd as _cwd } from 'process'
import util from 'util'
const cwd = _cwd()

// Promisify exec for easier async/await usage
const execPromise = util.promisify(exec)

// const videoId = 'YgmFIVOR1-I' // y1uzBncUsQQ | JQ2913bVo30 | YgmFIVOR1-I | GhMkNB_D2xg

async function processVideo() {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }

  try {
    console.log('Verificando elementos...')
    await execPromise(`bun ${cwd}/programas/serie/verificar_elementos.ts ${videoId}`)
    console.log('Elementos verificados.')

    // --- Descargar (interactive step with spawn) ---
    console.log('Descargando...')
    // Arguments for bun: the script path, then the videoId
    const downloadProcess = spawn(
      'bun',
      [`${cwd}/programas/serie/descargar.ts`, videoId],
      {
        stdio: 'inherit', // This is key: pipes stdin, stdout, and stderr
        // 'inherit' means the child process will use the parent's stdin/stdout/stderr
        // This makes readline work and shows output in real-time
      }
    )

    // Create a promise that resolves when the spawn process exits
    await new Promise((resolve, reject) => {
      downloadProcess.on('close', (code) => {
        if (code === 0) {
          resolve(code)
        } else {
          reject(new Error(`El proceso de descarga terminó con código ${code}`))
        }
      })

      downloadProcess.on('error', (err) => {
        reject(new Error(`Fallo al iniciar el proceso de descarga: ${err.message}`))
      })
    })
    console.log('Descarga completa.')

    // /*[ ]*/ // podría hacer que se itere la lista de descargados para que se haga esto con todos los videos

    // --- Remaining steps (can likely use execPromise if not interactive) ---

    console.log('Uniendo...')
    await execPromise(`bun ${cwd}/programas/serie/unir.ts ${videoId}`)
    console.log('Unión completa.')

    console.log('Separando audio...')
    await execPromise(`bun ${cwd}/programas/serie/separar_audio.ts ${videoId}`)
    console.log('Audio separado.')

    console.log('Separando video...')
    await execPromise(`bun ${cwd}/programas/serie/separar_video.ts ${videoId}`)
    console.log('Video separado.')

    console.log('Creando resoluciones...')
    // Arguments for bun: the script path, then the videoId
    const makeResolutionsProcess = spawn(
      'bun',
      [`${cwd}/programas/serie/crear_resoluciones.ts`, videoId],
      {
        stdio: 'inherit', // This is key: pipes stdin, stdout, and stderr
        // 'inherit' means the child process will use the parent's stdin/stdout/stderr
        // This makes readline work and shows output in real-time
      }
    )

    // Create a promise that resolves when the spawn process exits
    await new Promise((resolve, reject) => {
      makeResolutionsProcess.on('close', (code) => {
        if (code === 0) {
          resolve(code)
        } else {
          reject(new Error(`El proceso de crear las resoluciones terminó con código ${code}`))
        }
      })

      makeResolutionsProcess.on('error', (err) => {
        reject(new Error(`Fallo al crear resoluciones: ${err.message}`))
      })
    })
    console.log('Resoluciones creadas.')

    console.log('Moviendo audio...')
    await execPromise(`bun ${cwd}/programas/serie/mover_audio.ts ${videoId}`)
    console.log('Audio movido.')

    console.log('Procesando streams...')
    await execPromise(`bun ${cwd}/programas/serie/streams.ts ${videoId}`)
    console.log('Streams procesados.')

    console.log('Arreglando manifest...')
    await execPromise(`bun ${cwd}/programas/serie/arreglar_manifest.ts ${videoId}`)
    console.log('Manifest arreglado.')

    console.log('Obteniendo información...')
    await execPromise(`bun ${cwd}/programas/serie/info.ts ${videoId}`)
    console.log('Información obtenida.')

    console.log('Procesando assets...')
    await execPromise(`bun ${cwd}/programas/serie/assets.ts ${videoId}`)
    console.log('Assets procesados.')

    console.log('Moviendo datos...')
    await execPromise(`bun ${cwd}/programas/serie/mover_a_produccion.ts ${videoId}`)
    console.log('Datos movidos.')

    console.log('¡Proceso completado para el video:', videoId)
  } catch (error) {
    console.error('Ocurrió un error durante el procesamiento:', error)
    if (error.stderr) {
      console.error('Child process stderr:', error.stderr);
    }
  }
}

processVideo()