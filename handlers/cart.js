'use strict';

const Vacation = require('../models/vacation.js'),
	    Q = require('q'),
	    emailService = require('../lib/email.js')(require('../credentials.js'));

const VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// десериализация товаров корзины из БД
exports.middleware = (req, res, next) => {
	const cart = req.session.cart;
	if (!cart || !cart.items) return next();
	req.cart = {
		items: cart.items.map((item) => {
			return {
				guests: item.guests,
				vacation: item.vacation,
				sku: item.sku,
			};
		})
	};
	const promises = req.cart.items.map((item) => {
		return Q.Promise((resolve, reject) => {
			Vacation.findOne({ sku: item.sku }, (err, vacation) => {
				if (err) return reject(err);
				item.vacation = vacation;
				resolve();
			});
		});
	});
	Q.all(promises)
		.then(() => {
			next();
		})
		.catch((err) => {
			next(err);
		});
};

const addToCart = (sku, guests, req, res, next) => {
	const cart = req.session.cart || (req.session.cart = { items: [] });
	Vacation.findOne({ sku: sku }, (err, vacation) => {
		if (err) return next(err);
		if (!vacation) return next(new Error(`Неизвестный артикул: ${sku}`));
		cart.items.push({
			sku: sku,
			vacation: vacation,
			guests: guests || 1,
		});
		res.redirect(303, '/cart');
	});
};

exports.addProcessGet = (req, res, next) => {
	addToCart(req.query.sku, req.query.guests, req, res, next);
};

exports.addProcessPost = (req, res, next) => {
	addToCart(req.body.sku, req.body.guests, req, res, next);
};

exports.home = (req, res, next) => {
	res.render('cart', { cart: req.cart });
};

exports.checkout = (req, res, next) => {
	const cart = req.session.cart;
	if (!cart) next();
	res.render('cart-checkout');
};

exports.thankYou = (req, res) => {
	res.render('cart-thank-you', { cart: req.session.cart });
};

exports.emailThankYou = (req, res) => {
	res.render('email/cart-thank-you', { cart: req.session.cart, layout: null });
};

exports.checkoutProcessPost = (req, res, next) => {
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
  res.render('email/cart-thank-you', { layout: null, cart: cart }, (err,html) => {
        if (err) console.error(`Ошибка в шаблоне письма: ${err.stack}`);
        emailService.send(cart.billing.email, 'Спасибо за заказ поездки в Meadowlark!', html);
    }
  );
  res.render('cart-thank-you', { cart: cart });
};

exports.setCurrency = (req,res) => {
  req.session.currency = req.params.currency;
  return res.redirect(303, '/vacations');
};
