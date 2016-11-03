'use strict';

const express = require('express'),
      fortune = require('./lib/fortune'),
      formidable = require('formidable'),
      credentials = require('./credentials');

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

app.use(express.static(`${__dirname}/public`));

app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
  resave: false,
  saveUninitialized: false,
  secret: credentials.cookieSecret,
}));

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

app.use((req, res, next) => {
  // Если имеется экстренное сообщение, переместим его в контекст, а затем удалим
  res.locals.flash = req.session.flash;
  delete req.session.flash;
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
app.get('/thank-you', (req, res) => {
  res.render('thank-you');
});
app.get('/newsletter', (req, res) => {
  // вместо CSRF пока что используем простой текст
  res.render('newsletter', { csrf: 'CSRF token goes here' });
});

function NewsletterSignup(){}
NewsletterSignup.prototype.save = (cb) => {
  cb();
};

const VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', (req, res) => {
  let name = req.body.name || '', email = req.body.email || '';
  // проверка ввода
  if (!email.match(VALID_EMAIL_REGEX)) {
    if (req.xhr) return res.json({ error: 'Invalid name email address.' });
    req.session.flash = {
      type: 'danger',
      intro: 'Ошибка!',
      message: 'Адрес электронной почты введен неверно.',
    };
    return res.redirect(303, '/newsletter/archive');
  }
  new NewsletterSignup({ name: name, email: email }).save((err) => {
    if (err) {
      if (req.xhr) return res.json({ error: 'Database error.' });
      req.session.flash = {
        type: 'danger',
        intro: 'Ошибка базы данных!',
        message: 'Ошибка базы данных; повторите запрос немного позже.',
      };
      return res.redirect(303, '/newsletter/archive');
    }
    if(req.xhr) return res.json({ success: true });
    req.session.flash = {
      type: 'success',
      intro: 'Спасибо!',
      message: 'Вы подписаны на нашу рассылку.',
    };
    return res.redirect(303, '/newsletter/archive');
  });
});
app.get('/newsletter/archive', (req, res) => {
  res.render('newsletter/archive');
});

app.get('/contest/vacation-photo', (req, res) => {
  var now = new Date();
  res.render('contest/vacation-photo', { year: now.getFullYear(), month: now.getMonth() });
});
app.post('/contest/vacation-photo/:year/:month', (req, res) => {
  var form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) return res.redirect(303, '/error');
    console.log('received fields:');
    console.log(fields);
    console.log('received files:');
    console.log(files);
    res.redirect(303, '/thank-you');
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
