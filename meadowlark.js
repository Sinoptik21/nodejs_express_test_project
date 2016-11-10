'use strict';

const express = require('express'),
      fortune = require('./lib/fortune'),
      formidable = require('formidable'),
      credentials = require('./credentials'),
      emailService = require('./lib/email')(credentials);

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

switch (app.get('env')) {
  case 'development':
    // сжатое многоцветное журналирование для разработки
    app.use(require('morgan')('dev'));
    break;
  case 'production':
    // модуль 'express-logger' поддерживает ежедневное чередование файлов журналов
    app.use(require('express-logger')({ path: __dirname + '/log/requests.log' }));
    break;
}

app.use(express.static(`${__dirname}/public`));
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
  resave: false,
  saveUninitialized: false,
  secret: credentials.cookieSecret,
}));

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

// простейшая БД
const Product = () => {};
Product.find = (conditions, fields, options, cb) => {
  if (typeof conditions === 'function') {
    cb = conditions;
    conditions = {};
    fields = null;
    options = {};
  } else if (typeof fields === 'function') {
    cb = fields;
    fields = null;
    options = {};
  } else if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  const products = [
    {
      name: 'Тур по реке Худ',
      slug: 'hood-river',
      category: 'tour',
      maximumGuests: 15,
      sku: 723,
    },
    {
      name: 'Тур по берегу реки Орегон',
      slug: 'oregon-coast',
      category: 'tour',
      maximumGuests: 10,
      sku: 446,
    },
    {
      name: 'Скалолазание в Бенде',
      slug: 'rock-climbing/bend',
      category: 'adventure',
      requiresWaiver: true,
      maximumGuests: 4,
      sku: 944,
    }
  ];
  cb(null, products.filter((p) => {
    if (conditions.category && p.category !== conditions.category) return false;
    if (conditions.slug && p.slug !== conditions.slug) return false;
    if (isFinite(conditions.sku) && p.sku !== Number(conditions.sku)) return false;
    return true;
  }));
};
Product.findOne = (conditions, fields, options, cb) => {
  if (typeof conditions === 'function') {
    cb = conditions;
    conditions = {};
    fields = null;
    options = {};
  } else if (typeof fields === 'function') {
    cb = fields;
    fields = null;
    options = {};
  } else if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  Product.find(conditions, fields, options, (err, products) => {
    cb(err, products && products.length?products[0]:null);
  });
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

app.get('/tours/:tour', (req, res, next) => {
  Product.findOne({ category: 'tour', slug: req.params.tour }, (err, tour) => {
    if (err) return next(err);
    if (!tour) return next();
    res.render('tour', { tour: tour });
  });
});
app.get('/adventures/:subcat/:name', (req, res, next) => {
  Product.findOne({ category: 'adventure', slug: req.params.subcat + '/' + req.params.name  }, (err, adventure) => {
    if (err) return next(err);
    if (!adventure) return next();
    res.render('adventure', { adventure: adventure });
  });
});

const cartValidation = require('./lib/cartValidation.js');

app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

app.post('/cart/add', (req, res, next) => {
  const cart = req.session.cart || (req.session.cart = []);
  Product.findOne({ sku: req.body.sku }, (err, product) => {
    if (err) return next(err);
    if (!product) return next(new Error('Unknown product SKU: ' + req.body.sku));
    cart.push({
      product: product,
      guests: req.body.guests || 0,
    });
    res.redirect(303, '/cart');
  });
});
app.get('/cart', (req, res) => {
  const cart = req.session.cart || (req.session.cart = []);
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
