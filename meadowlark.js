'use strict';

const express = require('express'),
      formidable = require('formidable'),
      fs = require('fs'),
      mongoose = require('mongoose'),
      MongoSessionStore = require('session-mongoose')(require('connect')),
      fortune = require('./lib/fortune'),
      credentials = require('./credentials'),
      emailService = require('./lib/email')(credentials),
      Vacation = require('./models/vacation.js'),
      VacationInSeasonListener = require ('./models/vacationInSeasonListener.js'),
      cartValidation = require('./lib/cartValidation.js');

const app = express();

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
    app.use(require('express-logger')({ path: __dirname + '/log/requests.log' }));
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

app.get('/', (req, res) => {
  res.render('home');
});
app.get('/about', (req, res) => {
  res.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js'
  });
});
app.get('/request-group-rate', (req, res) => {
  res.render('request-group-rate');
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

// Проверяем, существует ли каталог
const dataDir = `${__dirname}/data`;
const vacationPhotoDir = `${dataDir}/vacation-photo`;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(vacationPhotoDir)) fs.mkdirSync(vacationPhotoDir);

const saveContestEntry = (contestName, email, year, month, photoPath) => {
  // TODO... это будет добавлено позднее
};

app.post('/contest/vacation-photo/:year/:month', (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      res.session.flash = {
        type: 'danger',
        intro: 'Упс!',
        message: 'Во время обработки отправленной Вами формы произошла ошибка. Пожалуйста, попробуйте еще раз.',
      };
      return res.redirect(303, '/contest/vacation-photo');
    }
    const photo = files.photo;
    const dir = `${vacationPhotoDir}/${Date.now()}`;
    const path = `${dir}/${photo.name}`;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, `${dir}/${photo.name}`);
    saveContestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path);
    req.session.flash = {
      type: 'success',
      intro: 'Удачи!',
      message: 'Вы стали участником конкурса.',
    };
    return res.redirect(303, '/contest/vacation-photo/entries');
  });
});

app.get('/contest/vacation-photo/entries', (req, res) => {
	res.render('contest/vacation-photo/entries');
});

app.get('/vacation/:vacation', (req, res, next) => {
	Vacation.findOne({ slug: req.params.vacation }, (err, vacation) => {
		if (err) return next(err);
		if (!vacation) return next();
		res.render('vacation', { vacation: vacation });
	});
});

const convertFromUSD = (value, currency) => {
  switch(currency) {
    case 'USD': return value * 1;
    case 'GBP': return value * 0.6;
    case 'BTC': return value * 0.0023707918444761;
    default: return NaN;
  }
};

app.get('/vacations', (req, res) => {
  Vacation.find({ available: true }, (err, vacations) => {
    const currency = req.session.currency || 'USD';
    const context = {
      currency: currency,
      vacations: vacations.map((vacation) => {
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          inSeason: vacation.inSeason,
          price: convertFromUSD(vacation.priceInCents/100, currency),
          qty: vacation.qty,
        };
      })
    };
    switch(currency){
    	case 'USD': context.currencyUSD = 'selected'; break;
      case 'GBP': context.currencyGBP = 'selected'; break;
      case 'BTC': context.currencyBTC = 'selected'; break;
    }
    res.render('vacations', context);
  });
});
app.post('/vacations', (req, res) => {
  Vacation.findOne({ sku: req.body.purchaseSku }, (err, vacation) => {
    if (err || !vacation) {
      req.session.flash = {
        type: 'warning',
        intro: 'Упс!',
        message: 'Что-то пошло не так; пожалуйста, <a href="/contact">свяэитесь с нами</a>.',
      };
      return res.redirect(303, '/vacations');
    }
    vacation.packagesSold++;
    vacation.save();
    req.session.flash = {
      type: 'success',
      intro: 'Спасибо!',
      message: 'Ваша заявка принята.',
    };
    res.redirect(303, '/vacations');
  });
});

app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

app.get('/cart/add', (req, res, next) => {
	const cart = req.session.cart || (req.session.cart = { items: [] });
	Vacation.findOne({ sku: req.query.sku }, (err, vacation) => {
		if (err) return next(err);
		if (!vacation) return next(new Error(`Неизвестный артикул: ${req.query.sku}`));
		cart.items.push({
			vacation: vacation,
			guests: req.body.guests || 1,
		});
		res.redirect(303, '/cart');
	});
});
app.post('/cart/add', (req, res, next) => {
  const cart = req.session.cart || (req.session.cart =  { items: [] });
  Vacation.findOne({ sku: req.body.sku }, (err, vacation) => {
    if (err) return next(err);
    if (!vacation) return next(new Error(`Неизвестный артикул: ${req.body.sku}`));
    cart.items.push({
      vacation: vacation,
      guests: req.body.guests || 1,
    });
    res.redirect(303, '/cart');
  });
});

app.get('/cart', (req, res, next) => {
  const cart = req.session.cart;
  if (!cart) next();
  res.render('cart', { cart: cart });
});
app.get('/cart/checkout', (req, res, next) => {
  const cart = req.session.cart;
  if (!cart) next();
  res.render('cart-checkout');
});
app.get('/cart/thank-you', (req, res) => {
  res.render('cart-thank-you', { cart: req.session.cart });
});
app.get('/email/cart/thank-you', (req, res) => {
  res.render('email/cart-thank-you', { cart: req.session.cart, layout: null });
});
app.post('/cart/checkout', (req, res, next) => {
  const cart = req.session.cart;
  if (!cart) next(new Error('Корзина не существует.'));
  const name = req.body.name || '', email = req.body.email || '';
  // Проверка вводимых данных
  if (!email.match(VALID_EMAIL_REGEX)) return res.next(new Error('Некорректный адрес электронной почты.'));
  // Присваиваем случайный идентификатор корзины; При обычных условиях мы бы использовали здесь идентификатор из БД
  cart.number = Math.random().toString().replace(/^0\.0*/, '');
  cart.billing = {
    name: name,
    email: email,
  };
  res.render('email/cart-thank-you', { layout: null, cart: cart }, (err, html) => {
    if (err) console.log('ошибка в шаблоне письма');
    emailService.send(cart.billing.email, 'Спасибо за заказ поездки в Meadowlark', html);
  });
  res.render('cart-thank-you', { cart: cart });
});

app.get('/notify-me-when-in-season', (req, res) => {
  res.render('notify-me-when-in-season', { sku: req.query.sku });
});
app.post('/notify-me-when-in-season', (req, res) => {
  VacationInSeasonListener.update(
    { email: req.body.email },
    { $push: { skus: req.body.sku } },
    { upsert: true },
    (err) => {
      if (err) {
        console.error(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Упс!',
          message: 'При обработке вашего запроса ' +
          'произошла ошибка.',
        };
        return res.redirect(303, '/vacations');
      }
      req.session.flash = {
        type: 'success',
        intro: 'Спасибо!',
        message: 'Вы будете оповещены, когда наступит ' +
        'сезон для этого тура.',
      };
      return res.redirect(303, '/vacations');
    }
  );
});

app.get('/set-currency/:currency', (req,res) => {
  req.session.currency = req.params.currency;
  return res.redirect(303, '/vacations');
});

app.get('/fail', (req, res) => {
  throw new Error('Нееееет!');
});
app.get('/epic-fail', (req, res) => process.nextTick(() => {
  throw new Error('Бабах!');
}));

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
