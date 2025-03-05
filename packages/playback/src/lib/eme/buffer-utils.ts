/**
 * @param a First buffer for comparison
 * @param b Second buffer for comparison
 * @returns Whether or not the buffers are equal
 */
export const areBuffersEqual = (a: ArrayBuffer, b: ArrayBuffer): boolean => {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const dataA = new Uint8Array(a);
  const dataB = new Uint8Array(b);
  const l = dataA.length;

  for (let i = 0; i < l; i++) {
    if (dataA[i] !== dataB[i]) {
      return false;
    }
  }

  return true;
};

/**
 * @param data A buffer source
 * @returns A hex string key ID
 */
export const toHex = (data: BufferSource): string => {
  const arrayBuffer = getArrayBuffer(data);
  const arr = new Uint8Array(arrayBuffer);
  let hex = '';
  let stringValue;
  for (const value of arr) {
    stringValue = value.toString(16);
    if (stringValue.length === 1) {
      stringValue = '0' + stringValue;
    }
    hex += stringValue;
  }
  return hex;
};

/**
 * Get the array buffer even if it is inside the BufferSource.
 * @param source The buffer source
 * @returns The array buffer
 */
export const getArrayBuffer = (source: BufferSource): ArrayBuffer => {
  if (source instanceof ArrayBuffer) {
    return source;
  } else {
    return source.buffer as ArrayBuffer;
  }
};

/**
 * Gets an ArrayBuffer that contains the data from the given TypedArray.  Note
 * this will allocate a new ArrayBuffer if the object is a partial view of
 * the data.
 * @param buffer The buffer source
 * @returns An array buffer
 */
export const toArrayBuffer = (buffer: BufferSource): ArrayBuffer => {
  if (!ArrayBuffer.isView(buffer)) {
    return buffer;
  } else {
    const arrayView = buffer as ArrayBufferView;
    if (arrayView.byteOffset == 0 && arrayView.byteLength == arrayView.buffer.byteLength) {
      // TypedArray for the buffer.
      return arrayView.buffer as ArrayBuffer;
    }
    // View on the buffer. Create a new buffer that only contains
    // the data. Note that since this isn't an ArrayBuffer, the "new" call
    // will allocate a new buffer to hold the copy.
    return new Uint8Array(arrayView as unknown as ArrayBufferLike).buffer as ArrayBuffer;
  }
};

/**
 * @param data Buffer source data
 * @param offset Offest of the data
 * @param length Length of the data
 * @param type The expected type of typed array
 * @returns The typed array based on the data and expected type of array.
 */
export const bufferSourceToTypedArray = (
  data: BufferSource,
  offset: number,
  length: number,
  type: string
): ArrayBuffer | DataView | null => {
  const buffer = getArrayBuffer(data);
  const bytesPerElement = 1;
  // Note: It can be implied that the byteOffset for an arrayBuffer is 0.
  const dataEnd = data.byteLength / bytesPerElement;
  const rawStart = offset / bytesPerElement;
  const start = Math.floor(Math.max(0, Math.min(rawStart, dataEnd)));
  const end = Math.floor(Math.min(start + Math.max(length, 0), dataEnd));

  if (type === 'DataView') {
    return new DataView(buffer, start, end - start);
  } else if (type === 'Uint16Array') {
    return new Uint8Array(buffer, start, end - start) as unknown as ArrayBuffer;
  } else if (type === 'Uint8Array') {
    return new Uint16Array(buffer, start, end - start) as unknown as ArrayBuffer;
  } else {
    return null;
  }
};

/**
 * @param buffer The data buffer
 * @param offset Offset for the buffer
 * @param length Length for the buffer
 * @returns A Uint8Array from the buffer
 */
export const toUint8 = (buffer: BufferSource, offset = 0, length = Infinity): Uint8Array => {
  return bufferSourceToTypedArray(buffer, offset, length, 'Uint8Array') as unknown as Uint8Array;
};

/**
 * @param buffer The data buffer
 * @param offset Offset for the buffer
 * @param length Length for the buffer
 * @returns A Uint16Array from the buffer
 */
export const toUint16 = (buffer: BufferSource, offset = 0, length = Infinity): Uint16Array => {
  return bufferSourceToTypedArray(buffer, offset, length, 'Uint16Array') as unknown as Uint16Array;
};

/**
 * @param buffer The data buffer
 * @param offset Offset for the buffer
 * @param length Length for the buffer
 * @returns A DataView for the buffer
 */
export const toDataView = (buffer: BufferSource, offset = 0, length = Infinity): DataView => {
  return bufferSourceToTypedArray(buffer, offset, length, 'DataView') as DataView;
};
