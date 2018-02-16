const { send } = require('micro');
const microAuthTwitter = require('.');

const options = {
  consumerKey: 'CONSUMER_KEY',
  consumerSecret: 'CONSUMER_SECRET',
  callbackUrl: 'http://localhost:3000/auth/twitter/callback',
  path: '/auth/twitter'
};

const twitterAuth = microAuthTwitter(options);

module.exports = twitterAuth(async (req, res, auth) => {

  if (!auth) {
    return send(res, 404, 'Not Found');
  }

  if (auth.err) {
    // Error handler
    console.error(auth.err);
    return send(res, 403, 'Forbidden');
  }

  return `Hello ${auth.result.info.screen_name}`;

});
