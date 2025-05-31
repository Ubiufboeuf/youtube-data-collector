import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs-extra'

arreglar_manifest()

type VideoInfo = { [key: string]: string | number | boolean }

// export async function arreglar_manifest (videoId: string, resoluciones: string[] = RESOLUCIONES_POR_DEFECTO) {
export async function arreglar_manifest () {
  const videoId = process.argv[2]
  console.log('- arreglar_manifest:', videoId)
  let folder: string[]
  try {
    folder = readdirSync(`resultados/${videoId}`)
  } catch {
    console.error(`No se pudo leer resultados/${videoId}`)
    return
  }
  let existeManifestDeMp4box = false
  let existeManifest = false
  const videoInfo: VideoInfo = {}

  for (const file of folder) {
    if (file === 'mp4box_manifest.mpd') {
      existeManifestDeMp4box = true
    }
    if (file === 'manifest.mpd') {
      existeManifest = true
    }
  }

  if (existeManifest) {
    console.log(`Ya existe el manifest de ${videoId}, omitiendo`)
    return
  }

  if (!existeManifestDeMp4box) {
    console.error(`No se encontró el manifest creado por mp4box de ${videoId} en resultados/${videoId}/, omitiendo`)
    return
  }

  await convertir(videoId, videoInfo)
}

async function convertir (videoId: string, videoInfo: VideoInfo) {
  const { parseStringPromise, Builder } = await import('xml2js')

  const SEGMENT_DURATION = 4
  const REPRESENTATION_INITIALIZATION = `$RepresentationID$_.mp4`
  const REPRESENTATION_SEGMENTS = `$RepresentationID$_$Number$.m4s`

  const videoPath = `resultados/${videoId}`
  const manifestBasePath = `${videoPath}/mp4box_manifest.mpd`

  let manifestBaseXml: string
  try {
    manifestBaseXml = readFileSync(manifestBasePath, 'utf-8')
  } catch {
    console.error(`No se pudo leer ${manifestBasePath}`)
    return
  }

  let manifestBase: any
  try {
    manifestBase = await parseStringPromise(manifestBaseXml, { explicitArray: false })
  } catch {
    console.error(`Hubo un error consiguiendo un valor para manifestBase`)
  }
  const { $: manifestBaseAttributes, Period: manifestBasePeriod } = manifestBase.MPD

  const manifest: { [key: string]: any } = {
    MPD: {
      $: {
        xmlns: 'urn:mpeg:dash:schema:mpd:2011',
        minBufferTime: manifestBaseAttributes.minBufferTime,
        type: manifestBaseAttributes.type,
        mediaPresentationDuration: manifestBaseAttributes.mediaPresentationDuration,
        maxSegmentDuration: manifestBaseAttributes.maxSegmentDuration,
        profiles: manifestBaseAttributes.profiles,
      },
      Period: {
        $: {
          id: '0',
          start: 'PT0.0S',
        },
        AdaptationSet: [],
      }
    }
  }
  
  const AdaptationSet = manifestBasePeriod?.AdaptationSet
  if (Array.isArray(AdaptationSet) && AdaptationSet.length < 2) {
    console.error(`Al period del manifest de ${videoId} le faltan adaptationSets`)
    return
  }
  
  const manifestMPDAttributes = manifest.MPD.$

  let videoAdaptationSet: { [key: string]: any }
  let audioAdaptationSet: { [key: string]: any }

  try {
    // CUIDADO, por comodidad se asume que el video va primero y el audio va después, cuidado con el orden
    videoAdaptationSet = AdaptationSet[0]
    audioAdaptationSet = AdaptationSet[1]
  } catch {
    console.error(`No se pudo dar valor a los adaptionSetsAttributes del video y audio de ${videoId}, asegurate de que el mp4box_manifest tenga un valor correcto`)
    return
  }

  const { $: videoAdaptationSetAttributes, SegmentTemplate: videoSegmentTemplate, Representation: videoRepresentations } = videoAdaptationSet
  const { $: audioAdaptationSetAttributes, SegmentTemplate: audioSegmentTemplate, Representation: audioRepresentations } = audioAdaptationSet

  const newVideoAdaptationSet: { [key: string]: any } = {
    $: {
      id: 0,
      contentType: 'video',
      startWithSAP: videoAdaptationSetAttributes.startWithSAP,
      segmentAlignment: videoAdaptationSetAttributes.segmentAlignment,
      ...(videoAdaptationSetAttributes.maxFrameRate && { maxFrameRate: videoAdaptationSetAttributes.maxFrameRate }),
      ...(videoAdaptationSetAttributes.maxWidth && { maxWidth: videoAdaptationSetAttributes.maxWidth }),
      ...(videoAdaptationSetAttributes.maxHeight && { maxHeight: videoAdaptationSetAttributes.maxHeight }),
      ...(videoAdaptationSetAttributes.par && { par: videoAdaptationSetAttributes.par }),
    },
    Representation: []
  }

  if (!videoSegmentTemplate?.$) {
    console.error('El segmentTemplate de videoAdaptationSet no tiene atributos')
    return
  }

  if (!Array.isArray(videoRepresentations)) {
    console.error(`El adaptationSet de video no es array. Si elegiste más de una resolución y ves esto es que hubo un error y sólo se está manejando una resolución`)
    return
  }

  const { $: videoSegmentTemplateAttributes } = videoSegmentTemplate
  if (!videoSegmentTemplateAttributes) {
    console.error(`No se encontraron atributos en el segmentTemplate de video`)
  }

  function getDurationByDurationTime (str: string): number {
    const hoursStr = str.split('H')[0] || '0'
    const minutesStr = str.split('H')[1].split('M')[0] || '0'
    const secondsStr = str.split('M')[1].split('S')[0] || '0'
    const duration = Number(hoursStr) * 3600 + Number(minutesStr) * 60 + Number(secondsStr)
    return duration
  }

  const { startNumber } = videoSegmentTemplateAttributes
  const repDurationStr = manifestMPDAttributes.mediaPresentationDuration
  const repDurationTimeStr = `${repDurationStr}`.split('PT')[1]
  const duration = getDurationByDurationTime(repDurationTimeStr)
  videoInfo.duration = duration
  const decimalSegmentCount = duration / SEGMENT_DURATION // ej: 216 / 4 = 54
  // ↑ sólo para algunas cuentas, para otras es mejor integerSegmentCount por no tener decimales
  const timeScale = duration * decimalSegmentCount
  const durationPerSegment = Math.pow(duration, 2)

  for (const representation of videoRepresentations) {
    const repAttributes = representation.$
    if (!repAttributes) continue

    const { id, mimeType, codecs, bandwidth, width, height, sar } = repAttributes
    const newRepresentation: { [key: string]: any } = {
      $: {
        id: id,
        mimeType: mimeType,
        codecs: codecs,
        bandwidth: bandwidth,
        ...(width && { width }),
        ...(height && { height }),
        ...(sar && { sar }),
      },
      SegmentTemplate: {
        $: {
          timescale: timeScale,
          initialization: REPRESENTATION_INITIALIZATION,
          media: REPRESENTATION_SEGMENTS,
          startNumber,
          duration: durationPerSegment
        },
        SegmentTimeline: {
          S: []
        }
      }
    }

    const idName = id.split('/')[0]
    const resolutionFolder = `resultados/${videoId}/${idName}`
    let files: string[]
    try {
      files = readdirSync(resolutionFolder)
    } catch {
      console.warn(`No se pudo leer ${resolutionFolder}, continuando`)
      continue
    }
    
    const streamSegments = files.filter(file => file.endsWith('.m4s') && !file.includes('init'))
    const integerSegmentCount = streamSegments.length

    if (integerSegmentCount === 0) {
      console.log(`No hay segmentos en resultados/${videoId}/${representation}, continuando`)
      continue
    }

    // uso while en vez de for porque si
    let i = 0
    while (i < integerSegmentCount) {
      // por si cuesta leerlo, es la duración del segmento iterado
      let durationForSegmentOfIteration = timeScale * duration / Math.floor(decimalSegmentCount)
      // ojo, no es lo mismo que durationPerSegment, acá puede cambiar por el Math.floor
      if (i + 1 > decimalSegmentCount) {
        durationForSegmentOfIteration = durationForSegmentOfIteration - durationPerSegment
      }
      const attributes = { $: { d: durationForSegmentOfIteration, ...(i === 0 && { t: 0 }) } }
      newRepresentation.SegmentTemplate.SegmentTimeline.S.push(attributes)
      i++
    }

    newVideoAdaptationSet.Representation.push(newRepresentation)
  }

  manifest.MPD.Period.AdaptationSet.push(newVideoAdaptationSet)

  if (!audioSegmentTemplate.$) {
    console.error('El segmentTemplate de audioAdaptationSet no tiene atributos')
    return
  }

  const newAudioAdaptationSet = {
    $: {
      id: 1,
      contentType: 'audio',
      startWithSAP: audioAdaptationSetAttributes.startWithSAP,
      segmentAlignment: audioAdaptationSetAttributes.segmentAlignment,
      lang: audioAdaptationSetAttributes.lang,
    },
    SegmentTemplate: {
      $: {
        media: REPRESENTATION_SEGMENTS,
        initialization: REPRESENTATION_INITIALIZATION,
        timescale: audioSegmentTemplate.$.timescale,
        startNumber: audioSegmentTemplate.$.startNumber,
        duration: audioSegmentTemplate.$.duration,
      },
    },
    Representation: {
      $: {
        id: 'audio/audio',
        mimeType: audioRepresentations.$.mimeType,
        codecs: audioRepresentations.$.codecs.toString().toLowerCase(),
        bandwidth: audioRepresentations.$.bandwidth,
        audioSamplingRate: audioRepresentations.$.audioSamplingRate,
      },
      AudioChannelConfiguration: audioRepresentations.AudioChannelConfiguration,
    }
  }

  manifest.MPD.Period.AdaptationSet.push(newAudioAdaptationSet)

  // console.log(manifest.MPD.Period.AdaptationSet[0].Representation[0].SegmentTemplate.SegmentTimeline)
  const builder = new Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } })
  const manifestXml = builder.buildObject(manifest)

  writeFileSync(`resultados/${videoId}/manifest.mpd`, manifestXml)
  unlinkSync(`resultados/${videoId}/mp4box_manifest.mpd`)
}
