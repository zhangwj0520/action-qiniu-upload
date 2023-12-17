import core from '@actions/core'

import upload from './upload'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    console.log(111111111)

    const ms: string = core.getInput('milliseconds')

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)

    const accessKey = core.getInput('access_key')
    console.log('accessKey: ', accessKey)
    const secretKey = core.getInput('secret_key')
    console.log('secretKey: ', secretKey)
    const bucket = core.getInput('bucket')
    console.log('bucket: ', bucket)
    const zone = core.getInput('zone')
    console.log('zone: ', zone)

    const sourceDir = core.getInput('source_dir')
    console.log('sourceDir: ', sourceDir)
    const destDir = core.getInput('dest_dir')
    console.log('destDir: ', destDir)
    const ignoreSourceMap = core.getInput('ignore_source_map') === 'true'
    console.log('ignoreSourceMap: ', ignoreSourceMap)

    console.log(111)
    await upload({
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
