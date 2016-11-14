'use strict';

const Browser = require('zombie'),
      assert = require('chai').assert;

let browser;

suite('Межстраничные тесты', () => {
  setup(() => {
    browser = new Browser();
  });
  test('запрос расценок для групп со страницы туров по реке Худ должен заполнять поле реферера', (done) => {
    let referrer = 'http://localhost:3003/vacation/hood-river-day-trip';
    browser.visit(referrer, () => {
      browser.clickLink('.requestGroupRate', () => {
        //assert(browser.field('referrer').value === referrer); // не работает в этой версии Zombie
        assert(browser.resources[0].request.headers._headers[0][1] === referrer);
        done();
      });
    });
  });
  test('запрос расценок для групп со страницы туров пансионата "Орегон Коуст" должен заполнять поле реферера', (done) => {
    let referrer = 'http://localhost:3003/vacation/oregon-coast-getaway';
    browser.visit(referrer, () => {
      browser.clickLink('.requestGroupRate', () => {
        //assert(browser.field('referrer').value === referrer); // не работает в этой версии Zombie
        assert(browser.resources[0].request.headers._headers[0][1] === referrer);
        done();
      });
    });
  });
  test('посещение страницы "Запрос цены для групп" напрямую должен приводить к пустому полю реферера', (done) => {
    browser.visit('http://localhost:3003/request-group-rate', () => {
      assert(browser.field('referrer').value === '');
      done();
    });
  });
});
