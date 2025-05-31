import { readFile, readdir } from 'fs/promises'
import { parseStringPromise, Builder } from 'xml2js'
import path from 'path'
import fs from 'fs-extra'

async function processManifest(complexManifestPath, videoId) {
  try {
    const complexManifestXml = await readFile(complexManifestPath, 'utf-8');
    const complexManifestJson = await parseStringPromise(complexManifestXml, { explicitArray: false });

    const finalManifestJson = {
      MPD: {
        $: {
          xmlns: 'urn:mpeg:dash:schema:mpd:2011',
          minBufferTime: complexManifestJson.MPD.$.minBufferTime,
          type: complexManifestJson.MPD.$.type,
          mediaPresentationDuration: complexManifestJson.MPD.$.mediaPresentationDuration,
          maxSegmentDuration: complexManifestJson.MPD.$.maxSegmentDuration,
          profiles: complexManifestJson.MPD.$.profiles,
        },
        Period: {
          $: {
            id: '0',
            start: 'PT0.0S',
          },
          AdaptationSet: [],
        },
      },
    };

    const period = complexManifestJson.MPD.Period;
    if (period && Array.isArray(period.AdaptationSet) && period.AdaptationSet.length >= 2) {
      const videoAdaptationSetComplex = period.AdaptationSet[0];
      const audioAdaptationSetComplex = period.AdaptationSet[1];

      // Procesar el AdaptationSet de video
      const newVideoAdaptationSet = {
        $: {
          id: 0,
          contentType: 'video',
          startWithSAP: videoAdaptationSetComplex.$.startWithSAP,
          segmentAlignment: videoAdaptationSetComplex.$.segmentAlignment,
          ...(videoAdaptationSetComplex.$.maxFrameRate && { maxFrameRate: videoAdaptationSetComplex.$.maxFrameRate }),
          ...(videoAdaptationSetComplex.$.maxWidth && { maxWidth: videoAdaptationSetComplex.$.maxWidth }),
          ...(videoAdaptationSetComplex.$.maxHeight && { maxHeight: videoAdaptationSetComplex.$.maxHeight }),
          ...(videoAdaptationSetComplex.$.par && { par: videoAdaptationSetComplex.$.par }),
        },
        Representation: [],
      };

      let adaptationSetSegmentTemplate = {};
      if (videoAdaptationSetComplex.SegmentTemplate?.$) {
        adaptationSetSegmentTemplate = { ...videoAdaptationSetComplex.SegmentTemplate.$ };
      }

      console.log('adaptationSetSegmentTemplate', adaptationSetSegmentTemplate)

      const videoRepresentations = Array.isArray(videoAdaptationSetComplex.Representation) ? videoAdaptationSetComplex.Representation : [videoAdaptationSetComplex.Representation];

      for (const representation of videoRepresentations) {
        const id = representation.$.id;
        const mimeType = representation.$.mimeType;
        const codecs = representation.$.codecs;
        const bandwidth = representation.$.bandwidth;
        const width = representation.$.width;
        const height = representation.$.height;
        const sar = representation.$.sar;
        console.log(representation.$)
        // console.log("ID de representación de video:", id);

        if (!adaptationSetSegmentTemplate) {
          console.warn(`No se encontró SegmentTemplate en el AdaptationSet de video.`);
          continue; // Saltar si no hay SegmentTemplate en el AdaptationSet
        }

        const startNumber = adaptationSetSegmentTemplate.startNumber;
        // const duration = adaptationSetSegmentTemplate.duration; // No debo confiar en este valor, sino en durationInSeconds, duration se redondea mal
        const representationDuration = finalManifestJson.MPD.$.mediaPresentationDuration;
        const sep = `${representationDuration}`.split('PT')[1];
        const hrs = sep.split('H')[0];
        const mins = sep.split('H')[1].split('M')[0];
        const secs = sep.split('M')[1].split('S')[0];
        const duration = (hrs * 3600) + (mins * 60) + (secs * 1);
        const realSegmentCount = duration / 4 // solo para cuentas, "físicamente" segmentCount es más correcto
        // const timescale = adaptationSetSegmentTemplate.timescale; // <- esto está mal, no es el valor correcto para 35nV_M3asRs
        const timescale = duration * realSegmentCount
        const durationCrossTimescale = duration * timescale / realSegmentCount
        // console.log(timescale, adaptationSetSegmentTemplate)
        // console.log({duration, timescale})

        // const initialization = adaptationSetSegmentTemplate.initialization.replace('$RepresentationID$', id);
        // const media = adaptationSetSegmentTemplate.media.replace('$RepresentationID$', id).replace('$Number$', '$Number$.m4s'); // Modificado: sin %05d

        const newRepresentation = {
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
              timescale: timescale,
              initialization: `$RepresentationID$_.mp4`, // Modificado: usando $RepresentationID$
              media: `$RepresentationID$_$Number$.m4s`, // Modificado: usando $RepresentationID$ y sin %05d
              startNumber: startNumber,
              ...(duration && { duration: durationCrossTimescale }), // Añadir la duración
            },
            SegmentTimeline: {
              S: [],
            },
          },
        };
        try {
          const resolutionFolder = path.join(process.cwd(), 'resultados', videoId, id.split('/')[0]); // Usamos el id completo para la ruta
          const files = await readdir(resolutionFolder);
          const videoFiles = files.filter(file => file.endsWith('.m4s') && !file.includes('init'));
          const segmentCount = videoFiles.length;
          // console.log({segmentCount})
          // console.log(duration * Number(segmentCount) / Number(timescale))
          const timescaleForCalculation = Number(timescale);

          if (!isNaN(duration) && !isNaN(timescaleForCalculation) && segmentCount > 0) {
            // console.log({segmentDurationInTimescale: durationCrossTimescale, segmentCount, realSegmentCount, timescale, duration})
            for (let i = 0; i < segmentCount; i++) {
              let d = timescale * duration / Math.floor(realSegmentCount)
              if (i + 1 > realSegmentCount) {
                // 241.069 / 4 = 60.26725
                // 48561.57167213115
                const res = d - ((timescale * duration) / realSegmentCount)
                d = res
                // console.log({timescale, duration, rest: realSegmentCount - Math.floor(realSegmentCount), res: timescale * duration / realSegmentCount - Math.floor(realSegmentCount)})
              }
              // console.log({ i, segmentCount, realSegmentCount, d, timescale, duration })
              newRepresentation.SegmentTemplate.SegmentTimeline.S.push({ $: { d, ...(i === 0 && { t: 0 }) } }); // Añadir t="0" al primer S
            }
          }
        } catch (error) {
          console.error(`Error reading directory or calculating segment duration for video ${id}:`, error);
        }

        newVideoAdaptationSet.Representation.push(newRepresentation);
      }

      finalManifestJson.MPD.Period.AdaptationSet.push(newVideoAdaptationSet);

      // Procesar el AdaptationSet de audio
      // console.log(audioAdaptationSetComplex, audioAdaptationSetComplex.Representation, audioAdaptationSetComplex.Representation.AudioChannelConfiguration)
      const newAudioAdaptationSet = {
        $: {
          id: 1,
          contentType: 'audio',
          startWithSAP: audioAdaptationSetComplex.$.startWithSAP,
          segmentAlignment: audioAdaptationSetComplex.$.segmentAlignment,
          lang: audioAdaptationSetComplex.$.lang,
        },
        SegmentTemplate: {
          $: {
            media: `$RepresentationID$_$Number$.m4s`, // Modificado: sin %05d
            initialization: `$RepresentationID$_.mp4`,
            timescale: audioAdaptationSetComplex.SegmentTemplate.$.timescale,
            startNumber: audioAdaptationSetComplex.SegmentTemplate.$.startNumber,
            duration: audioAdaptationSetComplex.SegmentTemplate.$.duration,
          },
        },
        Representation: { // Movido después de SegmentTemplate
          $: {
            id: 'audio/audio',
            mimeType: audioAdaptationSetComplex.Representation.$.mimeType,
            codecs: audioAdaptationSetComplex.Representation.$.codecs.toString().toLowerCase(),
            bandwidth: audioAdaptationSetComplex.Representation.$.bandwidth,
            audioSamplingRate: audioAdaptationSetComplex.Representation.$.audioSamplingRate,
          },
          AudioChannelConfiguration: audioAdaptationSetComplex.Representation.AudioChannelConfiguration,
        },
      };

      finalManifestJson.MPD.Period.AdaptationSet.push(newAudioAdaptationSet);
    }

    const builder = new Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } });
    const finalManifestXml = builder.buildObject(finalManifestJson);

    // console.log(finalManifestXml);

    // console.log(process.cwd())
    fs.writeFileSync(`${process.cwd()}/resultados/${videoId}/manifest.mpd`, finalManifestXml)

  } catch (error) {
    console.error('Error processing manifest:', error);
  }
}


// fsp.readdir('videos')
//   .then(videos => {
//     for (const id of videos) {
//       const path = `resultados/${id}/manifest.mpd`
//       processManifest(path, id)
//     }
//   })

const videoId = 'GhMkNB_D2xg' // VOChndxKi6U | 35nV_M3asRs | h9iYg1-N5BU | JQ2913bVo30 | GhMkNB_D2xg
const complexManifestPath = `${process.cwd()}/resultados/${videoId}/mp4box_manifest.mpd`
processManifest(complexManifestPath, videoId);