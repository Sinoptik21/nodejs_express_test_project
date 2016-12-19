'use strict';

const mongoose = require('mongoose');

const dealerSchema = mongoose.Schema({
  name: String,
  address1: String,
  address2: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  phone: String,
  website: String,
  active: Boolean,
  geocodedAddress: String,
  lat: Number,
  lng: Number,
});

dealerSchema.methods.getAddress = function(lineDelim) {
  if (!lineDelim) lineDelim = '<br>';
  let addr = this.address1;
  if (this.address2 && this.address2.match(/\S/)) addr += lineDelim + this.address2;
  addr += `${lineDelim + this.city}, ${this.state + this.zip}`;
  addr += lineDelim + (this.country || 'US');
  return addr;
};

const Dealer = mongoose.model('Dealer', dealerSchema);

module.exports = Dealer;
