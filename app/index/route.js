import Ember from 'ember';

export default Ember.Route.extend({

  siteLookup: Ember.inject.service('site-lookup'),
  model(){
    return this.get('siteLookup.site');
  }
});
