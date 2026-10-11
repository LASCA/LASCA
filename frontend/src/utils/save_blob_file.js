export const saveBlobFile = async (
  blob,
  defaultFileName,
  fileTypeDescription = 'File',
  acceptedExtensions = ['.pdf', '.dxf', '.png'],
  mimeType = '*/*'
) => {
  if (typeof window.showSaveFilePicker === 'function') {
    let fileHandle;
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [{ description: fileTypeDescription, accept: { [mimeType]: acceptedExtensions } }]
      });
    } catch (error) {
      if (error?.name === 'AbortError') return false;
      console.warn('showSaveFilePicker failed, falling back to browser download:', error);
    }

    if (fileHandle) {
      let writable;
      try {
        writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') return false;
        console.warn('Writing with showSaveFilePicker failed, falling back to browser download:', error);
        try {
          await writable?.abort();
        } catch (abortError) {
          console.warn('Could not abort the failed save operation:', abortError);
        }
      }
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  return true;
};

const decodeImageData = (imageData) => {
  const dataUrlMatch = imageData.match(/^data:(image\/(?:png|jpeg));base64,([\s\S]+)$/i);
  const mimeType = dataUrlMatch?.[1]?.toLowerCase() || 'image/png';
  const base64 = (dataUrlMatch?.[2] || imageData).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');

  if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1) {
    throw new Error('The chart image is not valid base64 data.');
  }

  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = window.atob(paddedBase64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (bytes.length === 0) throw new Error('The chart image is empty.');

  return new Blob([bytes], { type: mimeType });
};

export const saveImageFile = async (imageData, defaultFileName) => {
  let blob;

  if (imageData instanceof Blob) {
    blob = imageData;
  } else if (typeof HTMLCanvasElement !== 'undefined' && imageData instanceof HTMLCanvasElement) {
    blob = await new Promise((resolve, reject) => {
      try {
        imageData.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('The chart canvas could not be converted to an image.'));
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  } else if (typeof imageData === 'string') {
    if (/^data:image\//i.test(imageData) && !/^data:image\/(?:png|jpeg);base64,/i.test(imageData)) {
      throw new Error('Only base64-encoded PNG and JPEG chart images are supported.');
    }
    blob = decodeImageData(imageData);
  } else {
    throw new Error('The chart image data is missing or unsupported.');
  }

  if (!['image/png', 'image/jpeg'].includes(blob.type.toLowerCase())) {
    throw new Error(`Unsupported chart image type: ${blob.type || 'unknown'}.`);
  }

  const extension = blob.type.toLowerCase() === 'image/jpeg' ? '.jpg' : '.png';
  const fileName = /\.[^./\\]+$/.test(defaultFileName)
    ? defaultFileName.replace(/\.[^./\\]+$/, extension)
    : `${defaultFileName}${extension}`;

  return saveBlobFile(blob, fileName, 'Chart image', [extension], blob.type);
};