const EVERYPLATE_MEDIA_BASE_URL = 'https://media.everyplate.com/f_auto,fl_lossy,q_auto,w_540/everyplate_s3';
const EVERYPLATE_MEDIA_HOST = 'media.everyplate.com';
const EVERYPLATE_CLOUDFRONT_HOST = 'd3hvwccx09j84u.cloudfront.net';

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return normalizeWhitespace(value);
}

function buildEveryPlateMediaUrl(assetPath) {
  if (typeof assetPath !== 'string' || !assetPath.startsWith('/')) {
    return null;
  }

  return `${EVERYPLATE_MEDIA_BASE_URL}${assetPath}`;
}

function stripCloudfrontSizePrefix(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) {
    return null;
  }

  return pathname.replace(/^\/[^/]+(?=\/)/, '');
}

export function normalizeEveryPlateMediaUrl(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.startsWith('/')) {
    return buildEveryPlateMediaUrl(normalizedValue);
  }

  try {
    const url = new URL(normalizedValue);

    if (url.hostname === EVERYPLATE_CLOUDFRONT_HOST) {
      return buildEveryPlateMediaUrl(stripCloudfrontSizePrefix(url.pathname));
    }

    if (url.hostname === EVERYPLATE_MEDIA_HOST) {
      const mediaPathIndex = url.pathname.indexOf('/everyplate_s3/');

      if (mediaPathIndex >= 0) {
        return buildEveryPlateMediaUrl(url.pathname.slice(mediaPathIndex + '/everyplate_s3'.length));
      }
    }
  } catch {
    return normalizedValue;
  }

  return normalizedValue;
}
