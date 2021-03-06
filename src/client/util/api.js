/**
 * API utility functions.
 *
 * @module client/util/api
 * @flow
 */

// extract the metatag content
export const metatags: Map<?string, ?string> = new Map(
  Array.from(document.getElementsByTagName('META'), element => [
    element.getAttribute('name'),
    element.getAttribute('content'),
  ]),
);

// get the api endpoint
const apiEndpoint = metatags.get('phantasml-api-endpoint') || '/api';

/** The client build time. */
export const buildTime = metatags.get('phantasml-build-time') || '';

/** Stores the most recent log entries for bug reports. */
export const recentLogEntries: string[] = [];

const LOG_HISTORY_LENGTH = 500;

// store recent console entries
const pushLogEntry = (level: string, args: any[]) => {
  recentLogEntries.push(
    new Date().toISOString() + ` ${level} ${args.map(logToString).join(' ')}`,
  );
  if (recentLogEntries.length > LOG_HISTORY_LENGTH) {
    recentLogEntries.shift();
  }
};
const writableConsole: Object = window.console;
const underlyingInfo = console.info;
writableConsole.info = (...args: any[]) => {
  underlyingInfo(...args);
  pushLogEntry('INFO', args);
};
const underlyingLog = console.log;
writableConsole.log = (...args: any[]) => {
  underlyingLog(...args);
  pushLogEntry('LOG', args);
};
const underlyingWarn = console.warn;
writableConsole.warn = (...args: any[]) => {
  underlyingWarn(...args);
  pushLogEntry('WARN', args);
};
const underlyingError = console.error;
writableConsole.error = (...args: any[]) => {
  underlyingError(...args);
  pushLogEntry('ERROR', args);
};

const MAX_LOG_DEPTH = 3;

function logToString(value: any, depth: number = 0): string {
  if (depth < MAX_LOG_DEPTH) {
    const nextDepth = depth + 1;
    const nextToString = value => logToString(value, nextDepth);
    if (Array.isArray(value)) {
      return `[${value.map(nextToString).join(', ')}]`;
    }
    if (value instanceof Error) {
      return value.stack;
    }
    if (typeof value === 'object' && value) {
      const inside = Object.entries(value)
        .map(([key, value]) => `${key}: ${nextToString(value)}`)
        .join(', ');
      return `{${inside}}`;
    }
  }
  return String(value);
}

// check for, remove auth token parameter
let authToken: ?string;
if (location.search.startsWith('?')) {
  const AUTH_TOKEN_PARAM = 't=';
  const params = location.search.substring(1).split('&');
  for (let ii = 0; ii < params.length; ii++) {
    const param = params[ii];
    if (param.startsWith(AUTH_TOKEN_PARAM)) {
      authToken = decodeURIComponent(param.substring(AUTH_TOKEN_PARAM.length));
      params.splice(ii, 1);
      const search = params.length === 0 ? '' : '?' + params.join('&');
      history.replaceState(
        {},
        document.title,
        location.pathname + search + location.hash,
      );
      break;
    }
  }
}

// check cookies for an auth token
const AUTH_TOKEN_COOKIE = 'authToken=';
if (!authToken) {
  for (const cookie of document.cookie.split(';')) {
    const trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(AUTH_TOKEN_COOKIE)) {
      authToken = decodeURIComponent(
        trimmedCookie.substring(AUTH_TOKEN_COOKIE.length),
      );
      break;
    }
  }
}

/**
 * Sets the auth token and associated cookie.
 *
 * @param token the new auth token.
 * @param [persist] whether or not the token persists between sessions.
 */
export function setAuthToken(token: string, persist: ?boolean) {
  authToken = token;
  let expires = '';
  if (persist) {
    const oneYearLater = Date.now() + 365 * 24 * 60 * 60 * 1000;
    expires = `; expires=${new Date(oneYearLater).toUTCString()}`;
  }
  document.cookie = `${AUTH_TOKEN_COOKIE}${token}${expires}`;
}

/**
 * Clears the auth token and associated cookie.
 */
export function clearAuthToken() {
  authToken = undefined;
  document.cookie = `${AUTH_TOKEN_COOKIE}; expires=${new Date().toUTCString()}`;
}

/**
 * Makes a GET request to the API endpoint, including the auth token in the
 * parameters.
 *
 * @param path the path of the function to call.
 * @param request the request object.
 * @return a promise that will resolve to the response object.
 */
export async function getFromApi<RequestType: Object, ResponseType: Object>(
  path: string,
  request: RequestType = ({}: any),
): Promise<ResponseType> {
  return await requestFromApi('GET', path, request);
}

/**
 * Makes a DELETE request to the API endpoint, including the auth token in the
 * parameters.
 *
 * @param path the path of the function to call.
 * @param request the request object.
 * @return a promise that will resolve to the response object.
 */
export async function deleteFromApi<RequestType: Object, ResponseType: Object>(
  path: string,
  request: RequestType = ({}: any),
): Promise<ResponseType> {
  return await requestFromApi('DELETE', path, request);
}

async function requestFromApi<RequestType: Object, ResponseType: Object>(
  method: string,
  path: string,
  request: RequestType = ({}: any),
): Promise<ResponseType> {
  let query = '';
  let requestWithToken = Object.assign({authToken}, request);
  for (const [key, value] of Object.entries(requestWithToken)) {
    if (value === undefined) {
      continue;
    }
    query +=
      (query.length === 0 ? '?' : '&') +
      encodeURIComponent(key) +
      '=' +
      encodeURIComponent(
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      );
  }
  const response = await fetch(apiEndpoint + path + query, {method});
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Makes a PUT request to the API endpoint, including the auth token in the
 * parameters.
 *
 * @param path the path of the function to call.
 * @param request the request object.
 * @param [readResponseBody=true] if false, don't bother reading the body of
 * the response (just the status code).
 * @return a promise that will resolve to the response object.
 */
export async function putToApi<RequestType: Object, ResponseType: Object>(
  path: string,
  request: RequestType = ({}: any),
  readResponseBody: boolean = true,
): Promise<ResponseType> {
  const query = authToken ? `?authToken=${encodeURIComponent(authToken)}` : '';
  const response = await fetch(apiEndpoint + path + query, {
    method: 'PUT',
    mode: 'cors',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(request),
  });
  if (!readResponseBody) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error('Put request failed: ' + text);
    }
    return ({}: Object);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Makes a POST request to the API endpoint, including the auth token in the
 * parameters.
 *
 * @param path the path of the function to call.
 * @param request the request object.
 * @return a promise that will resolve to the response object.
 */
export async function postToApi<RequestType: Object, ResponseType: Object>(
  path: string,
  request: RequestType = ({}: any),
): Promise<ResponseType> {
  const response = await fetch(apiEndpoint + path, {
    method: 'POST',
    body: JSON.stringify(Object.assign({authToken}, request)),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}
