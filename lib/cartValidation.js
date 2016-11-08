'use strict';

module.exports = {
  checkWaivers: (req, res, next) => {
    const cart = req.session.cart;
    if (!cart) return next();
    if (cart.some((i) => i.product.requiresWaiver)) {
      if (!cart.warnings) cart.warnings = [];
      cart.warnings.push(`Один или более выбранных вами туров требуют отказа от ответственности.`);
    }
    next();
  },
  checkGuestCounts: (req, res, next) => {
    const cart = req.session.cart;
    if (!cart) return next();
    if (cart.some((item) => item.guests > item.product.maximumGuests)) {
      if (!cart.errors) cart.errors = [];
      cart.errors.push(`В одном или более из выбранных вами туров недостаточно мест для выбранного вами количества гостей`);
    }
    next();
  }
};
