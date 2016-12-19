'use strict';

const mongoose = require('mongoose'),
      Order = require('./order.js');

const customerSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  address1: String,
  address2: String,
  city: String,
  state: String,
  zip: String,
  phone: String,
  salesNotes: [{
    date: Date,
    salespersonId: Number,
    notes: String,
  }],
});

customerSchema.methods.getOrders = function(cb) {
  return Order.find({ customerId: this._id }, cb);
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
