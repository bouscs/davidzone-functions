import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import ResultResponse from './ResultResponse'
import ErrorResponse from './ErrorResponse'

const app = admin.initializeApp()
const db = app.firestore()
const veiculos = db.collection('veiculos')
const irregularidades = db.collection('irregularidades')
const tickets = db.collection('tickets')
const placaRegex = /^([a-z]|\d){7}$/

interface ConsultaPlacaOptions {
  placa: string
}

interface RegistrarIrregularidadeData {
  irregularidade: {
    tipo: '1' | '2'
    imagens: string[]
    placa: string
    fiscal: {
      nome: string
      uid: string
    }
  }
}

export const consultaPlaca = functions
    .region('southamerica-east1')
    .https.onCall(async (data, context) => {
      const options: ConsultaPlacaOptions = data
      const placa = options.placa

      if (!placaRegex.test(placa)) {
        return new ErrorResponse('E_INVALID_INPUT',
            'Entrada inválida.', { input: options })
      }

      const query = await veiculos.where('placa', '==', placa).get()

      if (!query.docs[0] || !query.docs[0].exists) {
        return new ErrorResponse('E_DOC_NOT_FOUND',
            'Veículo não encontrado', options)
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

          return termino > (Date.now() + cincoMin)
        })

      return new ResultResponse('SUCCESS', query.docs[0].id, { placa, regular })
    })

export const registrarIrregularidade = functions.region('southamerica-east1')
    .https.onCall(async data => {
      const options: RegistrarIrregularidadeData = data
      const doc = await irregularidades.add(options)
      return new ResultResponse('SUCCESS',
          'Irregularidade registrada com sucesso.', { documentId: doc.id })
    })
