'use strict';

const credentials = require('../credentials.js');

exports.home = (req, res) => res.render('dealers', { googleApiKey: credentials.googleApiKey }); 
