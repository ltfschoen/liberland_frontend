import { web3Accounts, web3FromAddress, web3FromSource } from '@polkadot/extension-dapp';
import { blake2AsHex } from '@polkadot/util-crypto';
import axios from 'axios';
import { USER_ROLES, userRolesHelper } from '../utils/userRolesHelper';
import {dollarsToGrains, meritsToGrains} from '../utils/walletHelpers';
import {handleMyDispatchErrors} from "../utils/therapist";

const { ApiPromise, WsProvider } = require('@polkadot/api');

const provider = new WsProvider(process.env.REACT_APP_NODE_ADDRESS);
let __apiCache = null;
const getApi = () => {
  if (__apiCache === null) __apiCache = ApiPromise.create({ provider });
  return __apiCache;
};

const crossReference = (blockchainData, centralizedData) => {
  return blockchainData.map((item) => (
    {
      ...item,
      centralizedData: centralizedData.find((cItem) => (
        parseInt(cItem.chainIndex) == parseInt(item.index)
      )),
    }
  ))
};

// TODO: Need refactor when blockchain node update
const getBalanceByAddress = async (address) => {
  try {
    const api = await getApi();
    const [
      LLDData,
      LLMData,
      LLMPolitiPool,
    ] = await api.queryMulti([
      [api.query.system.account, address],
      [api.query.assets.account, [1, address]],
      [api.query.llm.llmPolitics, address],
    ]);
    const LLMPolitiPoolData = LLMPolitiPool.toJSON();
    const LLDWalletData = LLDData.toJSON();
    const LLMWalletData = LLMData.toJSON();

    const LLMBalance = LLMWalletData?.balance ?? '0x0';
    return {
      liberstake: {
        amount: LLMPolitiPoolData,
      },
      polkastake: {
        amount: LLDWalletData.data.miscFrozen,
      },
      liquidMerits: {
        amount: LLMBalance,
      },
      totalAmount: {
        amount: LLDWalletData.data.free,
      },
      meritsTotalAmount: {
        amount: LLMBalance,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {};
  }
};

const sendTransfer = async (payload, callback) => {
  const { account_to, amount, account_from } = payload;
  const api = await getApi();
  const transferExtrinsic = api.tx.balances.transfer(account_to, (amount));
  const injector = await web3FromSource('polkadot-js');
  transferExtrinsic.signAndSend(account_from, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const sendTransferLLM = async (payload, callback) => {
  const { account_to, amount, account_from } = payload;
  const api = await getApi();
  const transferExtrinsic = api.tx.llm.sendLlm(account_to, (meritsToGrains(amount)));

  const injector = await web3FromSource('polkadot-js');
  transferExtrinsic.signAndSend(account_from, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const stakeToPolkaBondAndExtra = async (payload, callback) => {
  const { values: { amount }, isUserHaveStake, walletAddress } = payload;
  const api = await getApi();
  const transferExtrinsic = isUserHaveStake
    ? await api.tx.staking.bondExtra(dollarsToGrains(amount))
    : await api.tx.staking.bond(walletAddress, dollarsToGrains(amount), 'Staked');

  const injector = await web3FromSource('polkadot-js');
  // eslint-disable-next-line max-len
  await transferExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const politiPool = async (payload, callback) => {
  const { values: { amount }, walletAddress } = payload;
  const api = await getApi();
  const politiPoolExtrinsic = api.tx.llm.politicsLock(meritsToGrains(amount));

  const injector = await web3FromSource('polkadot-js');
  politiPoolExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const getUserRoleRpc = async (walletAddress) => {
  try {
    const api = await getApi();
    const identityResult = await api.query.identity.identityOf(walletAddress);
    const userRoleObject = identityResult?.toHuman()?.info.additional[0];
    if (userRoleObject && (USER_ROLES.includes(userRoleObject[0]?.Raw) && userRoleObject[1]?.Raw === '1')) {
      return userRolesHelper.assignJsIdentity(userRoleObject[0].Raw);
    }
    return { non_citizen: 'non_citizen' };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error', e);
  }
  return null;
};

const getCurrentBlockNumberRpc = async () => {
  try {
    const api = await getApi();
    const bestNumber = await api.derive.chain.bestNumber();
    return (bestNumber.toNumber());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error', e);
  }
  return null;
};

const getAllWalletsRpc = async () => web3Accounts();

const getValidators = async () => {
  const api = await getApi();
  const validators = [];
  const validatorsKeys = await api.query.staking.validators.keys();
  const validatorQueries = [];
  const validatorIdentityQueries = [];
  validatorsKeys.forEach((validatorKey, index) => {
    const address = validatorKey.toHuman().pop();
    validatorQueries.push([api.query.staking.validators, address]);
    validatorIdentityQueries.push([api.query.identity.identityOf, address]);
    validators[index] = { address };
  });
  const numOfValidators = validatorsKeys.length;
  const validatorsData = await api.queryMulti([
    ...validatorQueries,
    ...validatorIdentityQueries,
  ]);
  validatorsData.forEach((validatorData, index) => {
    const validatorHumanData = validatorData.toHuman();
    const dataToAdd = {
      ...((validatorHumanData?.commission !== undefined) && { commission: validatorHumanData.commission }),
      ...((validatorHumanData?.blocked !== undefined) && { blocked: validatorHumanData.blocked }),
      ...((validatorHumanData?.info?.display?.Raw !== undefined) && { displayName: validatorHumanData?.info?.display?.Raw }),
    };
    validators[index % numOfValidators] = {
      ...validators[index % numOfValidators],
      ...dataToAdd,
    };
  });
  return validators;
};

const getNominatorTargets = async (walletId) => {
  const api = await getApi();
  const nominations = await api.query.staking.nominators(walletId);

  return nominations?.toHuman()?.targets ? nominations?.toHuman()?.targets : [];
};

const setNominatorTargets = async (payload, callback) => {
  const { newNominatorTargets, walletAddress } = payload;
  const injector = await web3FromAddress(walletAddress);
  const api = await getApi();
  const setNewTargets = await api.tx.staking.nominate(newNominatorTargets);
  await setNewTargets.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`InBlock at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const getDemocracyReferendums = async (address) => {
  try {
    const ssoAccessTokenHash = sessionStorage.getItem('ssoAccessTokenHash');
    const api = await getApi();
    const [
      proposals,
      userVotes,
    ] = await api.queryMulti([
      api.query.democracy.publicProps,
      [api.query.democracy.votingOf, address],
    ]);

    const [
      apideriveReferendums,
      apideriveReferendumsActive,
    ] = await Promise.all([ // api.queryMulti doesnt work with api.derive :(
      api.derive.democracy.referendums(),
      api.derive.democracy.referendumsActive(),
    ]);

    const proposalData = proposals.toHuman().map((proposalItem) => ({
      index: proposalItem[0],
      boundedCall: proposalItem[1],
      proposer: proposalItem[2],
    }));

    const deposits = await api.query.democracy.depositOf.multi(proposalData.map(({ index }) => index));

    const proposalsWithDeposits = proposalData.map((proposal, idx) => (
      {
        seconds: deposits[idx].toHuman()[0],
        ...proposal,
      }
    ));

    // TODO REFACTOR
    let centralizedReferendumsData = [];
    const api2 = axios.create({
      baseURL: process.env.REACT_APP_API2,
      withCredentials: true,
    });
    api2.defaults.headers.common['X-token'] = ssoAccessTokenHash;

    await api2.get('/referenda').then((result) => {
      centralizedReferendumsData = result.data;
    });

    const crossReferencedReferendumsData = crossReference(
      apideriveReferendums,
      centralizedReferendumsData,
    );

    const crossReferencedProposalsData = crossReference(
      proposalsWithDeposits,
      centralizedReferendumsData,
    );

    // const referendums = api.query.democracy.publicProps();
    return {
      proposalData,
      apideriveReferendums,
      crossReferencedReferendumsData,
      crossReferencedProposalsData,
      apideriveReferendumsActive,
      userVotes: userVotes.toHuman(),
      centralizedReferendumsData,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {};
  }
};

const secondProposal = async (walletAddress, proposal, callback) => {
  const api = await getApi();
  const injector = await web3FromAddress(walletAddress);
  const secondExtrinsic = api.tx.democracy.second(proposal);
  secondExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const voteOnReferendum = async (walletAddress, referendumIndex, voteType, callback) => {
  const api = await getApi();
  const injector = await web3FromAddress(walletAddress);
  const LLMPolitiPool = await api.query.llm.llmPolitics(walletAddress);
  const LLMPolitiPoolData = LLMPolitiPool.toJSON();
  const voteExtrinsic = api.tx.democracy.vote(referendumIndex, {
    Standard: {
      vote: {
        aye: voteType === 'Aye',
        conviction: 1,
      },
      balance: LLMPolitiPoolData,
    },
  });

  voteExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed VOTE at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const getProposalHash = async (values, legislationIndex) => {
  const api = await getApi();
  const extrinsicEncoded = api.tx.liberlandLegislation.addLaw(parseInt(values.legislationTier), legislationIndex, values.legislationContent).method.toHex();
  const hash = { encodedHash: blake2AsHex(extrinsicEncoded), extrinsicEncoded };
  return hash;
};

const submitProposal = async (walletAddress, values, callback) => {
  const api = await getApi();
  const injector = await web3FromAddress(walletAddress);
  const nextChainIndexQuery = await api.query.democracy.referendumCount();
  const nextChainIndex = nextChainIndexQuery.toHuman();
  const ssoAccessTokenHash = sessionStorage.getItem('ssoAccessTokenHash');
  // TODO REFACTOR
  const api2 = axios.create({
    baseURL: process.env.REACT_APP_API2,
    withCredentials: true,
  });
  api2.defaults.headers.common['X-Token'] = ssoAccessTokenHash;

  const centralizedMetadata = await api2.post('/referenda', {
    // username: 'username',
    link: values.forumLink,
    // personId: 10,
    chainIndex: nextChainIndex,
    name: 'Hardcoded server name',
    description: values.legislationContent,
    hash: 'hash not needed',
    additionalMetadata: {},
    proposerAddress: walletAddress,
  });
  const legislationIndex = centralizedMetadata.data.id;
  const hash = await getProposalHash(values, legislationIndex);
  const notePreimageTx = api.tx.preimage.notePreimage(hash.extrinsicEncoded);
  const minDeposit = api.consts.democracy.minimumDeposit;
  const proposeCall = parseInt(values.legislationTier) === 0 ? api.tx.democracy.proposeRichOrigin : api.tx.democracy.propose;
  const proposeTx = proposeCall({ Legacy: hash.encodedHash }, minDeposit);
  notePreimageTx.signAndSend(walletAddress, { signer: injector.signer }, ({ status }) => {
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed NOTEPREIMAGE at block hash #${status.asInBlock.toString()}`);
      proposeTx.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
        let errorData = handleMyDispatchErrors(dispatchError, api)
        if (status.isInBlock) {
          // eslint-disable-next-line no-console
          console.log(`Completed PROPOSE at block hash #${status.asInBlock.toString()}`);
          callback(null, {
            blockHash: status.asInBlock.toString(),
            errorData
          });
        }
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error(':( transaction PROPOSE failed', error);
        callback({isError: true, details: error.toString()});
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const getCongressMembersWithIdentity = async (walletAddress) => {
  const api = await getApi();
  let [
    councilMembers,
    candidates,
    currentCandidateVotesByUserQuery,
  ] = await api.queryMulti([
    api.query.council.members,
    api.query.elections.candidates,
    [api.query.elections.voting, walletAddress],
  ]);
  councilMembers = councilMembers.toHuman();
  const councilMembersIdentityQueries = [];
  councilMembers.forEach((councilMember) => {
    councilMembersIdentityQueries.push([api.query.identity.identityOf, councilMember]);
  });

  const councilMemberIdentities = await api.queryMulti([
    ...councilMembersIdentityQueries,
  ]);

  const crossReferencedCouncilMemberIdentities = [];

  councilMemberIdentities.forEach((councilMemberIdentity) => {
    const toHumanIdentity = councilMemberIdentity.toHuman();
    // address use councilmembers.shift as its same ordering as councilmemberidentities
    let rawIdentity = councilMembers.shift();
    rawIdentity = typeof rawIdentity === 'string' ? rawIdentity : rawIdentity[0];
    crossReferencedCouncilMemberIdentities.push({
      name: toHumanIdentity?.info?.display?.Raw ? toHumanIdentity.info.display.Raw : rawIdentity,
      identityData: toHumanIdentity,
      rawIdentity,
    });
  });

  candidates = candidates.toHuman();
  // TODO isolate in function ?
  const candidatesIdentityQueries = [];
  candidates.forEach((candidate) => {
    candidatesIdentityQueries.push([api.query.identity.identityOf, candidate[0]]);
  });

  const candidateIdentities = candidatesIdentityQueries.length == 0 ? [] : await api.queryMulti([
    ...candidatesIdentityQueries,
  ]);

  const crossReferencedCandidateIdentities = [];
  candidateIdentities.forEach((candidateIdentity) => {
    const toHumanIdentity = candidateIdentity.toHuman();
    // address use councilmembers.shift as its same ordering as councilmemberidentities
    let rawIdentity = candidates.shift();
    rawIdentity = typeof rawIdentity === 'string' ? rawIdentity : rawIdentity[0];
    crossReferencedCandidateIdentities.push({
      name: toHumanIdentity?.info?.display?.Raw ? toHumanIdentity.info.display.Raw : rawIdentity,
      identityData: toHumanIdentity,
      rawIdentity,
    });
  });

  const currentCandidateVotesByUser = currentCandidateVotesByUserQuery.toHuman().votes;

  const currentCandidateVotesByUserIdentityQueries = [];
  currentCandidateVotesByUser.forEach((currentCandidateVote) => {
    currentCandidateVotesByUserIdentityQueries.push([api.query.identity.identityOf, currentCandidateVote]);
  });

  const currentCandidateVotesByUserIdentities = currentCandidateVotesByUserIdentityQueries.length == 0 ? [] : await api.queryMulti(
    [
      ...currentCandidateVotesByUserIdentityQueries,
    ],
  );

  const crossReferencedCurrentCandidateVotesByUser = [];
  currentCandidateVotesByUserIdentities.forEach((currentCandidateVoteIdentity) => {
    const toHumanIdentity = currentCandidateVoteIdentity.toHuman();
    // address use councilmembers.shift as its same ordering as councilmemberidentities
    let rawIdentity = currentCandidateVotesByUser.shift();
    rawIdentity = typeof rawIdentity === 'string' ? rawIdentity : rawIdentity[0];
    crossReferencedCurrentCandidateVotesByUser.push({
      name: toHumanIdentity?.info?.display?.Raw ? toHumanIdentity.info.display.Raw : rawIdentity,
      identityData: toHumanIdentity,
      rawIdentity,
    });
  });
  // TODO add runnersup

  /*
   const electionsInfo = useCall<DeriveElectionsInfo>(api.derive.elections.info);
   const allVotes = useCall<Record<string, AccountId[]>>(api.derive.council.votes, undefined, transformVotes);
   */

  return { currentCongressMembers: crossReferencedCouncilMemberIdentities, candidates: crossReferencedCandidateIdentities, currentCandidateVotesByUser: crossReferencedCurrentCandidateVotesByUser };
};

const voteForCongress = async (listofVotes, walletAddress, callback) => {
  const api = await getApi();
  const injector = await web3FromAddress(walletAddress);
  const votes = listofVotes.map((vote) => vote.rawIdentity);

  const LLMPolitiPool = await api.query.llm.llmPolitics(walletAddress);
  const LLMPolitiPoolData = LLMPolitiPool.toJSON();

  const voteExtrinsic = api.tx.elections.vote(votes, LLMPolitiPoolData);

  voteExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed VOTE at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction VOTE failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const castVetoForLegislation = async (tier, index, walletAddress, callback) => {
  const api = await getApi();
  const injector = await web3FromAddress(walletAddress);

  const vetoExtrinsic = api.tx.liberlandLegislation.submitVeto(tier, index);

  vetoExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed VETO at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction VETO failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const revertVetoForLegislation = async (tier, index, walletAddress, callback) => {
  const api = await getApi();
  const injector = await web3FromAddress(walletAddress);

  const revertVetoExtrinsic = api.tx.liberlandLegislation.revertVeto(tier, index);

  revertVetoExtrinsic.signAndSend(walletAddress, { signer: injector.signer }, ({ status, events, dispatchError }) => {
    let errorData = handleMyDispatchErrors(dispatchError, api)
    if (status.isInBlock) {
      // eslint-disable-next-line no-console
      console.log(`Completed REVERT VETO at block hash #${status.asInBlock.toString()}`);
      callback(null, {
        blockHash: status.asInBlock.toString(),
        errorData
      });
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(':( transaction REVERT VETO failed', error);
    callback({isError: true, details: error.toString()});
  });
};

const getLegislation = async (tier) => {
  try {
    const api = await getApi();

    const legislationRaw = await api.query.liberlandLegislation.laws.entries(tier);
    const legislationHuman = legislationRaw.map((x) => ({
      key: x[0].toHuman(), value: x[1].toHuman(),
    }));

    const legislationVetosRawArray = await Promise.all(legislationHuman.map(({ key }) => (
      api.query.liberlandLegislation.vetos.entries(key[0], key[1])
    )));

    const legislationVetosHuman = [];
    legislationVetosRawArray.forEach((rawVetos) => {
      legislationVetosHuman.push(
        rawVetos.map((x) => ({
          vetoInfo: x[0].toHuman(), value: x[1].toHuman(),
        })),
      );
    });

    const vetosByIndex = {};
    legislationVetosHuman.forEach((vetos) => {
      vetos.forEach((veto) => {
        if (veto.vetoInfo[1] in vetosByIndex) {
          vetosByIndex[veto.vetoInfo[1]].push(veto.vetoInfo[2]);
        } else {
          vetosByIndex[veto.vetoInfo[1]] = [veto.vetoInfo[2]];
        }
      });
    });

    const legislation = legislationHuman.map(({ key, value }) => ({
      tier: key[0],
      index: key[1],
      content: value,
      vetos: vetosByIndex[key[1]] ? vetosByIndex[key[1]] : [],
    }));

    return legislation;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {};
  }
};

export {
  getBalanceByAddress,
  sendTransfer,
  sendTransferLLM,
  stakeToPolkaBondAndExtra,
  politiPool,
  getUserRoleRpc,
  getCurrentBlockNumberRpc,
  getAllWalletsRpc,
  getValidators,
  getNominatorTargets,
  setNominatorTargets,
  getDemocracyReferendums,
  secondProposal,
  voteOnReferendum,
  submitProposal,
  getCongressMembersWithIdentity,
  voteForCongress,
  getLegislation,
  castVetoForLegislation,
  revertVetoForLegislation,
};
