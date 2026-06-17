function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof (globalThis.crypto as any).getRandomValues === 'undefined') {
  (globalThis as any).crypto.getRandomValues = (array: any) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
if (typeof (globalThis.crypto as any).randomUUID === 'undefined') {
  (globalThis as any).crypto.randomUUID = genUUID;
}
