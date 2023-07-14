import React from 'react';
import { ethers } from 'ethers';
import { useDispatch, useSelector } from 'react-redux';
import { encodeAddress } from '@polkadot/util-crypto';

import Button from '../../../Button/Button';
import { bridgeActions } from '../../../../redux/actions';
import { blockchainSelectors } from '../../../../redux/selectors';
import useSubstrateBridgeTransfer from '../../../../hooks/useSubstrateBridgeTransfer';

export function Transfer({ ethBridge, transfer }) {
  const dispatch = useDispatch();
  const userWalletAddress = useSelector(blockchainSelectors.userWalletAddressSelector);
  const { args } = ethBridge.contract.interface.parseTransaction(transfer.burn.transaction);
  const rawSubstrateState = useSubstrateBridgeTransfer(ethBridge.asset, transfer.receipt_id);
  const substrateBlockNumber = useSelector(blockchainSelectors.blockNumber); // FIXME this isn't updating realtime and we need this realtime

  const withdraw = () => {
    dispatch(bridgeActions.withdraw.call({
      userWalletAddress,
      values: {
        asset: ethBridge.asset,
        receipt_id: transfer.receipt_id,
      },
    }));
  };

  let substrateState = 'unknown'; // unknown, voting, approved, ready, processed
  if (rawSubstrateState?.status?.isApproved) {
    const withdrawalDelayInBlocks = ethBridge.mintDelay.toNumber();
    const approvedOn = rawSubstrateState.status.asApproved.toNumber();
    if (substrateBlockNumber >= withdrawalDelayInBlocks + approvedOn) substrateState = 'ready';
    else substrateState = 'approved';
  } else if (rawSubstrateState?.status?.isProcessed) {
    substrateState = 'processed';
  }

  let state;
  if (!transfer.burn.receipt) {
    state = 'Waiting for tx confirmation';
  } else if (substrateState === 'unknown') {
    state = 'Waiting for tx to be finalized (~15 minutes)';
  } else if (substrateState === 'voting') {
    state = 'Processing (~1h)';
  } else if (substrateState === 'approved') {
    state = 'Processing (~1h)';
  } else if (substrateState !== 'processed' && !rawSubstrateState?.withdraw_tx) {
    state = 'Unlock ready';
  } else if (substrateState !== 'processed') {
    state = 'Waiting for unlock tx confirmation';
  } else {
    state = 'Processed';
  }

  return (
    <tr>
      <td>{new Date(transfer.burn.submittedAt).toLocaleString()}</td>
      <td>{transfer.receipt_id ? transfer.receipt_id : 'pending'}</td>
      <td>{encodeAddress(args.substrateRecipient)}</td>
      <td>
        {ethers.utils.formatUnits(args.amount, ethBridge.token.decimals)}
        {' '}
        {ethBridge.token.symbol}
      </td>
      <td>{state}</td>
      <td>
        {state !== 'Unlock ready' ? null
          : (
            <Button
              primary
              medium
              onClick={withdraw}
            >
              Withdraw on Liberland Blockchain
            </Button>
          )}
      </td>
    </tr>
  );
}