'use strict';
let config = require('./config.json');

let HTTP_METHOD = "GET";
let alidns = 'https://alidns.aliyuncs.com/';

// Missing: Signature, Timestamp, SignatureNonce
let commonParams = {
  Format: 'JSON',
  Version: '2015-01-09',
  AccessKeyId: config.AccessKeyId,
  SignatureMethod: 'HMAC-SHA1',
  SignatureVersion: '1.0'
};

let getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

let fillCommonParams = function (reqParams) {
  Object.keys(commonParams).forEach((x) => {
    reqParams[x] = commonParams[x];
  });
  var timestamp = new Date();
  reqParams["Timestamp"] = timestamp.toISOString();
  reqParams["SignatureNonce"] = getRandomInt(100000000, 1000000000 - 1);
};

let getQueryString = function (params) {
  return Object.keys(params)
    .sort()
    .map((x) => {
      return x + "=" + params[x];
    })
    .join("&");
};

let percentEncode = function (x) {
  // encodeURIComponent escapes all characters except the following: alphabetic, decimal digits, - _ . ! ~ * ' ( )
  // 阿里云要求: 对于字符 A-Z、a-z、0-9以及字符“-”、“_”、“.”、“~”不编码
  // 需要手动处理的有: ! * ' ( )
  return encodeURIComponent(x)
    .replace("+", "%20")
    .replace("*", "%2A");
};

let getStringToSign = function (canonicalizedQueryString) {
  return HTTP_METHOD + '&' + percentEncode('/') + '&' + percentEncode(canonicalizedQueryString);
};

// testing
var reqParams = {
  Action: "UpdateDomainRecord",
  RecordId: "9999985",
  RR: "io",
  Type: "A",
  Value: "202.106.0.20"
};
fillCommonParams(reqParams);
console.log(getStringToSign(getQueryString(reqParams)));