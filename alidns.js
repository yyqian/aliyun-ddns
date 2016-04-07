'use strict';
const config = require('./config.json');
const crypto = require('crypto');

const ALIDNS_HOST = 'alidns.aliyuncs.com';
const HTTP_METHOD = "GET";

// 参考: https://help.aliyun.com/document_detail/dns/api-reference/call-method/common-parameters.html?spm=5176.docdns/api-reference/call-method/request.6.129.DHgQI9
// 以下三个参数需要程序生成: Signature, Timestamp, SignatureNonce
const commonParams = {
  Format: 'JSON',
  Version: '2015-01-09',
  AccessKeyId: config.AccessKeyId,
  SignatureMethod: 'HMAC-SHA1',
  SignatureVersion: '1.0'
};

// 用于给 SignatureNonce 产生随机数
const getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 将请求的参数和公共参数合并
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

// 按照阿里的规则进行编码
// 参照: https://help.aliyun.com/document_detail/dns/api-reference/call-method/signature.html?spm=5176.docdns/api-reference/call-method/common-parameters.2.1.k7KttX
const percentEncode = function (x) {
  // JavaScript 的 encodeURIComponent 规则: encodeURIComponent escapes all characters except the following: alphabetic, decimal digits, - _ . ! ~ * ' ( )
  // 阿里云要求的规则: 对于字符 A-Z、a-z、0-9以及字符“-”、“_”、“.”、“~”不编码; 把编码后的字符串中加号（+）替换成%20、星号（*）替换成%2A、%7E替换回波浪号（~）
  // 因此需要手动处理的有: ! * ' ( )
  // 这里可能会有潜在的问题, 因为阿里的示例代码是 Java 写的, Java 的 URLEncoder 规则和 JavaScript 的 encodeURIComponent 规则有些差别
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
// 注意这里的 key 和 value 都需要进行编码
const convertJsonToQueryString = function (params) {
  return Object.keys(params)
    .sort()
    .map(x => percentEncode(x) + "=" + percentEncode(params[x]))
    .join("&");
};

// 注意这里的 canonicalizedQueryString 中的 K-V 对实际上会经过两次编码, 因为之前在构造 query string 时就编码过一次了
const getStringToSign = function (canonicalizedQueryString) {
  return HTTP_METHOD + '&' + percentEncode('/') + '&' + percentEncode(canonicalizedQueryString);
};

// 整合所有步骤
// 输入是待请求的参数（不包括公共参数）
// 输出是请求字符串（经过整合公共参数, 编码和签名, 可以直接使用）
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

// 模块化
module.exports = {
  getQueryString: getQueryString,
  getPath: reqParams => '/?' + getQueryString(reqParams),
  getUrl: reqParams => 'http://' + ALIDNS_HOST + '/?' + getQueryString(reqParams),
  ALIDNS_HOST: ALIDNS_HOST
};