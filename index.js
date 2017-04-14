const querystring = require('querystring');
const url = require('url');
const oauth = require('oauth');
const redirect = require('micro-redirect');

const provider = 'twitter';

const getRedirectUrl = (token) => {
  return `https://twitter.com/oauth/authorize?oauth_token=${token}`;
};

const microAuthTwitter = ({ consumerKey, consumerSecret, callbackUrl, path = '/auth/twitter' }) => {

  const getConsumer = (consumerKey, consumerSecret) => {
    return new oauth.OAuth(
      'https://twitter.com/oauth/request_token.json', 'https://twitter.com/oauth/access_token.json',
      consumerKey, consumerSecret, '1.0A', callbackUrl, 'HMAC-SHA1');
  };

  const getRequestToken = () => {
    return new Promise((resolve, reject) => {
      getConsumer(consumerKey, consumerSecret).getOAuthRequestToken((err, requestToken, requestTokenSecret) => {
        if (err) {
          return reject(err);
        }

        return resolve({ requestToken, requestTokenSecret });
      });
    });
  };

  const getAccessToken = (token, secret, verifier) => {
    return new Promise((resolve, reject) => {
      getConsumer(consumerKey, consumerSecret)
        .getOAuthAccessToken(token, secret, verifier, (err, accessToken, accessTokenSecret) => {
          if (err) {
            return reject(err);
          }

          return resolve({ accessToken, accessTokenSecret });
        });
    });
  };

  const verifyCredentials = (accessToken, accessTokenSecret) => {
    return new Promise((resolve, reject) => {
      getConsumer(consumerKey, consumerSecret)
        .get('https://api.twitter.com/1.1/account/verify_credentials.json', accessToken, accessTokenSecret, (err, result) => {
          if (err) {
            return reject(err);
          }

          return resolve(result);
        });
    });
  };

  const states = new Map();

  return fn => async (req, res, ...args) => {

    const parsedUrl = url.parse(req.url);

    if (parsedUrl.pathname === path) {
      try {
        const results = await getRequestToken();
        states.set(results.requestToken, results);
        const redirectLocation = getRedirectUrl(results.requestToken);
        return redirect(res, 302, redirectLocation);
      } catch (err) {
        args.push({ err, provider });
        return fn(req, res, ...args);
      }
    }

    const callbackPath = url.parse(callbackUrl).pathname;
    if (parsedUrl.pathname === callbackPath) {
      try {
        const query = querystring.parse(parsedUrl.query);
        const state = states.get(query.oauth_token);
        states.delete(query.oauth_token);

        const results = await getAccessToken(state.requestToken, state.requestTokenSecret, query.oauth_verifier);
        const data = await verifyCredentials(results.accessToken, results.accessTokenSecret);
        const result = {
          provider,
          info: JSON.parse(data),
          accessToken: results.accessToken,
          accessTokenSecret: results.accessTokenSecret
        };

        args.push({ result });
        return fn(req, res, ...args);
      } catch (err) {
        args.push({ err, provider });
        return fn(req, res, ...args);
      }
    };

    return fn(req, res, ...args);
  };
};

module.exports = microAuthTwitter;
