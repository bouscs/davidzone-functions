import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import ResultResponse from './ResultResponse'
import ErrorResponse from './ErrorResponse'
import * as geofire from 'geofire-common'

const app = admin.initializeApp()
const db = app.firestore()
const veiculos = db.collection('veiculos')
const irregularidades = db.collection('irregularidades')
const tickets = db.collection('tickets')
const desvios = db.collection('desvios')
const itinerarios = db.collection('itinerarios')
const placaRegex = /^([a-z]|\d){7}$/

interface ConsultaPlacaOptions {
  placa: string;
}

interface RegistrarIrregularidadeData {
  irregularidade: {
    tipo: '1' | '2';
    imagens: string[];
    placa: string;
    fiscal: {
      nome: string;
      uid: string;
    };
  };
}

export const consultaPlaca = functions
    .region('southamerica-east1')
    .https.onCall(async (data, context) => {
      const options: ConsultaPlacaOptions = data
      const placa = options.placa

      if (!placaRegex.test(placa)) {
        return new ErrorResponse('E_INVALID_INPUT', 'Entrada inválida.', {
          input: options,
        })
      }

      const query = await veiculos.where('placa', '==', placa).get()

      if (!query.docs[0] || !query.docs[0].exists) {
        return new ErrorResponse(
            'E_DOC_NOT_FOUND',
            'Veículo não encontrado',
            options
        )
      }

      const ticketsQuery = await tickets.where('placa', '==', placa).get()

      const regular = ticketsQuery.empty ?
      false :
      ticketsQuery.docs.some(doc => {
        const data = doc.data()

        if (!data.inicio || !data.termino) {
          return false
        }

        const termino = (data.termino as Timestamp).toMillis()
        const cincoMin = 1000 * 60 * 5

        return termino > Date.now() + cincoMin
      })

      return new ResultResponse('SUCCESS', query.docs[0].id, { placa, regular })
    })

export const registrarIrregularidade = functions
    .region('southamerica-east1')
    .https.onCall(async data => {
      const options: RegistrarIrregularidadeData = data
      const doc = await irregularidades.add(options)
      return new ResultResponse(
          'SUCCESS',
          'Irregularidade registrada com sucesso.',
          { documentId: doc.id }
      )
    })

export const enviarLocalizacao = functions
    .region('southamerica-east1')
    .https.onCall(async data => {
      if (!data.uid || typeof data.uid !== 'string') {
        return new ErrorResponse('E_INVALID_INPUT', 'UID inválido.')
      }
      if (
        !data.localizacao ||
      typeof data.localizacao.lat !== 'number' ||
      typeof data.localizacao.long !== 'number'
      ) {
        return new ErrorResponse('E_INVALID_INPUT', 'Localização inválida.')
      }
      if (
        !data.pontoItinerario ||
      typeof data.pontoItinerario.lat !== 'number' ||
      typeof data.pontoItinerario.long !== 'number'
      ) {
        return new ErrorResponse(
            'E_INVALID_INPUT',
            'Ponto do itinerário inválido.'
        )
      }

      const uid: string = data.uid

      const localizacao = new admin.firestore.GeoPoint(
          data.localizacao.lat,
          data.localizacao.long
      )
      const pontoItinerario = new admin.firestore.GeoPoint(
          data.pontoItinerario.lat,
          data.pontoItinerario.long
      )

      const distanciaKm = geofire.distanceBetween(
          [localizacao.latitude, localizacao.longitude],
          [pontoItinerario.latitude, pontoItinerario.longitude]
      )

      const desvio = distanciaKm >= 0.1

      if (desvio) {
        await desvios.add({
          uid,
          localizacao,
          pontoItinerario,
        })
      }

      return new ResultResponse('SUCCESS', 'Localização enviada com sucesso', {
        distanciaKm,
        desvio,
        uid,
      })
    })

export const getItinerario = functions
    .region('southamerica-east1')
    .https.onCall(async data => {
      const query = await itinerarios.get()
      const itinerario =
      query.docs[Math.round(Math.random() * (query.docs.length - 1))].data()

      return new ResultResponse(
          'SUCCESS',
          'Itinerário encontrado com sucesso.', {
            itinerario,
          })
    })
