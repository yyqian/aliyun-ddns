'use strict';
const http = require('http');
const url = require('url');
const alidns = require('./alidns.js');
const config = require('./config.json');

// hostname 以 query string 形式传入, 格式为 xx.example.com
// ip 如果在 query string 中出现, 则设定为该 ip, 否则设定为访问客户端的 ip
// 这里假设本服务端程序在 nginx 后面, 并且真实 ip 存放在 header 的 X-Real-IP 属性中
const getTarget = function (req) {
  return {
    hostname: url.parse(req.url, true).query.hostname,
    ip: url.parse(req.url, true).query.ip || req.headers['X-Real-IP']
  }
};

const updateRecord = function (target, callback) {
  const describeParams = {
    Action: 'DescribeDomainRecords',
    DomainName: target.hostname.split('.').slice(1).join('.')
  };
  const updateParmas = {
    Action: 'UpdateDomainRecord',
    RecordId: '',
    RR: target.hostname.split('.')[0],
    Type: 'A',
    Value: target.ip
  };
  // 首先获取域名信息, 目的是获取要更新的域名的 RecordId
  http.request({
    host: alidns.ALIDNS_HOST,
    path: alidns.getPath(describeParams)
  }, res => {
    let body = [];
    res
      .on('data', chunk => body.push(chunk))
      .on('end', () => {
        body = Buffer.concat(body).toString();
        const result = JSON.parse(body);
        // 获取要更新的域名的 RecordId, 并检查是否需要更新
        let shouldUpdate = false;
        result.DomainRecords.Record
          .filter(record => record.RR === updateParmas.RR)
          .forEach(record => {
            if (record.Value !== updateParmas.Value) {
              shouldUpdate = true;
            }
            updateParmas.RecordId = record.RecordId;
          });
        if (shouldUpdate) {
          // 更新域名的解析
          http.request({
            host: alidns.ALIDNS_HOST,
            path: alidns.getPath(updateParmas)
          }, res => {
            if (res.statusCode === 200) {
              callback('updated');
            } else {
              callback('error');
            }
          }).end();
        } else {
          callback('nochg');
        }
      });
  }).end();
};

http.createServer((req, res) => {
  req.on('error', err => {
    console.error(err);
    res.statusCode = 400;
    res.end();
  });
  res.on('error', err => {
    console.error(err);
  });
  const parsedUrl = url.parse(req.url, true);
  if (req.method === 'GET' && parsedUrl.pathname === '/update') {
    const target = getTarget(req);
    updateRecord(target, (msg) => {
      if (msg === 'error') {
        res.statusCode = 400;
      }
      res.end(msg);
    });
  } else {
    res.statusCode = 404;
    res.end();
  }
}).listen(config.port);