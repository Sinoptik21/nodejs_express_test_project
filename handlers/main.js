'use strict';

const fortune = require('../lib/fortune.js');

exports.home = (req, res) => {
	res.render('home');
};

exports.about = (req, res) => {
	res.render('about', {
		fortune: fortune.getFortune(),
		pageTestScript: '/qa/tests-about.js'
	} );
};

exports.newsletter = (req, res) => {
	// вместо CSRF пока что используем простой текст
	res.render('newsletter', { csrf: 'CSRF token goes here' });
};

// for now, we're mocking NewsletterSignup:
function NewsletterSignup(){}
NewsletterSignup.prototype.save = (cb) => {
	cb();
};

const VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

exports.newsletterProcessPost = (req, res) => {
	const name = req.body.name || '', email = req.body.email || '';
	// проверка ввода
	if (!email.match(VALID_EMAIL_REGEX)) {
		if (req.xhr) return res.json({ error: 'Invalid name email address.' });
		req.session.flash = {
			type: 'danger',
			intro: 'Ошибка валидации!',
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
		if (req.xhr) return res.json({ success: true });
		req.session.flash = {
			type: 'success',
			intro: 'Спасибо!',
			message: 'Вы подписаны на нашу рассылку.',
		};
		return res.redirect(303, '/newsletter/archive');
	});
};

exports.newsletterArchive = (req, res) => {
	res.render('newsletter/archive');
};

exports.genericThankYou = (req, res) => {
	res.render('thank-you');
};
