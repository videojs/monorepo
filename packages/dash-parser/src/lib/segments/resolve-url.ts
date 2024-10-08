const DEFAULT_LOCATION = 'http://example.com';

export const resolveUrl = (relativeUrl: string, baseUrl: string): string => {
  // return early if have an absolute url
  if (/^[a-z]+:/i.test(relativeUrl)) {
    return relativeUrl;
  } // if baseUrl is a data URI, ignore it and resolve everything relative to window.location

  if (/^data:/.test(baseUrl)) {
    baseUrl = (window.location && window.location.href) || '';
  } // IE11 supports URL but not the URL constructor
  // feature detect the behavior we want

  const nativeURL = typeof window.URL === 'function';
  const protocolLess = /^\/\//.test(baseUrl); // remove location if window.location isn't available (i.e. we're in node)
  // and if baseUrl isn't an absolute url

  const removeLocation = !window.location && !/\/\//i.test(baseUrl); // if the base URL is relative then combine with the current location

  if (nativeURL) {
    baseUrl = new window.URL(baseUrl, window.location.href || DEFAULT_LOCATION).href;
  } else if (!/\/\//i.test(baseUrl)) {
    baseUrl = new URL((window.location && window.location.href) || '', baseUrl).href;
  }

  if (nativeURL) {
    const newUrl = new URL(relativeUrl, baseUrl); // if we're a protocol-less url, remove the protocol
    // and if we're location-less, remove the location
    // otherwise, return the url unmodified

    if (removeLocation) {
      return newUrl.href.slice(DEFAULT_LOCATION.length);
    } else if (protocolLess) {
      return newUrl.href.slice(newUrl.protocol.length);
    }

    return newUrl.href;
  }

  return new URL(baseUrl, relativeUrl).href;
};
