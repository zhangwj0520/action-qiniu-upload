export type QiniuConfig = {
  accessKey: string
  secretKey: string
  bucket: string
  zone: string
  sourceDir: string
  destDir: string
  ignoreSourceMap: boolean
  info: (msg: string) => void
  error: (msg: string) => void
  // zone: conf.Zone
}

export type UploadRes = {
  file: string
  to: string
}
