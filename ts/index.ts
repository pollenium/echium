import Web3 from 'web3'
import delay from 'delay'
import { Transaction } from 'ethereumjs-tx'
import { Uu } from 'pollenium-uvaursi'
import { Client, MissiveGenerator } from 'pollenium-anemone'
import path from 'path'

const client = new Client({
  signalingServerUrls: [
    `wss://begonia-us-1.herokuapp.com`,
    `wss://begonia-eu-1.herokuapp.com`,
  ],
  missiveLatencyTolerance: 30,
  sdpTimeout: 10,
  connectionTimeout: 10,
  bootstrapOffersTimeout: 5,
  maxFriendshipsCount: 6,
  maxOfferAttemptsCount: 2,
  maxOfferLastReceivedAgo: 30,
  offerReuploadInterval: 5
})

const applicationId = Uu.fromUtf8('eth.tx.0').genPaddedLeft(32)

const provider = new Web3.providers.WebsocketProvider('wss://mainnet.infura.io/ws/v3/4815963da6e14948bddcbea039e3383b')
const infura = new Web3(provider)

let transactionHashRequests = []

// @ts-ignore
infura.eth.subscribe('pendingTransactions', (error, transactionHash) => {
  if (error) {
    console.error(error)
  }

  if(transactionHashRequests.length > 1000) {
    return
  }

  transactionHashRequests.push({
    transactionHash,
    requestedAt: (new Date).getTime()
  })
})

function cullTransactionHashRequests() {
  const cutoff = (new Date).getTime() - 60000
  const cutoffIndex = transactionHashRequests.findIndex((transactionHashRequest) => {
    return transactionHashRequest.requestedAt >= cutoff
  })
  transactionHashRequests = transactionHashRequests.slice(cutoffIndex)
}

async function loopCullTransactionHashRequests() {
  cullTransactionHashRequests()
  await delay(1000)
  loopCullTransactionHashRequests()
}

loopCullTransactionHashRequests()

async function getTransactionData(transactionHash) {
  if (!transactionHash) {
    return null
  }
  return infura.eth.getTransaction(transactionHash)
}

async function getTransaction(transactionHash) {
  const transactionData = await getTransactionData(transactionHash)
  if (transactionData === null) {
    console.error('transactionData null')
    return null
  }
  console.dir(transactionData)
  const transaction = new Transaction({
    gasLimit: transactionData.gas,
    gasPrice: transactionData.gasPrice,
    to: transactionData.to,
    nonce: transactionData.nonce,
    data: transactionData.input,
    value: transactionData.value,
  })

  return transaction
}

async function handleTransactionHash(transactionHash) {
  console.log('handleTransactionHash', transactionHash)
  const transaction = await getTransaction(transactionHash)
  if (!transaction) {
    console.log('no transaction')
    return
  }
  const transactionSerialized = transaction.serialize()
  console.log('transactionSerialized', transactionSerialized)
  const missiveGenerator = new MissiveGenerator({
    applicationId,
    applicationData: transactionSerialized,
    difficulty: 0,
    hashcashWorkerUrl: require.resolve('pollenium-anemone/node/src/hashcash-worker'),
    ttl: 10
  })
  const missive = await missiveGenerator.fetchMissive()
  console.log('broadcast')
  client.broadcastMissive(missive)
  console.log('broadcasted')
}

const startedAt = new Date().getTime()

const softCutoff = (60 + (Math.random() * 15)) * 1000
const hardCutoff = (90 + (Math.random() * 15)) * 1000

async function run() {
  console.log('run')
  console.log('transactionHashRequests.length', transactionHashRequests.length)
  if (transactionHashRequests.length === 0) {
    console.log('no transaction hash')

    const now = new Date().getTime()
    const ellapsed = now - startedAt
    if (ellapsed > 10000) {
      console.log('exit')
      process.exit()
    }

    await delay(1000)
    run()
    return
  }
  const transactionHashRequest = transactionHashRequests.shift()
  console.log('transactionHashRequests.age', (new Date).getTime() - transactionHashRequest.requestedAt)
  await handleTransactionHash(transactionHashRequest.transactionHash)

  const now = new Date().getTime()
  const ellapsed = now - startedAt
  console.log('ellapsed', ellapsed)
  if (ellapsed > softCutoff) {
    console.log('softCutoff')
    process.exit()
  }

  await delay(1000)

  run()
}

run()

delay(hardCutoff).then(() => {
  throw new Error('hardCutoff')
})
