import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'newsweek-main',
  location: 'us-east4'
};

export const createPublicMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePublicMovieList', inputVars);
}
createPublicMovieListRef.operationName = 'CreatePublicMovieList';

export function createPublicMovieList(dcOrVars, vars) {
  return executeMutation(createPublicMovieListRef(dcOrVars, vars));
}

export const getPublicMovieListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPublicMovieLists');
}
getPublicMovieListsRef.operationName = 'GetPublicMovieLists';

export function getPublicMovieLists(dc) {
  return executeQuery(getPublicMovieListsRef(dc));
}

export const addMovieToMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToMovieList', inputVars);
}
addMovieToMovieListRef.operationName = 'AddMovieToMovieList';

export function addMovieToMovieList(dcOrVars, vars) {
  return executeMutation(addMovieToMovieListRef(dcOrVars, vars));
}

export const getMyMovieListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMovieLists');
}
getMyMovieListsRef.operationName = 'GetMyMovieLists';

export function getMyMovieLists(dc) {
  return executeQuery(getMyMovieListsRef(dc));
}

