process.on('unhandledRejection', (error) => { throw error })

const Web3 = require('web3');
const Worker = require('tiny-worker')
const WebSocket = require('isomorphic-ws')
const wrtc = require('wrtc')
const delay = require('delay')
const Transaction = require('ethereumjs-tx').Transaction
const pollenium = require('pollenium-anemone/node')
const Bn = require('bn.js')

const polleniumClient = new pollenium.Client({
  signalingServerUrls: [
    `wss://begonia-us-1.herokuapp.com`,
    `wss://begonia-eu-1.herokuapp.com`,
  ],
  Worker: Worker,
  WebSocket: WebSocket,
  wrtc: wrtc,
  hashcashWorkerUrl: `${__dirname}/node_modules/pollenium-anemone/node/hashcash-worker.js`
})

const applicationId = pollenium.Bytes.fromUtf8('eth.tx.0').getPaddedLeft(32)

const provider = new Web3.providers.WebsocketProvider('wss://mainnet.infura.io/ws/v3/4815963da6e14948bddcbea039e3383b')
const infura = new Web3(provider)

let transactionHash

infura.eth.subscribe('pendingTransactions', (error, _transactionHash) => {
  transactionHash = _transactionHash
})

async function getTransactionData(transactionHash) {
  if (!transactionHash) {
    return null
  }
  return infura.eth.getTransaction(transactionHash)
}

async function getTransaction(transactionHash) {
  const transactionData = await getTransactionData(transactionHash)
  if (transactionData === null) {
    return null
  }
  console.dir(transactionData)
  const transaction = new Transaction({
    gasLimit: new Bn(transactionData.gas),
    gasPrice: new Bn(transactionData.gasPrice),
    to: transactionData.to,
    nonce: new Bn(transactionData.nonce),
    data: transactionData.input,
    value: new Bn(transactionData.value),
    v: transactionData.v,
    r: transactionData.r,
    s: transactionData.s
  })

  console.log((new pollenium.Bytes(transaction.hash())).getHex())
  return transaction
}

async function handleTransactionHash(transactionHash) {
  console.log('handleTransactionHash', transactionHash)
  const transaction = await getTransaction(transactionHash)
  if (!transaction) {
    console.log('no transaction')
    return
  }
  if (!transaction.verifySignature()) {
    console.log('bad sig')
    return
  }
  const transactionSerialized = transaction.serialize()
  console.log('transactionSerialized', transactionSerialized)
  const missiveGenerator = new pollenium.MissiveGenerator(
    polleniumClient,
    applicationId,
    pollenium.Bytes.fromBuffer(transactionSerialized),
    4
  )
  console.log('fetchMissive')
  const missive = await missiveGenerator.fetchMissive()
  console.log('broadcast')
  missive.broadcast()
  console.log('broadcasted')
}

const startedAt = new Date

const softCutoff = (60 + (Math.random() * 15)) * 1000
const hardCutoff = (90 + (Math.random() * 15)) * 1000

async function run() {
  console.log('run')
  if (!transactionHash) {
    console.log('no transaction hash')

    const now = new Date
    const ellapsed = now - startedAt
    if (ellapsed > 5000) {
      console.log('exit')
      process.exit()
    }

    await delay(1000)
    run()
    return
  }
  await handleTransactionHash(transactionHash)

  const now = new Date
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
