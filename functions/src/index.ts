import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

const app = admin.initializeApp()
const db = app.firestore()
const veiculos = db.collection('veiculos')

const placaRegex = /^([a-z]|\d){7}$/

export const consultaPlaca = functions
    .region('southamerica-east1')
    .https.onRequest(async (req, res) => {
      const placa = req.query.placa as string | undefined

      if (!placa) {
        res.status(400).send('E_PLACA_MISSING')
        return
      }
      if (!placaRegex.test(placa)) {
        res.status(400).send('E_PLACA_INVALID')
        return
      }

      const query = await veiculos.where('placa', '==', placa).get()

      if (!query.docs[0] || !query.docs[0].exists) {
        res.status(400).send('E_DOC_NOT_FOUND')
        return
      }

      const doc = query.docs[0].data()

      res.send(doc)
    })
