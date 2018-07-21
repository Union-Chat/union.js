const https = require('https');
const { parse } = require('url');


const API_ENDPOINT = 'https://union.serux.pro/api/';

const ENDPOINTS = {
  Message: 'server/:id/messages'
};

const defaultHeaders = {
  'User-Agent': 'UnionBot/1.0 (union.js, https://github.com/Union-Chat/union.js)',
  'Content-Type': 'application/json'
};


function getRoute (route, id) {
  return ENDPOINTS[route].replace(':id', id);
}


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
      const chunks = [];

      res.on('data', chunks.push.bind(chunks));
      res.on('end', () => {
        const concatenated = jsonSafeParse(Buffer.concat(chunks).toString());

        if (res.statusCode !== 200) {
          reject(concatenated, res.statusCode);
        } else {
          resolve(concatenated);
        }
      });
    }).on('error', reject);

    req.end(JSON.stringify(data));
  });
}

function jsonSafeParse (data) {
  try {
    return JSON.parse(data);
  } catch (_) {
    return data;
  }
}


module.exports = {
  ENDPOINTS,
  get: request.bind(null, 'GET'),
  post: request.bind(null, 'POST'),
  getRoute
};
