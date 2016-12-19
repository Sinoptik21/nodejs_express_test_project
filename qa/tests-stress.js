'use strict';

const loadtest = require('loadtest'),
      expect = require('chai').expect;

suite('Стрессовые тесты', () => {
  test('Домашняя страница должна обрабатывать 50 запросов в секунду', (done) => {
    const options = {
      url: 'https://localhost:3003',
      concurrency: 4,
      maxRequests: 50,
    };
    loadtest.loadTest(options, (err,result) => {
      expect(!err);
      expect(result.totalTimeSeconds < 1);
      done();
    });
  });
});
