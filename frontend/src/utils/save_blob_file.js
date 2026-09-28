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

    if (!fileHandle) return false;
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
};