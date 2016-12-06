'use strict';

const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
	/* TODO */
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
