import core from '@actions/core'

import upload from './upload'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    console.log(111111111)
    const accessKey = core.getInput('access_key')
    const secretKey = core.getInput('secret_key')
    const bucket = core.getInput('bucket')
    const zone = core.getInput('zone')

    const sourceDir = core.getInput('source_dir')
    const destDir = core.getInput('dest_dir')
    const ignoreSourceMap = core.getInput('ignore_source_map') === 'true'

    upload({
      accessKey,
      secretKey,
      bucket,
      zone,
      sourceDir,
      destDir,
      ignoreSourceMap
    })
    console.log(1111111121212)
    // const manager = new QiniuUpload({
    //   accessKey,
    //   secretKey,
    //   bucket,
    //   zone,
    //   sourceDir,
    //   destDir,
    //   ignoreSourceMap
    // })
    // console.log('manager', manager)
    // await manager.upload()
  } catch (error) {
    // 如果发生错误，则工作流运行失败, 退出并提供错误消息
    if (error instanceof Error) core?.setFailed(error.message)
  }
}
