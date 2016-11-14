import Ember from 'ember';

export default Ember.Controller.extend({
  itemJson: Ember.computed('model', function(){
    return JSON.stringify(this.get('model.item'), null, 4);
  }),
  dataJson: Ember.computed('model', function(){
    return JSON.stringify(this.get('model.data'), null, 4);
  })
});
