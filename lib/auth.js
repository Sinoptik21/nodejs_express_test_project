'use strict';

const User = require('../models/user.js'),
      passport = require('passport'),
      VKStrategy = require('passport-vkontakte').Strategy,
      GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    if (err || !user) return done(err, null);
    done(null, user);
  });
});

module.exports = (app, options) => {
  // если перенаправления для успеха и неуспеха не определены,
  // установите разумные значения по умолчанию
  if (!options.successRedirect) options.successRedirect = '/account';
  if (!options.failureRedirect) options.failureRedirect = '/login';

  return {
    init: () => {
      const env = app.get('env');
      const config = options.providers;
      // конфигурирование стратегии VK
      passport.use(new VKStrategy({
        clientID: config.vk[env].appId,
        clientSecret: config.vk[env].appSecret,
        callbackURL: (options.baseUrl || '') + '/auth/vk/callback',
      }, (accessToken, refreshToken, profile, done) => {
        const authId = 'vk:' + profile.id;
        User.findOne({ authId: authId }, (err, user) => {
          if (err) return done(err, null);
          if (user) return done(null, user);
          user = new User({
            authId: authId,
            name: profile.displayName,
            created: Date.now(),
            role: 'customer',
          });
          user.save((err) => {
            if (err) return done(err, null);
            done(null, user);
          });
        });
      }));

      passport.use(new GoogleStrategy({
				clientID: config.google[env].clientID,
				clientSecret: config.google[env].clientSecret,
				callbackURL: (options.baseUrl || '') + '/auth/google/callback',
			}, (token, tokenSecret, profile, done) => {
				const authId = 'google:' + profile.id;
				User.findOne({ authId: authId }, (err, user) => {
					if (err) return done(err, null);
					if (user) return done(null, user);
					user = new User({
						authId: authId,
						name: profile.displayName,
						created: Date.now(),
						role: 'customer',
					});
					user.save((err) => {
						if (err) return done(err, null);
						done(null, user);
					});
				});
			}));

      app.use(passport.initialize());
      app.use(passport.session());
    },
    registerRoutes: () => {
      // регистрируем маршруты VK
      app.get('/auth/vk', (req, res, next) => {
        if (req.query.redirect) req.session.authRedirect = req.query.redirect;
        passport.authenticate('vkontakte')(req, res, next);
      });
      app.get('/auth/vk/callback', passport.authenticate('vkontakte', {
        failureRedirect: options.failureRedirect
      }),
      (req, res) => {
        // мы сюда попадаем только при успешной аутентификации
        const redirect = req.session.authRedirect;
        if (redirect) delete req.session.authRedirect;
        res.redirect(303, redirect || options.successRedirect);
      });

      // регистрируем маршруты Google
			app.get('/auth/google', (req, res, next) => {
				if (req.query.redirect) req.session.authRedirect = req.query.redirect;
				passport.authenticate('google', { scope: 'profile' })(req, res, next);
			});
			app.get('/auth/google/callback', passport.authenticate('google', {
        failureRedirect: options.failureRedirect
      }),
			(req, res) => {
				//  мы сюда попадаем только при успешной аутентификации
				const redirect = req.session.authRedirect;
				if (redirect) delete req.session.authRedirect;
				res.redirect(303, req.query.redirect || options.successRedirect);
			});
    },
  };
};
