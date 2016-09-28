'use strict';

const express = require('express'),
      fortune = require('./lib/fortune');

let app = express();

// Установка механизма представления handlebars
const handlebars = require('express-handlebars')
      .create({ defaultLayout:'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3003);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.render('home');
});
app.get('/about', (req, res) => {
  res.render('about', { fortune: fortune.getFortune() });
});

// пользовательская страница 404
app.use((req, res, next) => {
  res.status(404);
  res.render('404');
});

// пользовательская страница 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.type('text/plain');
  res.status(500);
  res.render('500');
});

app.listen(
  app.get('port'), () => console.log(`Express запущен на http://localhost:${app.get('port')}; нажмите Ctrl+C для завершения.`)
);
