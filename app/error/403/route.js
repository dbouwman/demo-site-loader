import Ember from 'ember';
import ENV from '../../config/environment';
export default Ember.Route.extend({
  session: Ember.inject.service('session'),
  siteLookup: Ember.inject.service('site-lookup'),
  headData: Ember.inject.service(),

  actions: {
    signin: function(){
      // to get here, we have requested the site from the domainLookup service
      // and we got a response, which contains the clientKey, which has been
      // cached in the siteLookup service
      let clientKey = this.get('siteLookup.clientKey');
      // open a session... this will show the pop-up
      this.get('session').open('arcgis-oauth-bearer', {apiKey:clientKey})
        .then((/*authorization*/) => {
          // when the auth is complete
          Ember.debug('User successfully authenticated... redirecting to index... ');
          Ember.debug('Session isAuthenticated: ' + this.get('session.isAuthenticated'));
          // now that the user is authenticated, try get the site again...
          return this.get('siteLookup').getSite()
          .then((site)=> {
            //put the site into the siteLookup service
            this.set('siteLookup.site', site);
            //set the headData css property to inject that...
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
              // this is really weird - we should have caught this on the app route...
              Ember.debug('Got 404 trying to load site... redirecting to 404 route');
              this.transitionTo('error.404');
            }else if(err.code === 403){
              // in this case we know we're logged in, so if we got a 403 then
              // this user really does not have access
              Ember.debug('Got 403 trying to load site...');
              this.transitionTo('noaccess');
            }else{
              // general error
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


    /**
     * In order to show the iframe when this route loads
     * we add a didTransition hook, and then schedule the
     * session.open to be called after it's rendered
     */
    didTransition: function(){
      //only do this if we are using iframe style
      if(ENV.torii.providers['arcgis-oauth-bearer'].display && ENV.torii.providers['arcgis-oauth-bearer'].display === 'iframe'){
        //--- USE THIS BLOCK IN YOUR APP --
        Ember.run.schedule('afterRender', this, function(){
          this.get('session').open('arcgis-oauth-bearer')
            .then((authorization) => {
              Ember.debug('AUTH SUCCESS: ', authorization);
              //transition to secured route
              this.controller.transitionToRoute('application');
            })
            .catch((err)=>{
              Ember.debug('AUTH ERROR: ' + JSON.stringify(err));
            });
        });
        //-----------------------------------
      }

    }
  }
});
