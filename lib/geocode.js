'use strict';

const http = require('http');

module.exports = (query, cb) => {
  const options = {
    hostname: 'maps.googleapis.com',
    path: `/maps/api/geocode/json?address=${encodeURIComponent(query)}`,
  };
  http.request(options, (res) => {
    var data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      data = JSON.parse(data);
      if (data.results.length){
        cb(null, data.results[0].geometry.location);
      } else {
        cb('Результаты не найдены.', null);
      }
    });
  }).end();
};
