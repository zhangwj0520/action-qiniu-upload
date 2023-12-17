# Github Action for Uploading Files to Qiniu

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

这是上传文件到[七牛](https://qiniu.com)的Github Action。 :rocket:

此操作使用 [qiniu nodejs sdk](https://github.com/qiniu/nodejs-sdk) 将目录（来自您的存储库或在工作流程中生成）上传到云存储桶。

> [!重要]
> 支持覆盖上传

## 用法

```yaml
name: 上传文件到七牛Kodo

on:
  push:
    branches:
    - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      id: checkout
      uses: actions/checkout@v4
  
   - name: 本地测试Action
     id: test-action
     uses: zhangwj0520/action-qiniu-upload@main
     with:
        # Your qiniu access key, required.
        access_key: ${{ secrets.QINIU_ACCESS_KEY }}

        # Your qiniu secret key, required.
        secret_key: ${{ secrets.QINIU_SECRET_KEY }}

        # Bucket name, required.
        bucket: ${{ secrets.QINIU_BUCKET }}

         # 是否覆盖已有文件
        is_cover : true

        # The local directory (or file) you want to upload to bucket.
        # Default: './dist'
        source_dir: './dist'

        # The directory inside of the bucket you want to upload to, namely key prefix prepended to dest file key.
        # Default: '/'
        dest_dir: '/'

        # Whether to ignore source maps.
        # Default: true
        ignore_source_map: true
```

## License

[MIT license](LICENSE).