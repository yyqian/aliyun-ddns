"use strict";
let http = require('http');
let url = require('url');

/**
 * Docs:
 * url: https://nodejs.org/dist/latest-v4.x/docs/api/url.html
 * http: https://nodejs.org/dist/latest-v4.x/docs/api/http.html
 */

let options = {
  host: 'yyqian.com',
  port: 80,
  method: 'GET',
  path: '/'
};

let alidns = 'https://alidns.aliyuncs.com/';

let aliParams = {
  Format: 'JSON',
  Version: '2015-01-09',
  AccessKeyId: '',
  Signature: '',
  SignatureMethod: 'HMAC-SHA1',
  Timestamp: '',
  SignatureVersion: '1.0',
  SignatureNonce: ''
};

http.createServer(function (req, res) {
  req.on('error', function (err) {
    console.error(err);
    res.statusCode = 400;
    res.end();
  });
  res.on('error', function (err) {
    console.error(err);
  });
  let parsedUrl = url.parse(req.url, true);
  if (req.method === 'GET' && parsedUrl.pathname === '/update') {
    http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log('BODY: ' + chunk);
      });
      res.on('end', () => {
        console.log('No more data in response.')
      })
    }).end();
    res.statusCode = 200;
    var hostname = parsedUrl.query.hostname;
    res.end(hostname);
  } else {
    res.statusCode = 404;
    res.end();
  }
}).listen(8080);