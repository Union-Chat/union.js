const https = require('https');
const { parse } = require('url');

const API_ENDPOINT = 'https://union.serux.pro/api/';
const ENDPOINTS = {
    Message: 'message'
};

function request (method, endpoint, headers, data) {
    return new Promise((resolve, reject) => {
        const route = parse(API_ENDPOINT + endpoint);
        const { hostname, path } = route;

        headers = Object.assign(headers, defaultHeaders);

        const opts = {
            method,
            hostname,
            path,
            headers
        };

        const req = https.request(opts, (res) => {
            if (res.statusCode !== 200) {
                return reject({ statusCode: res.statusCode, error: res.statusMessage });
            }

            const chunks = [];

            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const concatenated = Buffer.concat(chunks).toString();

                try {
                    resolve(JSON.parse(concatenated));
                } catch(_) {
                    resolve(concatenated);
                }
            });
        }).on('error', reject);

        req.end(JSON.stringify(data));
    });
}

function get (endpoint, headers = {}, data = {}) {
    return request('GET', endpoint, headers, data);
}

function post (endpoint, headers = {}, data = {}) {
    return request('POST', endpoint, headers, data);
}

const defaultHeaders = {
    'User-Agent': 'UnionBot/1.0 (union.js, https://github.com/Union-Chat/union.js)',
    'Content-Type': 'application/json'
};

module.exports = {
    ENDPOINTS,
    get,
    post
};
