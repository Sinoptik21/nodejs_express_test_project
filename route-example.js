'use strict';

const app = require('express')();

app.use((req, res, next) => {
  console.log(`

ВСЕГДА`);
  next();
});
app.get('/a', (req, res) => {
  console.log(`/a: маршрут завершен`);
  res.send('a');
});
app.get('/a', (req, res) => {
  console.log(`/a: никогда не вызывается`);
});
app.get('/b', (req, res, next) => {
  console.log(`/b: маршрут не завершен`);
  next();
});
app.use((req, res, next) => {
  console.log(`ИНОГДА`);
  next();
});
app.get('/b', (req, res, next) => {
  console.log(`/b (part 2): сгенерирована ошибка`);
  throw new Error('b не выполнено');
});
app.use('/b', (err, req, res, next) => {
  console.log(`/b ошибка обнаружена и передана далее`);
  next(err);
});
app.get('/c', (err, req) => {
  console.log(`/c: сгенерирована ошибка`);
  throw new Error('c не выполнено');
});
app.use('/c', (err, req, res, next) => {
  console.log(`/c: ошибка обнаружена, но не передана далее`);
  next();
});
app.use((err, req, res, next) => {
  console.log(`обнаружена необработанная ошибка: ${err.message}`);
  res.send('500 - Ошибка сервера');
});
app.use((req, res) => {
  console.log(`маршрут не обработан`);
  res.send('404 - Не найдено');
});
app.listen(3000, () => {
  console.log(`слушаю на порте 3000`);
});
