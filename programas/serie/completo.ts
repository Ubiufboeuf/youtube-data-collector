// Haría falta un programa para descargar los videos, pero al menos esto por ahora funciona.

import { verificarElementos } from './verificar_elementos'
import { unir } from './unir'
import { separar_audio } from './separar_audio'
import { separar_video } from './separar_video'
import { crear_resoluciones } from './crear_resoluciones'
import { mover_audio } from './mover_audio'
import { streams } from './streams'
import { assets } from './assets'
import { info } from './info'
import { arreglar_manifest } from './arreglar_manifest'
import { descargar } from './descargar'

const videoId = 'y1uzBncUsQQ' // y1uzBncUsQQ | JQ2913bVo30 | YgmFIVOR1-I | GhMkNB_D2xg
const resoluciones = [
  '32p',
  '144p',
  '360p',
  // '720p'
] // Si quieres quitar una resolución no la elimines, coméntala

// /*[x]*/ verificarElementos(videoId)
// /*[x]*/ descargar(videoId)
// /*[ ]*/ // podría hacer que se itere la lista de descargados para que se haga esto con todos los videos
// /*[x]*/ unir(videoId)
// /*[x]*/ separar_audio(videoId)
// /*[x]*/ separar_video(videoId)
// /*[x]*/ crear_resoluciones(videoId, resoluciones)
// /*[x]*/ mover_audio(videoId)
// /*[x]*/ streams(videoId)
// /*[x]*/ await arreglar_manifest(videoId, resoluciones)
// /*[x]*/ info(videoId)
// /*[x]*/ await assets(videoId)