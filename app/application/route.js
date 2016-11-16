import Ember from 'ember';
import ENV from '../config/environment';
export default Ember.Route.extend({
  siteLookup: Ember.inject.service('site-lookup'),
  session: Ember.inject.service('session'),
  headData: Ember.inject.service(),
  fastboot: Ember.inject.service(),
  isFastBoot: Ember.computed.reads('fastboot.isFastBoot'),

  beforeModel(transition){
    //TODO Set the transition on the site-lookup service so we can retry
    //this.set('siteLookup.previousTransition', transition);
    // see if we can re-hydrate a session...
    return this.get('session').fetch()
      .then(() => {
        Ember.debug('User has been automatically logged in... ');
      })
      .catch(() => {
        Ember.debug('No auth-info was found, user is anonymous... ');
      });
  },

  /**
   * Lookup the site using the domain name
   */
  model() {
    Ember.debug('ApplicationRoute::model fired...');
    return this.get('siteLookup').getSite()
      // .then((site)=> {
      //   return site;
      // })
      .catch((err)=>{
        //something has gone wrong... return a model w/ a status
        //so we can take action in the renderTemplate hook
        return {
          status: err.code || 500
        };

      });
  },

  /**
   * Overridden so we can implement an inline-gateway
   */
  renderTemplate (controller, model){
    Ember.debug('ApplicationRoute::renderTemplate fired...');
    //if no access, render the sign-in template
    Ember.debug('Application Route: RenderTemplate ' + model.status);
    if(model.status === 200){
      //only inject the headData if the source of the model was an xhr
      //this prevents "fouc"
      if(model.source === 'xhr'){
        this.set('headData.css', model.data.values.css);
      }
      this.render();
    }else{
      if(model.status === 500){
        this.render('gateway.error', {model:model});
      }
      if(this.get('isFastBoot')){
        //in this case, we want to let the client-app handle things...
        //so just render the loading view
        this.render('gateway.loading');
      }else{
        if(model.status === 403){
          if(this.get('session.isAuthenticated')){
            this.render('gateway.noaccess');
          }else{
            this.render('gateway.403', {model: model});
          }
        }
        if(model.status === 404 || model.status === 400){
          this.render('gateway.404');
        }
      }

    }
  },

  actions: {
    accessDenied: function() {
      this.transitionTo('signin');
    },
    /**
     * This is handles the gateway signin process..
     */
     gatewaySignin: function(){
       Ember.debug('ApplicationRoute::actions::GatewaySignin Fired...');
       let domainInfo = this.get('siteLookup.domainInfo');
       this.get('session').open('arcgis-oauth-bearer', {apiKey:domainInfo.clientKey})
         .then((/*authorization*/) => {
           this.get('siteLookup').getSite()
           .then((site)=> {
             // set the css property in the head...
             Ember.debug('GatewaySignin got site with status ' + site.status);
             if(site.status === 200){
               this.set('headData.css', site.data.values.css);
             }
             this.set('model', site);
             this.render();
           })
           .catch((err)=>{
             this.set('model', {status:err.code || 500});
             this.render('gateway.noaccess');
           });
        });
    },
    /**
     * This is the generic sign-in at the top of the page.
     */
    signin: function(){
      let clientKey = this.get('siteLookup.clientKey');
      this.get('session').open('arcgis-oauth-bearer', {apiKey:clientKey})
        .then((/*authorization*/) => {
          Ember.debug('User successfully authenticated... ');
        })
        .catch((err)=>{
          debugger;
        });

    },
    /**
     * This is the generic signout at the top of the page
     */
    signout: function() {
      //depending on the type of auth, we need to do different things
      if(ENV.torii.providers['arcgis-oauth-bearer'].display && ENV.torii.providers['arcgis-oauth-bearer'].display === 'iframe'){
        //redirect the window to the signout url
        window.location = this.get('session.signoutUrl');
      }else{
        this.get('session').close();
        //this.transitionTo('index');
      }
    }
  }




});
