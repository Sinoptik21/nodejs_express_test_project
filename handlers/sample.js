'use strict';

// проверка работы jquery
exports.jqueryTest = (req, res) => {
	res.render('jquery-test');
};

// пример использования Handlebars на стороне клиента
exports.nurseryRhyme = (req, res) => {
	res.render('nursery-rhyme');
};

exports.nurseryRhymeData = (req, res) => {
	res.json({
		animal: 'бельчонок',
		bodyPart: 'хвост',
		adjective: 'пушистый',
		noun: 'щетка',
	});
};

exports.fail = (req, res) => {
  throw new Error('Нееееет!');
};

exports.epicFail = (req, res) => {
  process.nextTick(() => {
    throw new Error('Бабах!');
  });
};
