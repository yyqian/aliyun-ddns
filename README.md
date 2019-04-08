# aliyun-ddns

利用阿里云解析的 API 实现动态域名解析的功能（类似花生壳，例如定时地将自己的域名解析更新为家中当前的 IP 地址）。

没有 npm 依赖, 只用了三个原生 Node.js 的模块: http, crypto, url

目前该工具分为两种模式的版本：

- client-mode，这种模式下只需要在客户端定时执行一个 Node.js 程序，当前地址的公网 IP 是借助访问公共的 API 来获取的
- server-mode，这种模式需要在服务端部署一个 Node.js 程序，并且在客户端定时请求服务端以使得服务端获知当前客户端所在地址的公网 IP

client-mode 推荐使用该模式，部署更为简单，无需云服务器资源，但要求客户端有 Node.js 的执行环境。

server-mode 适合一些客户端无法安装 Node.js 环境的场景（例如路由器）

## License

[![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg)](https://github.com/996icu/996.ICU/blob/master/LICENSE)

## 使用前提

- 域名是由阿里云/万网托管的
- 如果要将 IP 设置为客户端所在的公网 IP, 要确保客户端被当地 ISP 分配的不是大内网的 IP（如果是大内网的 IP, 可以给客服打电话要求更换）

## Client Mode

### 使用场景

- 在本地（例如家里的 NAS、树莓派等）定时执行客户端，通过公共 API 获取当前网络环境的公网 IP，然后更新 aliyun 中的 DNS 记录

### 客户端部署（crontab 定时调用）

1. 复制 client-mode/config-sample.json 并命名为 client-mode/config.json
2. 修改 client-mode/config.json 中的内容, 参数说明见下面
3. 参照 client-mode/client.sh 写个 shell script
4. 让脚本可运行: `chmod 775 client-mode/client.sh`
5. 编辑 crontab: `crontab -e`
6. 添加记录, 让脚本 5 分钟调用一次: `*/5 * * * * /path/to/client-mode/client.sh`
7. 重启 cron 服务

### client-mode/config.json 参数说明

- AccessKeyId 和 AccessKeySecret 在阿里云的控制台获取, 注意保密
- hostnames 是待更新的多个 DNS (子)域名

----------------------------------------------------------------------------------

## Server Mode

### 使用场景

- 部署本服务在阿里云、AWS 等公有云上
- 在本地（例如家里的 NAS、路由器、树莓派等）设定定时任务：访问服务端，以更新当前本地的 IP 地址

### 服务器端程序部署

1. 复制 server-mode/config-sample.json 并命名为 server-mode/config.json
2. 修改 server-mode/config.json 中的内容, 参数说明见下面
3. 用 pm2 或其他方式启动 server-mode/app.js；如果运行环境有 Docker，也可以直接 `docker-compose up` 来启动服务
4. 进行必要的网路配置（譬如 Nginx 反向代理, 防火墙等）, 确保应用服务能在公网中被访问到

### config.json 参数说明

- AccessKeyId 和 AccessKeySecret 在阿里云的控制台获取, 注意保密
- clientIpHeader 属性和反向代理有关（例如在 Nginx 后面）, 用于从 header 中获取客户端的 IP，如果无反响代理，可以不填
- path 是自定义的访问路径, 默认为 `/hack`
- port 是自定义的服务器端监听的端口

### 客户端手动调用

调用的原理和花生壳类似, 假设在 config.json 中 `path` 属性是默认的 `/hack`, 有两种调用方法:

1. 在客户端调用 `/hack?hostname=foo.bar.com` 来设定 `foo.bar.com` 解析为当前客户端的公网 IP
2. 在客户端调用 `/hack?hostname=foo.bar.com&ip=xxx.xxx.xxx.xxx` 来设定 `foo.bar.com` 解析为 `xxx.xxx.xxx.xxx`

### 客户端 crontab 定时调用

1. 参照 server-mode/client.sh 写个 shell script
2. 让脚本可运行: `chmod 775 server-mode/client.sh`
3. 编辑 crontab: `crontab -e`
4. 添加记录, 让脚本 5 分钟调用一次: `*/5 * * * * /path/to/server-mode/client.sh`
5. 重启 cron 服务

### 安全事项

由于在 server-mode 中，服务端暴露的 API 未加任何身份验证措施，相当于是把阿里云解析的修改、添加 API 暴露在了外界，所以一定要注意入口地址的隐藏。

