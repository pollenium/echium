"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var web3_1 = __importDefault(require("web3"));
var delay_1 = __importDefault(require("delay"));
var ethereumjs_tx_1 = require("ethereumjs-tx");
var pollenium_uvaursi_1 = require("pollenium-uvaursi");
var pollenium_anemone_1 = require("pollenium-anemone");
var client = new pollenium_anemone_1.Client({
    signalingServerUrls: [
        "wss://begonia-us-1.herokuapp.com",
        "wss://begonia-eu-1.herokuapp.com",
    ],
    missiveLatencyTolerance: 30,
    sdpTimeout: 10,
    connectionTimeout: 10,
    bootstrapOffersTimeout: 5,
    maxFriendshipsCount: 6,
    maxOfferAttemptsCount: 2,
    maxOfferLastReceivedAgo: 30,
    offerReuploadInterval: 5
});
var applicationId = pollenium_uvaursi_1.Uu.fromUtf8('eth.tx.0').genPaddedLeft(32);
var provider = new web3_1["default"].providers.WebsocketProvider('wss://mainnet.infura.io/ws/v3/4815963da6e14948bddcbea039e3383b');
var infura = new web3_1["default"](provider);
var transactionHashRequests = [];
// @ts-ignore
infura.eth.subscribe('pendingTransactions', function (error, transactionHash) {
    if (error) {
        console.error(error);
    }
    if (transactionHashRequests.length > 1000) {
        return;
    }
    transactionHashRequests.push({
        transactionHash: transactionHash,
        requestedAt: (new Date).getTime()
    });
});
function cullTransactionHashRequests() {
    var cutoff = (new Date).getTime() - 60000;
    var cutoffIndex = transactionHashRequests.findIndex(function (transactionHashRequest) {
        return transactionHashRequest.requestedAt >= cutoff;
    });
    transactionHashRequests = transactionHashRequests.slice(cutoffIndex);
}
function loopCullTransactionHashRequests() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cullTransactionHashRequests();
                    return [4 /*yield*/, delay_1["default"](1000)];
                case 1:
                    _a.sent();
                    loopCullTransactionHashRequests();
                    return [2 /*return*/];
            }
        });
    });
}
loopCullTransactionHashRequests();
function getTransactionData(transactionHash) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!transactionHash) {
                return [2 /*return*/, null];
            }
            return [2 /*return*/, infura.eth.getTransaction(transactionHash)];
        });
    });
}
function getTransaction(transactionHash) {
    return __awaiter(this, void 0, void 0, function () {
        var transactionData, transaction;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTransactionData(transactionHash)];
                case 1:
                    transactionData = _a.sent();
                    if (transactionData === null) {
                        console.error('transactionData null');
                        return [2 /*return*/, null];
                    }
                    console.dir(transactionData);
                    transaction = new ethereumjs_tx_1.Transaction({
                        gasLimit: transactionData.gas,
                        gasPrice: transactionData.gasPrice,
                        to: transactionData.to,
                        nonce: transactionData.nonce,
                        data: transactionData.input,
                        value: transactionData.value
                    });
                    return [2 /*return*/, transaction];
            }
        });
    });
}
function handleTransactionHash(transactionHash) {
    return __awaiter(this, void 0, void 0, function () {
        var transaction, transactionSerialized, missiveGenerator, missive;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('handleTransactionHash', transactionHash);
                    return [4 /*yield*/, getTransaction(transactionHash)];
                case 1:
                    transaction = _a.sent();
                    if (!transaction) {
                        console.log('no transaction');
                        return [2 /*return*/];
                    }
                    transactionSerialized = transaction.serialize();
                    console.log('transactionSerialized', transactionSerialized);
                    missiveGenerator = new pollenium_anemone_1.MissiveGenerator({
                        applicationId: applicationId,
                        applicationData: transactionSerialized,
                        difficulty: 0,
                        hashcashWorkerUrl: require.resolve('pollenium-anemone/node/src/hashcash-worker'),
                        ttl: 10
                    });
                    return [4 /*yield*/, missiveGenerator.fetchMissive()];
                case 2:
                    missive = _a.sent();
                    console.log('broadcast');
                    client.broadcastMissive(missive);
                    console.log('broadcasted');
                    return [2 /*return*/];
            }
        });
    });
}
var startedAt = new Date().getTime();
var softCutoff = (60 + (Math.random() * 15)) * 1000;
var hardCutoff = (90 + (Math.random() * 15)) * 1000;
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var now_1, ellapsed_1, transactionHashRequest, now, ellapsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('run');
                    console.log('transactionHashRequests.length', transactionHashRequests.length);
                    if (!(transactionHashRequests.length === 0)) return [3 /*break*/, 2];
                    console.log('no transaction hash');
                    now_1 = new Date().getTime();
                    ellapsed_1 = now_1 - startedAt;
                    if (ellapsed_1 > 10000) {
                        console.log('exit');
                        process.exit();
                    }
                    return [4 /*yield*/, delay_1["default"](1000)];
                case 1:
                    _a.sent();
                    run();
                    return [2 /*return*/];
                case 2:
                    transactionHashRequest = transactionHashRequests.shift();
                    console.log('transactionHashRequests.age', (new Date).getTime() - transactionHashRequest.requestedAt);
                    return [4 /*yield*/, handleTransactionHash(transactionHashRequest.transactionHash)];
                case 3:
                    _a.sent();
                    now = new Date().getTime();
                    ellapsed = now - startedAt;
                    console.log('ellapsed', ellapsed);
                    if (ellapsed > softCutoff) {
                        console.log('softCutoff');
                        process.exit();
                    }
                    return [4 /*yield*/, delay_1["default"](1000)];
                case 4:
                    _a.sent();
                    run();
                    return [2 /*return*/];
            }
        });
    });
}
run();
delay_1["default"](hardCutoff).then(function () {
    throw new Error('hardCutoff');
});
