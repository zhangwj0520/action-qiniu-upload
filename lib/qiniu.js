import qiniu from 'qiniu';
import { NETDISK_LIMIT } from './constants';
import path from 'path';
import * as glob from 'glob';
import pAll from 'p-all';
import pRetry from 'p-retry';
import core from '@actions/core';
export default class QiniuUpload {
    mac;
    config;
    bucketManager;
    bucket;
    sourceDir;
    destDir;
    ignoreSourceMap;
    uploader;
    constructor({ accessKey, secretKey, bucket, zone, sourceDir, destDir, ignoreSourceMap }) {
        this.bucket = bucket;
        this.sourceDir = sourceDir;
        this.destDir = destDir;
        this.ignoreSourceMap = ignoreSourceMap;
        this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        // 获取七牛配置
        this.config = new qiniu.conf.Config();
        this.config.zone =
            qiniu.zone[(zone || 'Zone_z1')];
        // 资源管理相关的操作首先要构建BucketManager对象
        this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
        this.uploader = new qiniu.form_up.FormUploader(this.config);
        console.log('object created');
    }
    /**
     * 获取文件列表
     * @param marker 下一页标识
     * @param list 文件列表
     * @returns iFileListResult
     */
    async getFileList(marker = '', list = []) {
        // 是否需要搜索
        return new Promise((resolve, reject) => {
            this.bucketManager.listPrefix(this.bucket, {
                prefix: '',
                limit: NETDISK_LIMIT,
                delimiter: '',
                marker
            }, (err, respBody, respInfo) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (respInfo.statusCode === 200) {
                    for (const item of respBody.items) {
                        list.push(item.key);
                    }
                    if (respBody.marker) {
                        this.getFileList(respBody.marker, list);
                    }
                    else {
                        resolve(list);
                    }
                }
                else {
                    new Error(`Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`);
                    console.log(respBody);
                }
            });
        });
    }
    /**
     * 删除文件夹
     * @param files 文件目录名称
     */
    async deleteMultiFile(files) {
        if (files.length > 0) {
            // 批处理文件
            const copyOperations = files.map(fileName => {
                return qiniu.rs.deleteOp(this.bucket, fileName);
            });
            await new Promise((resolve, reject) => {
                this.bucketManager.batch(copyOperations, (err, respBody, respInfo) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (respInfo.statusCode === 200) {
                        resolve();
                    }
                    else if (respInfo.statusCode === 298) {
                        reject(new Error('操作异常，但部分文件夹删除成功'));
                    }
                    else {
                        reject(new Error(`Qiniu Error Code: ${respInfo.statusCode}, Info: ${respInfo.statusMessage}`));
                    }
                });
            });
        }
    }
    async uploadFile(file, key) {
        return new Promise((resolve, reject) => {
            const options = {
                scope: `${this.bucket}:${file}`
            };
            const putPolicy = new qiniu.rs.PutPolicy(options);
            const token = putPolicy.uploadToken(this.mac);
            const putExtra = new qiniu.form_up.PutExtra();
            this.uploader.putFile(token, key, file, putExtra, (err, body, info) => {
                if (err)
                    return reject(new Error(`Upload failed: ${file}`));
                if (info.statusCode === 200) {
                    core.info(`Success: ${file} => [${this.bucket}]: ${key}`);
                    return resolve({ file, to: key });
                }
                reject(new Error(`Upload failed: ${file}`));
            });
        });
    }
    normalizePath(input) {
        return input.replace(/^\//, '');
    }
    async upload() {
        console.log('upload: ');
        const baseDir = path.resolve(process.cwd(), this.sourceDir);
        console.log('baseDir: ', baseDir);
        const files = glob.sync(`${baseDir}/**/*`, { nodir: true });
        console.log('files: ', files);
        const tasks = files
            .map(file => {
            const relativePath = path.relative(baseDir, path.dirname(file));
            const key = this.normalizePath(path.join(this.destDir, relativePath, path.basename(file)));
            if (this.ignoreSourceMap && file.endsWith('.map'))
                return null;
            const task = async () => this.uploadFile(file, key);
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
    }
}
