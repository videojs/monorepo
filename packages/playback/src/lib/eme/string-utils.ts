import { toArrayBuffer, toUint8, toDataView } from './buffer-utils';

/**
 * Takes a string and converts it to UTF16.
 * @param data The string to convert to UTF16
 * @param isLittleEndian Whether endianness is little
 * @returns the UTF16 array buffer
 */
export const toUTF16 = (data: string, isLittleEndian: boolean): ArrayBuffer => {
  const result = new ArrayBuffer(data.length * 2);
  const view = new DataView(result);
  for (let i = 0; i < data.length; ++i) {
    const value = data.charCodeAt(i);
    view.setUint16(i * 2, value, isLittleEndian);
  }
  return result;
};

/**
 * @param data A string with buffer data
 * @returns An ArrayBuffer coverted to UTF-8
 */
export const toUTF8 = (data: string): ArrayBuffer => {
  if (window.TextEncoder) {
    const utf8Encoder = new TextEncoder();
    return toArrayBuffer(utf8Encoder.encode(data));
  } else {
    // Converts the given string to a URI encoded string. This
    // logic is to account for escaoe sequences.
    const encoded = encodeURIComponent(data);
    // Convert each escape sequence individually into a character.
    const utf8 = decodeURIComponent(encoded);

    const result = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) {
      const item = utf8[i];
      result[i] = item.charCodeAt(0);
    }

    return toArrayBuffer(result);
  }
};

/**
 * Automatically detects which buffer type is being used, and converts it to a string.
 * @param data The buffer source
 * @returns A string from the buffer
 */
export const bufferToString = (data: BufferSource): string | null => {
  const uint8 = toUint8(data) as Uint8Array;

  const isAscii = (num: number): boolean => {
    return uint8.byteLength <= num || (uint8[num] >= 0x20 && uint8[num] <= 0x7e);
  };

  if (uint8[0] == 0xef && uint8[1] == 0xbb && uint8[2] == 0xbf) {
    return fromUTF8(uint8);
  } else if (uint8[0] == 0xfe && uint8[1] == 0xff) {
    return fromUTF16(uint8.subarray(2), false);
  } else if (uint8[0] == 0xff && uint8[1] == 0xfe) {
    return fromUTF16(uint8.subarray(2), true);
  }

  // These are the fallback cases when byte order was not found.
  if (uint8[0] == 0 && uint8[2] == 0) {
    return fromUTF16(data, false);
  } else if (uint8[1] == 0 && uint8[3] == 0) {
    return fromUTF16(data, true);
  } else if (isAscii(0) && isAscii(1) && isAscii(2) && isAscii(3)) {
    return fromUTF8(data);
  }

  // Something went wrong.
  return null;
};

export const fromUTF16 = (data: BufferSource, isLittleEndian: boolean): string | null => {
  if (data.byteLength % 2 != 0) {
    // Data length must be even
    return null;
  }

  // Use DataView to ensure correct endianness.
  const length = Math.floor(data.byteLength / 2);
  const uint16 = new Uint16Array(length);
  const dataView = toDataView(data) as DataView;
  for (let i = 0; i < length; i++) {
    uint16[i] = dataView.getUint16(i * 2, isLittleEndian);
  }
  return fromCharCode(uint16);
};

/**
 * @param data The buffer source
 * @returns A string from the given UTF-8 encoded buffer. Returns null if there was a failure.
 */
export const fromUTF8 = (data: BufferSource): string | null => {
  let uint8 = toUint8(data) as Uint8Array;
  // Remove the UTF-8 BOM.
  if (uint8[0] == 0xef && uint8[1] == 0xbb && uint8[2] == 0xbf) {
    uint8 = uint8.subarray(3);
  }

  if (window.TextDecoder) {
    // Use the TextDecoder when present in browser.
    const utf8decoder = new TextDecoder();
    const decoded = utf8decoder.decode(uint8);
    if (decoded.includes('\uFFFD')) {
      // There is an unknown character, so the encoding was invalid.
      return null;
    }
    return decoded;
  } else {
    // See https://github.com/shaka-project/shaka-player/blob/356de09850b1f920400d8d0c3a817ee1f713c1cd/lib/util/string_utils.js
    // A decoder for when the Text Decoder is not present.

    let decoded = '';
    for (let i = 0; i < uint8.length; ++i) {
      // By default, the replacement character codepoint.
      let codePoint = 0xfffd;

      // Top bit is 0, 1-byte encoding.
      if ((uint8[i] & 0x80) == 0) {
        codePoint = uint8[i];
      } else if (uint8.length >= i + 2 && (uint8[i] & 0xe0) == 0xc0 && (uint8[i + 1] & 0xc0) == 0x80) {
        // Top 3 bits of byte 0 are 110, top 2 bits of byte 1 are 10,
        // 2-byte encoding.
        codePoint = ((uint8[i] & 0x1f) << 6) | (uint8[i + 1] & 0x3f);
        // Move one byte.
        i += 1;
      } else if (
        uint8.length >= i + 3 &&
        (uint8[i] & 0xf0) == 0xe0 &&
        (uint8[i + 1] & 0xc0) == 0x80 &&
        (uint8[i + 2] & 0xc0) == 0x80
      ) {
        // Top 4 bits of byte 0 are 1110, top 2 bits of byte 1 and 2 are 10,
        // 3-byte encoding.
        codePoint = ((uint8[i] & 0x0f) << 12) | ((uint8[i + 1] & 0x3f) << 6) | (uint8[i + 2] & 0x3f);

        // Move two bytes
        i += 2;
      } else if (
        uint8.length >= i + 4 &&
        (uint8[i] & 0xf1) == 0xf0 &&
        (uint8[i + 1] & 0xc0) == 0x80 &&
        (uint8[i + 2] & 0xc0) == 0x80 &&
        (uint8[i + 3] & 0xc0) == 0x80
      ) {
        // Top 5 bits of byte 0 are 11110, top 2 bits of byte 1, 2 and 3 are 10,
        // 4-byte encoding.
        codePoint =
          ((uint8[i] & 0x07) << 18) |
          ((uint8[i + 1] & 0x3f) << 12) |
          ((uint8[i + 2] & 0x3f) << 6) |
          (uint8[i + 3] & 0x3f);

        // Move three bytes.
        i += 3;
      }

      // JavaScript strings are a series of UTF-16 characters.
      if (codePoint <= 0xffff) {
        decoded += String.fromCharCode(codePoint);
      } else {
        // UTF-16 surrogate-pair encoding, based on
        // https://en.wikipedia.org/wiki/UTF-16#Description
        const baseCodePoint = codePoint - 0x10000;
        const highPart = baseCodePoint >> 10;
        const lowPart = baseCodePoint & 0x3ff;
        decoded += String.fromCharCode(0xd800 + highPart);
        decoded += String.fromCharCode(0xdc00 + lowPart);
      }
    }

    return decoded;
  }
};

/**
 * @param buffer The typed array of data
 * @returns The typed array as a string
 */
export const fromCharCode = (buffer: Uint8Array | Uint16Array): string | null => {
  // Different browsers support different chunk sizes; find out the largest
  // this browser supports so we can use larger chunks on supported browsers
  // but still support lower-end devices that require small chunks.
  // 64k is supported on all major desktop browsers.
  for (let size = 64 * 1024; size > 0; size /= 2) {
    if (supportsChunkSize(size)) {
      let ret = '';
      for (let i = 0; i < buffer.length; i += size) {
        const subArray = buffer.subarray(i, i + size);
        ret += String.fromCharCode.apply(null, Array.from<number>(subArray));
      }

      return ret;
    }
  }
  // Chunk size was not supported
  return null;
};

/**
 * @param size The chunk size
 * @returns Whether or not this browser supports the chunk size.
 */
const supportsChunkSize = (size: number): boolean => {
  try {
    const buffer = new Uint8Array(size);

    // This can't use the spread operator, or it blows up on Xbox One.
    // So we use apply() instead, which is normally not allowed.
    // See issue #2186 for more details.
    const supported = String.fromCharCode.apply(null, Array.from<number>(new Uint8Array(buffer)));
    return supported.length > 0;
  } catch (error) {
    return false;
  }
};
