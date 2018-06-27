'use strict';
const http = require('http');
const alidns = require('./alidns.js');
const config = require('./config.json');

const simpleGetPubIpUrl = [
    'api.ipify.org',
    'canhazip.com',
    'ident.me',
    'whatismyip.akamai.com',
    'myip.dnsomatic.com']

const taobaoApi = {
    option: {
        host: "ip.taobao.com",
        path: "/service/getIpInfo2.php?ip=myip",
        method: "POST"
    },
    parser: body => {
        const j = JSON.parse(body);
        return j.data.ip;
    }
}

function isValidIp(ip) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
        return true;
    } else {
        return false;
    }
}

function getPubIpGeneric(option, parser, callback) {
    const req = http.request(option, res => {
        res.setEncoding('utf8');
        let body = '';
        res
            .on('data', chunk => body += chunk)
            .on('end', () => {
                body = parser(body);
                if (isValidIp(body)) {
                    callback(body);
                } else {
                    callback(null);
                }
            });
    });
    req.on('error', (e) => {
        callback(null);
    });
    req.end();
}

function pubIpApi() {
    let apiList = [];
    for (let i = 0; i < simpleGetPubIpUrl.length; ++i) {
        apiList[i] = {
            option: {
                host: simpleGetPubIpUrl[i],
                method: "GET"
            },
            parser: body => body.trim()
        };
    }
    apiList[simpleGetPubIpUrl.length] = taobaoApi;
    return apiList;
}

const apiList = pubIpApi();

function getPubIpRecur(callback, i) {
    if (i >= apiList.length) {
        callback(null);
        return;
    }
    getPubIpGeneric(apiList[i].option, apiList[i].parser, ip => {
        if (ip) {
            callback(ip);
        } else {
            getPubIpRecur(callback, i + 1);
        }
    });
}

function getPubIp(callback) {
    getPubIpRecur(callback, 0);
}

function main() {
    getPubIp(pubIp => {
        if (!pubIp) {
            console.log(new Date() + ': [noip]');
            return;
        }
        let hostnames = config.hostnames;
        for (let hostname of hostnames) {
            let target = {
                hostname: hostname,
                ip: pubIp
            };
            alidns.updateRecord(target, (msg) => {
                console.log(new Date() + ': [' + msg + '] ' + JSON.stringify(target));
            });
        }
    });
}

main();