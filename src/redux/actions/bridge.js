import { createActions } from 'redux-actions';

export const {
  deposit,
  withdraw,
  updateTransferStatus,
  updateTransferWithdrawTx,
  getTransfersToEthereum,
  getTransfersToSubstrate,
} = createActions({
  DEPOSIT: {
    call: undefined,
    success: undefined,
    failure: undefined,
  },
  WITHDRAW: {
    call: undefined,
    success: undefined,
    failure: undefined,
  },
  UPDATE_TRANSFER_STATUS: {
    set: undefined,
  },
  UPDATE_TRANSFER_WITHDRAW_TX: {
    set: undefined,
  },
  GET_TRANSFERS_TO_ETHEREUM: {
    call: undefined,
    success: undefined,
    failure: undefined,
  },
  GET_TRANSFERS_TO_SUBSTRATE: {
    call: undefined,
    success: undefined,
    failure: undefined,
  },
});
