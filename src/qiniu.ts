import qiniu, { rs, conf, auth } from 'qiniu'
import type { QiniuConfig, UploadRes } from './type'
import { NETDISK_LIMIT } from './constants'

import path from 'path'
import * as glob from 'glob'
import pAll from 'p-all'
import pRetry from 'p-retry'

export default class QiniuUpload {
  private mac: auth.digest.Mac
  private config: conf.ConfigOptions
  private bucketManager: rs.BucketManager
  private bucket: string
  private sourceDir: string
  private destDir: string
  private ignoreSourceMap: boolean
  private uploader: qiniu.form_up.FormUploader
  private info: (msg: string) => void
  private error: (msg: string) => void

  constructor({
    accessKey,
    secretKey,
    bucket,
    sourceDir = './dist',
    destDir = '',
    ignoreSourceMap,
    info,
    error
  }: QiniuConfig) {
    this.bucket = bucket
    this.sourceDir = sourceDir
    this.destDir = destDir
    this.ignoreSourceMap = ignoreSourceMap
    this.info = info
    this.error = error

    this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    // 获取七牛配置
    this.config = new qiniu.conf.Config()
    this.config.zone = qiniu.zone.Zone_z1
    // 资源管理相关的操作首先要构建BucketManager对象
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config)

    this.uploader = new qiniu.form_up.FormUploader(this.config)
    this.info('uploader init done')
  }

  /**
   * 获取文件列表
   * @param marker 下一页标识
   * @param list 文件列表
   * @returns iFileListResult
   */
  async getFileList(marker = '', list: string[] = []): Promise<string[]> {
    // 是否需要搜索
    return new Promise<string[]>((resolve, reject) => {
      this.bucketManager.listPrefix(
        this.bucket,
        {
          prefix: '',
          limit: NETDISK_LIMIT,
          delimiter: '',
          marker
        },
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }

          if (respInfo.statusCode === 200) {
            for (const item of respBody.items) {
              list.push(item.key)
            }
            if (respBody.marker) {
              this.getFileList(respBody.marker, list)
            } else {
              resolve(list)
            }
          } else {
            new Error(
              `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`
            )
            console.log(respBody)
          }
        }
      )
    })
  }

  /**
   * 删除文件夹
   * @param files 文件目录名称
   */
  async deleteMultiFile(files: string[]): Promise<void> {
    if (files.length > 0) {
      // 批处理文件
      const copyOperations = files.map(fileName => {
        return qiniu.rs.deleteOp(this.bucket, fileName)
      })
      await new Promise<void>((resolve, reject) => {
        this.bucketManager.batch(copyOperations, (err, respBody, respInfo) => {
          if (err) {
            reject(err)
            return
          }
          if (respInfo.statusCode === 200) {
            resolve()
          } else if (respInfo.statusCode === 298) {
            reject(new Error('操作异常，但部分文件夹删除成功'))
          } else {
            reject(
              new Error(
                `Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`
              )
            )
          }
        })
      })
    }
  }

  async uploadFile(file: string, key: string): Promise<UploadRes> {
    this.info(`Uploading file ${file} to ${key}`)
    return new Promise((resolve, reject) => {
      const options = {
        scope: `${this.bucket}:${key}`
      }
      const putPolicy = new qiniu.rs.PutPolicy(options)
      const token = putPolicy.uploadToken(this.mac)
      const putExtra = new qiniu.form_up.PutExtra()

      this.uploader.putFile(token, key, file, putExtra, (err, body, info) => {
        if (err) {
          return reject(new Error(`文件上次失败: ${file}, ${err}`))
        }

        if (info.statusCode === 200) {
          this.info(`文件上次成功: ${file} ========>  ${key}`)
          return resolve({ file, to: key })
        }
        this.error(`Error: ${err}`)
        reject(new Error(`文件上次失败: ${key}`))
      })
    })
  }
  private normalizePath(input: string): string {
    return input.replace(/^\//, '')
  }

  async upload(): Promise<void> {
    const baseDir = path.resolve(process.cwd(), this.sourceDir)
    const files = glob.sync(`${baseDir}/**/*`, { nodir: true })

    const tasks = files
      .map(file => {
        const relativePath = path.relative(baseDir, path.dirname(file))
        const key = this.normalizePath(
          path.join(this.destDir, relativePath, path.basename(file))
        )

        if (this.ignoreSourceMap && file.endsWith('.map')) return null

        const task = async (): Promise<UploadRes> => this.uploadFile(file, key)

        return async () => pRetry(task, { retries: 3 })
      })
      .filter(Boolean) as (() => Promise<UploadRes>)[]

    try {
      await pAll(tasks, { concurrency: 5 })
      this.info('所有文件上传完毕!')
    } catch (error) {
      this.error((error as Error).message || 'Error')
    }
  }
}
