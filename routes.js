'use strict';

const main = require('./handlers/main.js'),
    	contest = require('./handlers/contest.js'),
    	vacation = require('./handlers/vacation.js'),
    	cart = require('./handlers/cart.js'),
    	cartValidation = require('./lib/cartValidation.js'),
    	contact = require('./handlers/contact.js'),
    	samples = require('./handlers/sample.js'),
      customerController = require('./controllers/customer.js'),
      dealers = require('./handlers/dealers.js');

module.exports = (app) => {

	// смешанные роуты
	app.get('/', main.home);
	app.get('/about', main.about);
	app.get('/newsletter', main.newsletter);
	app.post('/newsletter', main.newsletterProcessPost);
	app.get('/newsletter/archive', main.newsletterArchive);
	app.get('/thank-you', main.genericThankYou);

	// роуты конкурсов
	app.get('/contest/vacation-photo', contest.vacationPhoto);
	app.post('/contest/vacation-photo/:year/:month', contest.vacationPhotoProcessPost);
	app.get('/contest/vacation-photo/entries', contest.vacationPhotoEntries);

	// роуты предложений
	app.get('/vacations', vacation.list);
	app.get('/vacation/:vacation', vacation.detail);
	app.get('/notify-me-when-in-season', vacation.notifyWhenInSeason);
	app.post('/notify-me-when-in-season', vacation.notifyWhenInSeasonProcessPost);

	// роуты корзины
	app.get('/cart', cart.middleware, cartValidation.checkWaivers, cartValidation.checkGuestCounts, cart.home);
	app.get('/cart/add', cart.addProcessGet);
	app.post('/cart/add', cart.addProcessPost);
	app.get('/cart/checkout', cart.checkout);
	app.post('/cart/checkout', cart.checkoutProcessPost);
	app.get('/cart/thank-you', cart.thankYou);
	app.get('/email/cart/thank-you', cart.emailThankYou);
	app.get('/set-currency/:currency', cart.setCurrency);

	// контакты
	app.get('/request-group-rate', contact.requestGroupRate);
	app.post('/request-group-rate', contact.requestGroupRateProcessPost);
	app.get('/contact', contact.home);
	app.post('/contact', contact.homeProcessPost);

	// роуты тестирования/примеров
	app.get('/jquery-test', samples.jqueryTest);
	app.get('/nursery-rhyme', samples.nurseryRhyme);
	app.get('/data/nursery-rhyme', samples.nurseryRhymeData);
  app.get('/fail', samples.fail);
	app.get('/epic-fail', samples.epicFail);

  // дилеры
	app.get('/dealers', dealers.home);

  // роуты покупателя
	customerController.registerRoutes(app);

};
