import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import {Timestamp} from 'firebase/firestore'

const app = admin.initializeApp()
const db = app.firestore()
const veiculos = db.collection('veiculos')
const irregularidades = db.collection('irregularidades')
const tickets = db.collection('tickets')


const placaRegex = /^([a-z]|\d){7}$/

interface ConsultaPlacaOptions {
  placa: string
}

interface RegistrarIrregularidadeOptions {
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

class ResultResponse {
  result: {
    status: string
    message: string
    payload: any
  }
  constructor(status: string, message: string, payload?: any) {
    this.result = {
      status,
      message,
      payload,
    }
  }
}

class ErrorResponse {
  error: {
    status: string
    message: string
    payload: any
  }
  constructor(status: string, message: string, payload?: any) {
    this.error = {
      status,
      message,
      payload,
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
            'Entrada inválida.', {input: options})
      }

      const query = await veiculos.where('placa', '==', placa).get()

      if (!query.docs[0] || !query.docs[0].exists) {
        return new ErrorResponse('E_DOC_NOT_FOUND',
            'Veículo não encontrado', options)
      }

      // const doc = query.docs[0].data()

      const ticketsQuery = await tickets.where('placa', '==', placa).get()

      const regular = false

      if (!ticketsQuery.empty) {
        ticketsQuery.forEach((ticket) => {
          const tData = ticket.data()
          const inicio = (tData.inicio as Timestamp).toMillis()
          const termino = (tData.termino as Timestamp).toMillis()
          console.log({inicio, termino})
        })
      }

      return new ResultResponse('SUCCESS', query.docs[0].id, {placa, regular})
    })

export const registrarIrregularidade = functions.region('southamerica-east1')
    .https.onCall(async (data) => {
      const options: RegistrarIrregularidadeOptions = data
      const doc = await irregularidades.add(options)
      return new ResultResponse('SUCCESS',
          'Irregularidade registrada com sucesso.', {documentId: doc.id})
    })

export const test = functions.region('southamerica-east1')
    .https.onRequest(async (req, res) => {
      const q = await tickets.where('placa', '==', 'abc1234').get()
      q.forEach((t) => {
        const tData = t.data()
        const inicio = (tData.inicio as Timestamp).toMillis()
        const termino = (tData.termino as Timestamp).toMillis()
        console.log({inicio, termino})
      })
    })
