'use strict';
const http = require('http');
const encode = require('./encode.js');

const target = {
  domain: 'yyqian.com',
  rr: 'x',
  ip: '120.27.149.12'
};

const updateParmas = {
  Action: 'UpdateDomainRecord',
  RecordId: '',
  RR: target.rr,
  Type: 'A',
  Value: target.ip
};
const describeParams = {
  Action: 'DescribeDomainRecords',
  DomainName: target.domain
};
const options = {
  host: 'alidns.aliyuncs.com',
  path: encode.getPath(describeParams)
};
http.request(options, function (res) {
  let body = [];
  res.on('data', (chunk) => {
    body.push(chunk)
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    const result = JSON.parse(body);
    result.DomainRecords.Record.forEach(function (record) {
      if (record.RR === updateParmas.RR) {
        updateParmas.RecordId = record.RecordId;
      }
    });
    options.path = encode.getPath(updateParmas);
    console.log(JSON.stringify(updateParmas));
    http.request(options).end();
  });
}).end();