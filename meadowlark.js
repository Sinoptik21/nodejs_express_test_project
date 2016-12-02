'use strict';

const express = require('express'),
      fs = require('fs'),
      vhost = require('vhost'),
      mongoose = require('mongoose'),
      MongoSessionStore = require('session-mongoose')(require('connect')),
      Vacation = require('./models/vacation.js'),
      Attraction = require('./models/attraction.js'),
      credentials = require('./credentials'),
      emailService = require('./lib/email.js')(credentials), // ???
      Rest = require('connect-rest'),
      Static = require('./lib/static.js').map;

const app = express();

app.disable('x-powered-by'); // отключаем заголовок X-Powered-By

app.use('/api', require('cors')());

// Установка механизма представления handlebars
const handlebars = require('express-handlebars').create({
  defaultLayout:'main',
  extname: '.hbs',
  helpers: {
    section: function(name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    },
    static: (name) => Static(name)
  }
});
app.engine('hbs', handlebars.engine);
app.set('view engine', 'hbs');

// установка группирования css/js
const bundler = require('connect-bundle')(require('./config.js'));
app.use(bundler);

app.set('port', process.env.PORT || 3003);

//app.set('view cache'); // включение кэширования представлений
//app.enable('trust proxy'); // сообщаем express'у об использовании proxy и что ему можно доверять

app.use((req, res, next) => {
  // создаем домен для этого запроса
  const domain = require('domain').create();
  // обрабатываем ошибки на этом домене
  domain.on('error', (err) => {
    console.error('ПЕРЕХВАЧЕНА ОШИБКА ДОМЕНА\n', err.stack);
    try {
      // Отказобезопасный останов через 5 секунд
      setTimeout(() => {
        console.error(' Отказобезопасный останов.');
        process.exit(1);
      }, 5000);

      // Отключение от кластера
      const worker = require('cluster').worker;
      if (worker) worker.disconnect();

      // Прекращение принятия новых запросов
      server.close();

      try {
        // Попытка использовать маршрутизацию ошибок Express
        next(err);
      }
      catch(err) {
        // Если маршрутизация ошибок Express не сработала, пробуем выдать текстовый ответ Node
        console.error('Сбой механизма обработки ошибок Express .\n', err.stack);
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end('Ошибка сервера.');
      }
    }
    catch(err) {
      console.error('Не могу отправить ответ 500.\n', err.stack);
    }
  });
  // Добавляем объекты запроса и ответа в домен
  domain.add(req);
  domain.add(res);

  // Выполняем оставшуюся часть цепочки запроса в домене
  domain.run(next);
});

const sessionStore = new MongoSessionStore({ url: credentials.mongo[app.get('env')].connectionString });

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
  resave: false,
  saveUninitialized: false,
  secret: credentials.cookieSecret,
  store: sessionStore,
}));
app.use(express.static(`${__dirname}/public`));
app.use(require('body-parser').urlencoded({ extended: true }));

const opts = {
  server: {
    socketOptions: { keepAlive: 1 }
  }
};
switch (app.get('env')) {
  case 'development':
    // сжатое многоцветное журналирование для разработки
    app.use(require('morgan')('dev'));
    mongoose.connect(credentials.mongo.development.connectionString, opts);
    break;
  case 'production':
    // модуль 'express-logger' поддерживает ежедневное чередование файлов журналов
    app.use(require('express-logger')({ path: `${__dirname}/log/requests.log` }));
    mongoose.connect(credentials.mongo.production.connectionString, opts);
    break;
  default:
    throw new Error(`Неизвестная среда выполнения: ${app.get('env')}`);
}

Vacation.find((err, vacations) => {
  if (err) return console.error(err);
  if (vacations.length) return;

  new Vacation({
    name: 'Однодневный тур по реке Худ',
    slug: 'hood-river-day-trip',
    category: 'Однодневный тур',
    sku: 'HR199',
    description: 'Проведите день в плавании по реке Колумбия и насладитесь сваренным по традиционным рецептам пивом на реке Худ!',
    priceInCents: 9995,
    tags: ['однодневный тур', 'река худ', 'плавание', 'виндсерфинг', 'пивоварни'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0,
  }).save();
  new Vacation({
    name: 'Отдых в Орегон Коуст',
    slug: 'oregon-coast-getaway',
    category: 'Отдых на выходных',
    sku: 'OC39',
    description: 'Насладитесь океанским воздухом и причудливыми прибрежными городками!',
    priceInCents: 269995,
    tags: ['отдых на выходных', 'орегон коуст', 'прогулки по пляжу'],
    inSeason: false,
    maximumGuests: 8,
    available: true,
    packagesSold: 0,
  }).save();
  new Vacation({
    name: 'Скалолазание в Бенде',
    slug: 'rock-climbing-in-bend',
    category: 'Приключение',
    sku: 'B99',
    description: 'Пощекочите себе нервы горным восхождением на пустынной возвышенности.',
    priceInCents: 289995,
    tags: ['отдых на выходных', 'бенд', 'пустынная возвышенность', 'скалолазание'],
    inSeason: true,
    requiresWaiver: true,
    maximumGuests: 4,
    available: false,
    packagesSold: 0,
    notes: 'Гид по данному туру в настоящий момент восстанавливается после лыжной травмы.',
  }).save();
});

app.use((req, res, next) => {
  // Если имеется экстренное сообщение, переместим его в контекст, а затем удалим
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use((req, res, next) => {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
});

// app.use((req,res,next) => {
//   const cluster = require('cluster');
//   if (cluster.isWorker) console.log(`Исполнитель ${cluster.worker.id} получил запрос`);
//   next();
// });

const getWeatherData = () => {
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
};

app.use((req, res, next) => {
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.weatherContext = getWeatherData();
  next();
});

// middleware для обработки логотипа (пасхальное яйцо)
app.use((req, res, next) => {
	const now = new Date();
	res.locals.logoImage = now.getMonth() === 11 && now.getDate() === 19 ? Static('/img/logo_bud_clark.png') : Static('/img/logo.png');
	next();
});

// middleware для работы корзины в шапке
app.use((req, res, next) => {
	const cart = req.session.cart;
	res.locals.cartItems = cart && cart.items ? cart.items.length : 0;
	next();
});

const admin = express.Router();
app.use(require('vhost')('admin.*', admin));
// создаем маршруты для "admin"; это можно разместить в любом месте.
admin.get('/', (req, res) => {
  res.render('admin/home');
});
admin.get('/users', (req, res) => {
  res.render('admin/users');
});

// добавляем роуты
require('./routes.js')(app);

// конфигурация API
const apiOptions = {
  context: '',
  domain: require('domain').create(),
};
const rest = Rest.create(apiOptions);

// API
rest.get('/attractions', (req, content, cb) => {
  Attraction.find({ approved: true }, (err, attractions) => {
    if (err) return cb({ error: 'Internal error.' });
    cb(null, attractions.map((a) => {
      return {
        name: a.name,
        description: a.description,
        location: a.location,
      };
    }));
  });
});

rest.post('/attraction', (req, content, cb) => {
  const a = new Attraction({
    name: req.body.name,
    description: req.body.description,
    location: { lat: req.body.lat, lng: req.body.lng },
    history: {
      event: 'created',
      email: req.body.email,
      date: new Date(),
    },
    approved: false,
  });
  a.save((err, a) => {
    if (err) return cb({ error: 'Unable to add attraction.' });
    cb(null, { id: a._id });
  });
});

rest.get('/attraction/:id', (req, content, cb) => {
  Attraction.findById(req.params.id, (err, a) => {
    if (err) return cb({ error: 'Unable to retrieve attraction.' });
    cb(null, {
      name: a.name,
      description: a.description,
      location: a.location,
    });
  });
});

apiOptions.domain.on('error', (err) => {
  console.log('API domain error.\n', err.stack);
  setTimeout(() => {
    console.log('Server shutting down after API domain error.');
    process.exit(1);
  }, 5000);
  server.close();
  const worker = require('cluster').worker;
  if (worker) worker.disconnect();
});

app.use(vhost('api.*', rest.processRequest()));

// добавляем поддержку автопредставлений
let autoViews = {};

app.use((req,res,next) => {
  const path = req.path.toLowerCase();
  // проверяем кэш, если что-то есть, загружаем представление
  if (autoViews[path]) return res.render(autoViews[path]);
  // если ничего нет, проверяем все .hbs файлы и подгружаем соответствующий
  if (fs.existsSync(`${__dirname}/views${path}.hbs`)){
    autoViews[path] = path.replace(/^\//, '');
    return res.render(autoViews[path]);
  }
  // представление не найдено, переходим на обработчик 404 ошибки
  next();
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
  res.status(500).render('500');
});

let server;
const startServer = () => {
  server = app.listen(app.get('port'), () => console.log(`Express запущен в режиме ${app.get('env')} на http://localhost:${app.get('port')}; нажмите Ctrl+C для завершения.`));
};
if (require.main === module) startServer(); // Приложение запускается непосредственно; запускаем сервер приложения
else module.exports = startServer; // Приложение импортируется как модуль посредством "require": экспортируем функцию для создания сервера
