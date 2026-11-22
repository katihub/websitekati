declare module 'heic2any' {
  export default function heic2any(options: {
    blob: Blob
    toType?: 'image/jpeg' | 'image/png' | 'image/gif'
    quality?: number
  }): Promise<Blob | Blob[]>
}
