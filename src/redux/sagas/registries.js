import {
  put, takeLatest, call, select,
} from 'redux-saga/effects';

import {
  cancelCompanyRequest,
  getOfficialUserRegistryEntries,
  requestCompanyRegistration,
  requestEditCompanyRegistration,
} from '../../api/nodeRpcCall';

import { registriesActions } from '../actions';
import { blockchainSelectors } from '../selectors';
import { blockchainWatcher } from './base';
import router from "../../router";

// WORKERS

function* getOfficialUserRegistryEntriesWorker(action) {
  try {
    const officialUserRegistryEntries = yield call(getOfficialUserRegistryEntries, action.payload);
    yield put(registriesActions.getOfficialUserRegistryEntries.success({
      officialUserRegistryEntries,
    }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    yield put(registriesActions.getOfficialUserRegistryEntries.failure(e));
  }
}

function* requestCompanyRegistrationWorker(action) {
  const walletAddress = yield select(blockchainSelectors.userWalletAddressSelector);
  yield call(
    requestCompanyRegistration,
    action.payload.companyData,
    action.payload.registryAllowedToEdit,
    walletAddress,
  );
  yield put(registriesActions.getOfficialUserRegistryEntries.call(walletAddress));
  yield put(registriesActions.requestCompanyRegistrationAction.success());
  action.payload.history.push(router.registries.companies.home);
}

function* requestEditCompanyRegistrationWorker(action) {
  const walletAddress = yield select(blockchainSelectors.userWalletAddressSelector);
  yield call(
    requestEditCompanyRegistration,
    action.payload.companyData,
    action.payload.companyId,
    walletAddress,
  );
  yield put(registriesActions.getOfficialUserRegistryEntries.call(walletAddress));
  yield put(registriesActions.requestEditCompanyRegistrationAction.success());
  action.payload.history.push(router.registries.companies.home);
}

function* cancelCompanyRequestWorker(action) {
  const walletAddress = yield select(blockchainSelectors.userWalletAddressSelector);
  yield call(
    cancelCompanyRequest,
    action.payload.companyId,
    walletAddress,
  );
  yield put(registriesActions.getOfficialUserRegistryEntries.call(walletAddress));
  yield put(registriesActions.cancelCompanyRequest.success());
}

// WATCHERS

export function* getOfficialUserRegistryEntriesWatcher() {
  try {
    yield takeLatest(registriesActions.getOfficialUserRegistryEntries.call, getOfficialUserRegistryEntriesWorker);
  } catch (e) {
    yield put(registriesActions.getOfficialUserRegistryEntries.failure(e));
  }
}

export function* requestCompanyRegistrationWatcher() {
  yield* blockchainWatcher(
    registriesActions.requestCompanyRegistrationAction,
    requestCompanyRegistrationWorker,
  );
}

export function* requestEditCompanyRegistrationWatcher() {
  yield* blockchainWatcher(
    registriesActions.requestEditCompanyRegistrationAction,
    requestEditCompanyRegistrationWorker,
  );
}

export function* cancelCompanyRequestWatcher() {
  yield* blockchainWatcher(
    registriesActions.cancelCompanyRequest,
    cancelCompanyRequestWorker,
  );
}
