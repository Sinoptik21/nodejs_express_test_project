'use strict';

const _ = require('lodash');

// удобная функция для присоединения полей
const smartJoin = (arr, separator) => {
  if (!separator) separator = ' ';
  return arr.filter((elt) => {
    return elt !== undefined && elt !== null && elt.toString().trim() !== '';
  }).join(separator);
};

// получаем модель представления покупателя
const getCustomerViewModel = (customer, orders) => {
  const vm = _.omit(customer, 'salesNotes');
  return _.assignIn(vm, {
    name: smartJoin([vm.firstName, vm.lastName]),
    fullAddress: smartJoin([
      customer.address1,
      customer.address2,
      `${customer.city}, ${customer.state} ${customer.zip}`,
    ], '<br>'),
    orders: _.map(orders, (order) => {
      return {
        orderNumber: order.orderNumber,
        date: order.date,
        status: order.status,
        url: `/orders/${order.orderNumber}`,
      };
    }),
  });
};

module.exports =  getCustomerViewModel;
