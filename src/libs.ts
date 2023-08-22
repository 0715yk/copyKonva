export function getDrawCursor(strokeWidth: number, brushColor: string) {
  const circle = `
    <svg
      height="${strokeWidth}"
      fill="${brushColor}"
      viewBox="0 0 ${strokeWidth * 2} ${strokeWidth * 2}"
      width="${strokeWidth}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="50%"
        cy="50%"
        r="${strokeWidth}" 
      />
    </svg>
  `;
  return `url(data:image/svg+xml;base64,${window.btoa(circle)}) ${Math.ceil(
    strokeWidth / 2
  )} ${Math.ceil(strokeWidth / 2)}, pointer`;
}

export function dataURItoBlob(dataURI: string) {
  const byteString = window.atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const bb = new Blob([ab], { type: mimeString });
  return bb;
}
