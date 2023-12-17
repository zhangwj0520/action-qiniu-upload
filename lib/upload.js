import qiniu from 'qiniu';
import path from 'path';
import * as glob from 'glob';
import pAll from 'p-all';
import pRetry from 'p-retry';
import core from '@actions/core';
const normalizePath = (input) => {
    return input.replace(/^\//, '');
};
const upload = async ({ accessKey, secretKey, bucket, zone, sourceDir, destDir, ignoreSourceMap }) => {
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    // 获取七牛配置
    const config = new qiniu.conf.Config();
    config.zone = qiniu.zone[(zone || 'Zone_z1')];
    // 资源管理相关的操作首先要构建BucketManager对象
    const uploader = new qiniu.form_up.FormUploader(config);
    console.log('object created');
    const uploadFile = async (file, key) => {
        return new Promise((resolve, reject) => {
            const options = {
                scope: `${bucket}:${file}`
            };
            const putPolicy = new qiniu.rs.PutPolicy(options);
            const token = putPolicy.uploadToken(mac);
            const putExtra = new qiniu.form_up.PutExtra();
            uploader.putFile(token, key, file, putExtra, (err, body, info) => {
                if (err)
                    return reject(new Error(`Upload failed: ${file}`));
                if (info.statusCode === 200) {
                    core.info(`Success: ${file} => [${bucket}]: ${key}`);
                    return resolve({ file, to: key });
                }
                reject(new Error(`Upload failed: ${file}`));
            });
        });
    };
    console.log('upload: ');
    const baseDir = path.resolve(process.cwd(), sourceDir);
    console.log('baseDir: ', baseDir);
    const files = glob.sync(`${baseDir}/**/*`, { nodir: true });
    console.log('files: ', files);
    const tasks = files
        .map(file => {
        const relativePath = path.relative(baseDir, path.dirname(file));
        const key = normalizePath(path.join(destDir, relativePath, path.basename(file)));
        if (ignoreSourceMap && file.endsWith('.map'))
            return null;
        const task = async () => uploadFile(file, key);
        return async () => pRetry(task, { retries: 3 });
    })
        .filter(Boolean);
    try {
        await pAll(tasks, { concurrency: 5 });
        core.info('所有文件上次完毕!');
    }
    catch (error) {
        core.setFailed(error.message);
    }
};
export default upload;
