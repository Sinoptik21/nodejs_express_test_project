'use strict';

const Customer = require('../models/customer.js'),
      customerViewModel = require('../viewModels/customer.js');

module.exports = {
  registerRoutes: function(app) {
    app.get('/customer/register', this.register);
		app.post('/customer/register', this.processRegister);

    app.get('/customer/:id', this.home);
    app.get('/customer/:id/preferences', this.preferences);
    app.get('/orders/:id', this.orders);

    app.post('/customer/:id/update', this.ajaxUpdate);
  },

  register: (req, res, next) => res.render('customer/register'),

  processRegister: (req, res, next) => {
		const c = new Customer({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			address1: req.body.address1,
			address2: req.body.address2,
			city: req.body.city,
			state: req.body.state,
			zip: req.body.zip,
			phone: req.body.phone,
		});
		c.save((err) => {
			if (err) return next(err);
			res.redirect(303, `/customer/${c._id}`);
		});
	},

  home: (req, res, next) => {
    Customer.findById(req.params.id, (err, customer) => {
      if (err) return next(err);
      if (!customer) return next(); // передать это обработчику 404
      customer.getOrders((err, orders) => {
        if (err) return next(err);
        res.render('customer/home', customerViewModel(customer, orders));
      });
    });
  },

  preferences: (req, res, next) => {
    Customer.findById(req.params.id, (err, customer) => {
      if (err) return next(err);
      if (!customer) return next(); // передать это обработчику 404
      customer.getOrders((err, orders) => {
        if (err) return next(err);
        res.render('customer/preferences', customerViewModel(customer, orders));
      });
    });
  },

  orders: (req, res, next) => {
    Customer.findById(req.params.id, (err, customer) => {
      if (err) return next(err);
      if (!customer) return next(); // передать это обработчику 404
      customer.getOrders((err, orders) => {
        if (err) return next(err);
        res.render('customer/preferences', customerViewModel(customer, orders));
      });
    });
  },

  ajaxUpdate: (req, res, next) => {
    Customer.findById(req.params.id, (err, customer) => {
      if (err) return next(err);
      if (!customer) return next(); // передать это обработчику 404
      if (req.body.firstName) {
        if (typeof req.body.firstName !== 'string' || req.body.firstName.trim() === '')
          return res.json({ error: 'Invalid name.'});
        customer.firstName = req.body.firstName;
      }
      // и т. д.
      customer.save((err) => {
        return err ? res.json({ error: 'Ошибка обновления покупателя.' }) : res.json({ success: true });
      });
    });
  },
};
