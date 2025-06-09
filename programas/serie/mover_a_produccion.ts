import { copySync } from 'fs-extra'
import { readdirSync } from 'node:fs'

export const URL_SERVER_YOUTUBE_CLONE = '/home/mango/Dev/server-youtube-clone'

// Esto es para mover los datos a server-youtube-clone
moverAProduccion()

async function moverAProduccion () {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }
  console.log('- moverAProducción')

  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }

  try {
    readdirSync(URL_SERVER_YOUTUBE_CLONE)
  } catch {
    console.error(`Error leyendo ${URL_SERVER_YOUTUBE_CLONE}, se tiene esa ruta como ubicación del backend del clon de youtube, como no se pudo leer no se moverán automáticamente los datos.`)
    return
  }

  console.log(`Ten en cuenta que se moverán los datos, en base a ${URL_SERVER_YOUTUBE_CLONE}, a src/info/[videoId].json, public/assets/[videoId], public/channels/[uploaderId], y a public/videos/[videoId]`)

  try {
    copySync(`recursos/assets/${videoId}`, `${URL_SERVER_YOUTUBE_CLONE}/public/assets/${videoId}`)
    copySync(`resultados/${videoId}`, `${URL_SERVER_YOUTUBE_CLONE}/public/videos/${videoId}`)
    copySync(`recursos/info/${videoId}.json`, `${URL_SERVER_YOUTUBE_CLONE}/src/info/${videoId}.json`)
  } catch (e) {
    const error = new Error(e)
    console.error('Hubo un error moviendo los datos a producción:', error.message)
  }
}