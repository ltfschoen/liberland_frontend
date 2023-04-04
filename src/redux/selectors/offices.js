import { createSelector } from 'reselect';

const officesReducer = (state) => state.offices;

const selectorIdentity = createSelector(
  officesReducer,
  (reducer) => reducer.identity,
);

const selectorCompanyRequest = createSelector(
  officesReducer,
  (reducer) => reducer.companyRequest,
);

const selectorCompanyRegistration = createSelector(
  officesReducer,
  (reducer) => reducer.companyRegistration,
);

const selectorIsLoading = createSelector(
  officesReducer,
  (reducer) => reducer.loading,
);

export {
  selectorIdentity,
  selectorCompanyRequest,
  selectorCompanyRegistration,
  selectorIsLoading,
};