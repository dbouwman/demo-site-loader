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

    // see if we can re-hydrate a session...
    return this.get('session').fetch()
      .then(() => {
        Ember.debug('User has been automatically logged in... ');
      })
      .catch(() => {
        Ember.debug('No auth-info was found, user is anonymous... ');
      });
  },
  
  renderTemplate (controller, model){
    //if no access, render the sign-in template

  },

  /**
   * Lookup the site using the domain name
   */
  model() {
    // not sure if this should be here or beforeModel...
    return this.get('siteLookup').getSite()
      .then((site)=> {
        // put the site into a cache...
        this.set('siteLookup.site', site);
        // set the css property in the head...
        this.set('headData.css', site.data.values.css);
        // return the site mainly so the promise resolves
        // we could likely return {} here...
        return site;
      })
      .catch((err)=>{
        if(err.code === 404){

          // we got a 404 on the site request. This means there IS no site item
          // we should send some telemetry about this sort of problem as it
          // means that the domainLookup service is out of sync with items in AGO
          Ember.debug('Got 404 trying to load site... redirecting to 404 route');
          this.transitionTo('error.404');

        }else if(err.code === 403){
          if(!this.get('isFastBoot')){
            // ok, AGO says the item it not accessible...
            if(this.get('session.isAuthenticated')){
              // if the session is already authenticated, then this user has no access...
              this.transitionTo('noaccess');
            }else{
              // if the session is not auth'd, redirect to a route that will allow the user
              // to sign in...
              Ember.debug('Got 403 trying to load site... redirecting to a signin route');
              this.transitionTo('error.403');
            }
          }else{
            return {}; //allow the model hook to resolve so that page renders @ the server
          }
        } else {
          // this is a general error route
          Ember.debug('Got error trying to load site: ' + JSON.stringify(err));
          this.transitionTo('error');
        }
      });
  },

  actions: {
    accessDenied: function() {
      this.transitionTo('signin');
    },
    signin: function(){
      this.get('session').open('arcgis-oauth-bearer')
        .then((/*authorization*/) => {
          Ember.debug('User successfully authenticated... redirecting to index... ');
          Ember.debug('Session isAuthenticated: ' + this.get('session.isAuthenticated'));
          // now get the site
          return this.get('siteLookup').getSite()
          .then((site)=> {
            //hold the current site in a service of some sort...
            this.set('siteLookup.site', site);
            this.set('headData.css', site.data.values.css);
            let previousTransition = this.get('siteLookup.previousTransition');
            if(previousTransition){
              previousTransition.retry();
            }else{
              // go to the index
              this.transitionTo('index');
            }
          })
          .catch((err)=>{
            if(err.code === 404){
              Ember.debug('Got 404 trying to load site... redirecting to 404 route');
              this.transitionTo('error.404');
            }else if(err.code === 403){
              Ember.debug('Got 403 trying to load site... redirecting to a signin route');
              this.transitionTo('error.403');
            }else{
              Ember.debug('Got error trying to load site: ' + JSON.stringify(err));
              this.transitionTo('error');
            }

          });
        })
        .catch((err)=>{
          Ember.debug('403 route - User authentication failed. ' + JSON.stringify(err));
          this.transitionTo('noaccess');
        });
    },
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
