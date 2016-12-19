'use strict';

const assert = require('chai').assert;
const http = require('http');
const rest = require('restler');

suite('API tests', () => {
  const attraction = {
    lat: 45.516011,
    lng: -122.682062,
    name: 'Художественный музей Портленда',
    description: `Не упустите возможность посмотреть созданную в 1892 году коллекцию произведений местного искусства художественного музея Портленда. Если же вам больше по душе современное искусство, к вашим услугам шесть этажей, посвященных современному искусству.`,
    email: 'test@meadowlarktravel.com',
  };
  const base = 'https://api.meadowlark:3003';
  test('проверка возможности добавления достопримечательности',
  (done) => {
    rest.post(`${base}/attraction`, {data:attraction}).on('success',
    (data) => {
      assert.match(data.id, /\w/, 'должен быть задан id');
      done();
    });
  });
  test('проверка возможности извлечения достопримечательности',
  (done) => {
    rest.post(`${base}/attraction`, {data:attraction}).on('success',
    (data) => {
      rest.get(`${base}/attraction/${data.id}`).on('success',
      (data) => {
        assert(data.name === attraction.name);
        assert(data.description === attraction.description);
        done();
      });
    });
  });
});
