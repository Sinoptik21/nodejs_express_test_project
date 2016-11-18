'use strict';

const path = require('path'),
	    fs = require('fs'),
	    formidable = require('formidable');

// Проверяем, существует ли каталог
const dataDir = path.normalize(path.join(__dirname, '..', 'data'));
const vacationPhotoDir = path.join(dataDir, 'vacation-photo');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(vacationPhotoDir)) fs.mkdirSync(vacationPhotoDir);

exports.vacationPhoto = (req, res) => {
	const now = new Date();
	res.render('contest/vacation-photo', { year: now.getFullYear(), month: now.getMonth() });
};

const saveContestEntry = (contestName, email, year, month, photoPath) => {
  // TODO... это будет добавлено позднее
};

exports.vacationPhotoProcessPost = (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      req.session.flash = {
        type: 'danger',
        intro: 'Упс!',
        message: 'Во время обработки отправленной Вами формы произошла ошибка. Пожалуйста, попробуйте еще раз.',
      };
      return res.redirect(303, '/contest/vacation-photo');
    }
    const photo = files.photo;
    const dir = `${vacationPhotoDir}/${Date.now()}`;
    var path = `${dir}/${photo.name}`;
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
};

exports.vacationPhotoEntries = (req, res) => {
	res.render('contest/vacation-photo/entries');
};
