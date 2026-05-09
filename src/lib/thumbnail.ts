export function thumbnailUrl(publicUrl: string, width: number, quality = 75): string {
  return (
    publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}`
  )
}
