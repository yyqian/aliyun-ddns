'use strict';
const http = require('http');
const url = require('url');
const alidns = require('./alidns.js');
const config = require('./config.json');

// hostname 以 query string 形式传入, 格式为 xx.example.com
// ip 如果在 query string 中出现, 则设定为该 ip, 否则设定为访问客户端的 ip
const getTarget = req => {
  return {
    hostname: url.parse(req.url, true).query.hostname,
    ip: url.parse(req.url, true).query.ip
    || req.headers[config.clientIpHeader.toLowerCase()]
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || req.connection.socket.remoteAddress
  };
};

// 这段代码首先会检查已有的记录
// 如果记录不存在, 会新建一个解析, 并返回 created
// 如果记录存在, ip 没变化, 不会更新 ip, 并返回 nochg
// 如果记录存在, ip 有变化, 会更新 ip, 并返回 updated
// 如果阿里云端返回 400 错误, 则返回 error
const updateRecord = (target, callback) => {
  const ip = target.ip;
  const subDomain = target.hostname;
  const domainName = subDomain.split('.').slice(-2).join('.');
  const rr = subDomain.split('.').slice(0, -2).join('.');
  const describeSubParams = {
    Action: 'DescribeSubDomainRecords',
    SubDomain: subDomain
  };
  const updateParmas = {
    Action: 'UpdateDomainRecord',
    RecordId: '',
    RR: rr,
    Type: 'A',
    Value: ip
  };
  const addParmas = {
    Action: 'AddDomainRecord',
    DomainName: domainName,
    RR: updateParmas.RR,
    Type: updateParmas.Type,
    Value: updateParmas.Value
  };
  // 首先获取域名信息, 目的是获取要更新的域名的 RecordId
  http.request({
    host: alidns.ALIDNS_HOST,
    path: alidns.getPath(describeSubParams)
  }, res => {
    let body = [];
    res
      .on('data', chunk => body.push(chunk))
      .on('end', () => {
        body = Buffer.concat(body).toString();
        const result = JSON.parse(body);
        // 获取要更新的域名的 RecordId, 并检查是否需要更新
        let shouldUpdate = false;
        let shouldAdd = true;
        result.DomainRecords.Record
          .filter(record => record.RR === updateParmas.RR)
          .forEach(record => {
            shouldAdd = false;
            if (record.Value !== updateParmas.Value) {
              shouldUpdate = true;
              updateParmas.RecordId = record.RecordId;
            }
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
        } else if (shouldAdd) {
          // 增加新的域名解析
          http.request({
            host: alidns.ALIDNS_HOST,
            path: alidns.getPath(addParmas)
          }, res => {
            if (res.statusCode === 200) {
              callback('added');
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

// 服务器端监听
http.createServer((req, res) => {
  req.on('error', err => {
    console.error(err);
    res.statusCode = 400;
    res.end();
  });
  res.on('error', err => {
    console.error(err);
  });
  if (req.method === 'GET' && url.parse(req.url, true).pathname === config.path) {
    const target = getTarget(req);
    updateRecord(target, (msg) => {
      if (msg === 'error') {
        res.statusCode = 400;
      }
      console.log(new Date() + ': [' + msg + '] ' + JSON.stringify(target));
      res.end(msg);
    });
  } else {
    res.statusCode = 404;
    res.end();
  }
}).listen(config.port);
