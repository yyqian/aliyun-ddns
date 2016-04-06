'use strict';
const config = require('./config.json');
const crypto = require('crypto');

const HTTP_METHOD = "GET";

// 参考: https://help.aliyun.com/document_detail/dns/api-reference/call-method/common-parameters.html?spm=5176.docdns/api-reference/call-method/request.6.129.DHgQI9
// Missing: Signature, Timestamp, SignatureNonce
const commonParams = {
  Format: 'JSON',
  Version: '2015-01-09',
  AccessKeyId: config.AccessKeyId,
  SignatureMethod: 'HMAC-SHA1',
  SignatureVersion: '1.0'
};

const getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getCombinedParams = function (reqParams) {
  const combinedParams = {};
  Object.keys(reqParams).forEach((x) => {
    combinedParams[x] = reqParams[x];
  });
  Object.keys(commonParams).forEach((x) => {
    combinedParams[x] = commonParams[x];
  });
  const timestamp = new Date();
  combinedParams["Timestamp"] = timestamp.toISOString();
  combinedParams["SignatureNonce"] = getRandomInt(100000000, 1000000000 - 1);
  return combinedParams;
};

const percentEncode = function (x) {
  // encodeURIComponent escapes all characters except the following: alphabetic, decimal digits, - _ . ! ~ * ' ( )
  // 阿里云要求: 对于字符 A-Z、a-z、0-9以及字符“-”、“_”、“.”、“~”不编码
  // 需要手动处理的有: ! * ' ( )
  return encodeURIComponent(x)
    .replace("!", "%21")
    .replace("'", "%27")
    .replace("(", "%28")
    .replace(")", "%29")
    .replace("+", "%20")
    .replace("*", "%2A")
    .replace("%7E", "~");
};

// 参考: https://help.aliyun.com/document_detail/dns/api-reference/call-method/signature.html?spm=5176.docdns/api-reference/call-method/common-parameters.2.1.3RYnvO
const convertJsonToQueryString = function (params) {
  return Object.keys(params)
    .sort()
    .map((x) => {
      return percentEncode(x) + "=" + percentEncode(params[x]);
    })
    .join("&");
};

const getStringToSign = function (canonicalizedQueryString) {
  return HTTP_METHOD + '&' + percentEncode('/') + '&' + percentEncode(canonicalizedQueryString);
};

// Export this
const getQueryString = function (reqParams) {
  const combinedParams = getCombinedParams(reqParams);
  let canonicalizedQueryString = convertJsonToQueryString(combinedParams);
  const stringToSign = getStringToSign(canonicalizedQueryString);
  const hmac = crypto.createHmac('sha1', config.AccessKeySecret + '&');
  hmac.update(stringToSign);
  const Signature = hmac.digest('base64');
  canonicalizedQueryString += '&Signature=' + percentEncode(Signature);
  return canonicalizedQueryString;
};

module.exports = {
  getQueryString: getQueryString,
  getPath: function (reqParams) {
    return '/?' + getQueryString(reqParams);
  },
  getUrl: function (reqParams) {
    return 'http://alidns.aliyuncs.com/?' + getQueryString(reqParams);
  },
};