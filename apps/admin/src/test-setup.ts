// jsdom's Blob has no arrayBuffer(), which every browser the admin supports has.
Blob.prototype.arrayBuffer ??= function (this: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(this);
  });
};
