import BN from 'bn.js';
import { TransactionReceipt, TransactionResponse } from 'ethers/providers';

import {
  isValidCallRequest,
  isValidCurrentBlock,
  isValidEstimateGas,
  isValidGetBalance,
  isValidRawTxApi,
  isValidTokenBalance,
  isValidTransactionByHash,
  isValidTransactionCount,
  isValidTransactionReceipt
} from '@services/EthService';
import { Asset, IHexStrTransaction, INode, TxObj } from '@types';
import { stripHexPrefix, TokenValue, Wei } from '@utils';

import { RPCClient } from './client';
import { RPCRequests } from './requests';

// @todo Clean up this unused code
export default class RPCNode implements INode {
  public client: RPCClient;
  public requests: RPCRequests;

  constructor(endpoint: string) {
    this.client = new RPCClient(endpoint);
    this.requests = new RPCRequests();
  }

  public ping(): Promise<boolean> {
    return this.client
      .call(this.requests.getNetVersion())
      .then(() => true)
      .catch(() => false);
  }

  public sendCallRequest(txObj: TxObj): Promise<string> {
    return this.client
      .call(this.requests.ethCall(txObj))
      .then(isValidCallRequest)
      .then((response) => response.result);
  }
  public getBalance(address: string): Promise<Wei> {
    return this.client
      .call(this.requests.getBalance(address))
      .then(isValidGetBalance)
      .then(({ result }) => Wei(result));
  }

  public estimateGas(transaction: Partial<IHexStrTransaction>): Promise<Wei> {
    return this.client
      .call(this.requests.estimateGas(transaction))
      .then(isValidEstimateGas)
      .then(({ result }) => Wei(result))
      .catch((error) => {
        throw new Error(error.message);
      });
  }

  public getTokenBalance(
    address: string,
    token: Asset
  ): Promise<{ balance: TokenValue; error: string | null }> {
    return this.client
      .call(this.requests.getTokenBalance(address, token))
      .then(isValidTokenBalance)
      .then(({ result }) => {
        return {
          balance: TokenValue(result),
          error: null
        };
      })
      .catch((err) => ({
        balance: TokenValue('0'),
        error: 'Caught error:' + err
      }));
  }

  public getTokenBalances(
    address: string,
    tokens: Asset[]
  ): Promise<{ balance: TokenValue; error: string | null }[]> {
    return this.client
      .batch(tokens.map((t) => this.requests.getTokenBalance(address, t)))
      .then((response) =>
        response.map((item) => {
          if (isValidTokenBalance(item)) {
            return {
              balance: TokenValue(item.result),
              error: null
            };
          } else {
            return {
              balance: TokenValue('0'),
              error: 'Invalid object shape'
            };
          }
        })
      );
  }

  public getTransactionCount(address: string): Promise<string> {
    return this.client
      .call(this.requests.getTransactionCount(address))
      .then(isValidTransactionCount)
      .then(({ result }) => result);
  }

  public getTransactionByHash(txhash: string): Promise<TransactionResponse> {
    return this.client
      .call(this.requests.getTransactionByHash(txhash))
      .then(isValidTransactionByHash)
      .then(({ result }) => ({
        ...result,
        to: result.to || '0x0',
        value: Wei(result.value),
        gasPrice: Wei(result.gasPrice),
        gas: Wei(result.gas),
        nonce: result.nonce,
        blockNumber: result.blockNumber ? result.blockNumber : null,
        transactionIndex: result.transactionIndex ? result.transactionIndex : null
      }));
  }

  public getTransactionReceipt(txhash: string): Promise<TransactionReceipt> {
    return this.client
      .call(this.requests.getTransactionReceipt(txhash))
      .then(isValidTransactionReceipt)
      .then(({ result }) => ({
        ...result,
        transactionIndex: result.transactionIndex,
        blockNumber: result.blockNumber,
        cumulativeGasUsed: Wei(result.cumulativeGasUsed),
        gasUsed: Wei(result.gasUsed),
        status: result.status ? result.status : null,
        root: result.root || null
      }));
  }

  public getCurrentBlock(): Promise<string> {
    return this.client
      .call(this.requests.getCurrentBlock())
      .then(isValidCurrentBlock)
      .then(({ result }) => new BN(stripHexPrefix(result)).toString());
  }

  public sendRawTx(signedTx: string): Promise<string> {
    return this.client
      .call(this.requests.sendRawTx(signedTx))
      .then(isValidRawTxApi)
      .then(({ result }) => {
        return result;
      });
  }
}
