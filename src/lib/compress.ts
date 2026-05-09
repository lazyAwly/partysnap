export function calculateScale(
  width: number,
  height: number,
  maxWidth: number
): { w: number; h: number } {
  if (width <= maxWidth) return { w: width, h: height }
  const scale = maxWidth / width
  return { w: Math.round(width * scale), h: Math.round(height * scale) }
}

export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { w, h } = calculateScale(bitmap.width, bitmap.height, maxWidth)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size >= file.size) {
          resolve(file)
        } else {
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
            })
          )
        }
      },
      'image/jpeg',
      quality
    )
  })
}
