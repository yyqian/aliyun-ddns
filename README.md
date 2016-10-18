# aliyun-ddns

利用阿里云解析的 API 实现动态域名解析的功能（类似花生壳，例如定时地将自己的域名解析更新为家中当前的 IP 地址）。

没有任何 npm 依赖, 用到的原生 Node.js 模块有:

- http
- url
- crypto

## 使用场景

- 部署本服务在阿里云、AWS 等云服务器上
- 在本地（例如家里的 NAS、路由器、树莓派等）设定定时任务：访问服务端，以更新当前本地的 IP 地址

## 使用前提

- 域名是由阿里云/万网托管的
- 如果要将 IP 设置为客户端所在的公网 IP, 要确保客户端被当地 ISP 分配的不是大内网的 IP（如果是大内网的 IP, 可以给客服打电话要求更换）

## 服务器端程序部署

1. 复制 config-sample.json 并命名为 config.json
2. 修改 config.json 中的内容, 参数说明见下面
3. 用 pm2 或其他方式启动 app.js（已添加 Docker 启动方式，参照 Dockerfile 和 docker-run.sh 脚本）
4. 进行必要的网路配置（譬如 Nginx 反向代理, 防火墙等）, 确保应用服务能在公网中被访问到

## config.json 参数说明

- AccessKeyId 和 AccessKeySecret 在阿里云的控制台获取, 注意保密
- clientIpHeader 属性和反向代理有关（例如在 Nginx 后面）, 用于从 header 中获取客户端的 IP
- path 是自定义的访问路径, 默认为 `/hack`
- port 是自定义的服务器端监听的端口

## 客户端手动调用

调用的原理和花生壳类似, 假设在 config.json 中 `path` 属性是默认的 `/hack`, 有两种调用方法:

1. 在客户端调用 `/hack?hostname=foo.bar.com` 来设定 `foo.bar.com` 解析为当前客户端的公网 IP
2. 在客户端调用 `/hack?hostname=foo.bar.com&ip=xxx.xxx.xxx.xxx` 来设定 `foo.bar.com` 解析为 `xxx.xxx.xxx.xxx`

## 客户端 crontab 定时调用

1. 参照 client.sh 写个 shell script
2. 让脚本可运行: `chmod 775 client.sh`
3. 编辑 crontab: `crontab -e`
4. 添加记录, 让脚本 5 分钟调用一次: `0,5,10,15,20,25,30,35,40,45,50,55 * * * * /path/to/client.sh`
5. 重启 cron 服务: `sudo service cron restart`

## 安全事项

由于本服务的 API 未加任何身份验证措施，相当于是把阿里云解析的修改、添加 API 暴露在了外界，所以一定要注意入口地址的隐藏。
