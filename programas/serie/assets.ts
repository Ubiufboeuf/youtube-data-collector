import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Thumbnail, YTVideoInfo } from '../../env'
import { mkdirpSync } from 'fs-extra'
import { spawnSync } from 'node:child_process'

assets()

// export async function assets (videoId: string) {
export async function assets () {
  const videoId = process.argv[2]
  if (!videoId) {
    console.error('Falta especificar el id del video')
    return
  }
  console.log('- assets:', videoId)
  let info: YTVideoInfo
  try {
    const data = readFileSync(`recursos/info/${videoId}.json`)
    info = JSON.parse(data.toString())
  } catch {
    console.error(`Hubo un error leyendo el archivo de información de ${videoId}, omitiendo el manejo de assets`)
    return
  }

  const images: string[] = []
  images.push(info.thumbnail ?? '')

  const path = `recursos/assets/${videoId}`
  const newThumbnails: Thumbnail[] = []
  let minimalCreated = false
  let highCreated = false

  info.thumbnails?.forEach(async (img) => {
    if (!img.url) return
    await saveImage(img)

    // console.log('thumbnails:', newThumbnails)
    info.thumbnails = newThumbnails

    let prevHeight = 0
    let id = ''
    info.thumbnails?.forEach(t => {
      if (Number(t.height) > prevHeight) {
        prevHeight = Number(t.height)
        id = `${t.id}`
      }
    })
    // console.log(prevHeight, id)

    info.thumbnail = info.thumbnails?.find(t => t.id === id)?.url ?? ''

    if (highCreated && !minimalCreated) { 
      const inp = readdirSync(`recursos/assets/${videoId}`)
      if (info.thumbnails.some(t => t.id === '0')) return

      const high = inp.find(i => i.includes('4_high'))
      const params = ['-i', `recursos/assets/${videoId}/${high}`, '-vf', 'scale=64:-1', `recursos/assets/${videoId}/0_minimal.webp`]
      spawnSync('ffmpeg', params)

      const params2 = [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        `recursos/assets/${videoId}/0_minimal.webp`
      ]
      
      const ffprobe = spawnSync('ffprobe', params2)
      const imgInfo = JSON.parse(ffprobe.stdout.toString())
      const width = imgInfo.streams[0].width
      const height = imgInfo.streams[0].height

      if (info.thumbnails.some(t => t.id === '0')) return

      info.thumbnails.filter(t => t.id === '0')

      info.thumbnails.push({
        height,
        width,
        id: '0',
        resolution: `${width}x${height}`,
        url: `${videoId}/0_minimal.webp`
      })

      info.minimalThumbnail = `${videoId}/0_minimal.webp`

      minimalCreated = true
    }
    
    writeFileSync(`recursos/info/${videoId}.json`, JSON.stringify(info, null, 2), 'utf8')
  })

  async function saveImage (img: Thumbnail) {
    if (!img.url) return
    try {
      new URL(img.url)
    } catch {
      console.error('url inválida')
      return
    }
    const data = await fetch(img.url)
    const buffer = await data.arrayBuffer()
    const type = data.headers.get('content-type')
    const format = type?.split('/')[1] ?? 'jpeg'

    let name = ''
    const h = Number(img.height)
    if (h < 120) name = '1_low'
    else if (h < 140) name = '2_mid_low'
    else if (h < 400) name = '3_mid_high'
    else if (h < 800) { name = '4_high'; highCreated = true }
    else return

    mkdirpSync(path)
    const exist = newThumbnails.some(t => t.url?.includes(name))
    console.log({exist, img})
    if (exist) return
    
    newThumbnails.push({
      ...img,
      url: `${videoId}/${name}.${format}`
    })
    console.log({newThumbnails})
    writeFileSync(`${path}/${name}.${format}`, Buffer.from(buffer))
  }
}