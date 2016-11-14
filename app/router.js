import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('application-loading');
  this.route('error', function() {
    this.route('404');
    this.route('403');
  });
  this.route('child');
  this.route('signin');
  this.route('noaccess');
});

export default Router;
