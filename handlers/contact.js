'use strict';

exports.requestGroupRate = (req, res) => {
	res.render('request-group-rate');
};

exports.requestGroupRateProcessPost = (req, res, next) => {
	next(new Error('Функционал находится в разработке!'));
};

exports.home = (req, res, next) => {
	next(new Error('Страница находится в разработке!'));
};

exports.homeProcessPost = (req, res, next) => {
	next(new Error('Функционал находится в разработке!'));
};
