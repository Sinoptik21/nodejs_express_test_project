'use strict';

const express = require('express'),
      fortune = require('./lib/fortune');

let app = express();

app.disable('x-powered-by'); // отключаем заголовок X-Powered-By

// Установка механизма представления handlebars
const handlebars = require('express-handlebars').create({
  defaultLayout:'main',
  extname: '.hbs',
  helpers: {
    section: function(name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }
});
app.engine('hbs', handlebars.engine);
app.set('view engine', 'hbs');

//app.set('view cache'); // включение кэширования представлений

app.set('port', process.env.PORT || 3003);

app.use(express.static(__dirname + '/public'));

app.use((req, res, next) => {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
});

let getWeatherData = () => {
  return {
    locations: [
      {
        name: 'Портленд',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Сплошная облачность ',
        temp: '54.1 F (12.3 C)',
      },
      {
        name: 'Бенд',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Малооблачно',
        temp: '55.0 F (12.8 C)',
      },
      {
        name: 'Манзанита',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Небольшой дождь',
        temp: '55.0 F (12.8 C)',
      },
    ],
  };
}
app.use((req, res, next) => {
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.weatherContext = getWeatherData();
  next();
});

app.get('/', (req, res) => {
  res.render('home');
});
app.get('/about', (req, res) => {
  res.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js'
  });
});
app.get('/tours/hood-river', (req, res) => {
  res.render('tours/hood-river');
});
app.get('/tours/oregon-coast', (req, res) => {
  res.render('tours/oregon-coast');
});
app.get('/tours/request-group-rate', (req, res) => {
  res.render('tours/request-group-rate');
});
// проверка работы секций
app.get('/jquery-test', (req, res) => {
  res.render('jquery-test');
});
// пример использования Handlebars на стороне клиента
app.get('/nursery-rhyme', (req, res) => {
  res.render('nursery-rhyme');
});
app.get('/data/nursery-rhyme', (req, res) => {
  res.json({
    animal: 'бельчонок',
    bodyPart: 'хвост',
    adjective: 'пушистый',
    noun: 'щетка',
  });
});

// пользовательская страница 404
// next должен присутствовать обязательно, чтобы Express распознал обработчик ошибок
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
