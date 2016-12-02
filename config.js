module.exports = {
  bundles: {
    clientJavaScript: {
      main: {
        file: '/meadowlark-b0ff5fa622.min.js',
        location: 'head',
        contents: [
          '/js/contact.js',
          '/js/cart.js',
        ]
      }
    },
    clientCss: {
      main: {
        file: '/meadowlark-b7fc3e3b2b.min.css',
        contents: [
          '/css/main.css',
          '/css/cart.css',
        ]
      }
    }
  }
};
