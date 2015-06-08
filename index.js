// ers react starter

// global

global.React = require('react');
global.Router = require('react-router');
global.Reflux = require('reflux');

global.request = require('superagent');
global.Promise = require('bluebird');
global._ = require('underscore');


// extend reflux
Reflux.ActionMethods.once = function(fn) {
  var unsubscribe;
  return unsubscribe = this.listen(function(payload) {
    unsubscribe();
    return fn(payload);
  });
};


// promisify

Promise.promisifyAll(request);

// config

var config = require('config');

// action

//// me

var meAction = Reflux.createActions({

  fetch: {
    children: ['completed', 'failed']
  }

});

function getMeUrl () {
  return config.eadmin.baseUrl + '/account/me';

}

meAction.fetch.listen(function() {
  var url = getMeUrl();
  request
  .get(url)
  .query({access_token: authStore.data})
  .endAsync()
  .get('body')
  .then(this.completed)
  .catch(this.failed)
  ;

});

meAction.fetch.completed.once(function() {

  e18nAction.init()
});

//// auth

var authAction = Reflux.createActions({

  logout: {}

});

//// e18n

var e18nAction = Reflux.createActions({

  init: {
    children: ['completed', 'failed']
  }

});

e18nAction.init.listen(function() {
  // throw error if not fount i18n
  if (!i18n && i18n.init) throw new Error('i18n not found!')

  i18n.init({
    lng: config.lang || meStore.data.lang,
    dynamicLoad: true,
    resGetPath: config.i18n.baseUrl + '/locales/resources.json?lng=__lng__&ns=__ns__',
    sendMissing: true,
    sendMissingTo: 'current',
    resPostPath: config.i18n.baseUrl + '/locales/change/__lng__/__ns__'
  }, this.completed);

});

// store

//// me

var meStore = Reflux.createStore({

  listenables: [meAction],

  onFetchCompleted: function(me) {
    this.data = me;
    this.trigger(me);
  }

});

//// auth

var authStore = Reflux.createStore({

  listenables: [authAction],

  init: function() {
    this.data = localStorage.access_token;
  },

  onLogout: function() {
    delete localStorage.access_token;
    this.data = null;
  }
});


// routes

var routes = require('routes');

// auto start

var path, ref;

path = (ref = location.hash) != null ? ref.replace('#', '') : void 0;

if (authStore.data) {
  meAction.fetch();
  meAction.fetch.failed.once(function() {
    return window.location.replace("/login.html?path=" + path);
  });
} else {
  window.location.replace("/login.html?path=" + path);
}

e18nAction.init.completed.once(function() {
  Router.run(routes, function(Handler, state) {
    Promise
    .all((function() {
      return _.chain(state.routes)
      .filter(function(route) {
        return route.name;
      })
      .map(function(route) {
        console.log(route)
        return new Promise(function(resolve) {
          return i18n.loadNamespace(route.name, resolve);
        });
      })
      .value();

    })())
    .then(function() {
      return React.render(React.createElement(Handler), document.getElementById("app"));
    });
  });
});



