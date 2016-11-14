import Ember from 'ember';
import ENV from '../config/environment';

export default Ember.Service.extend({
  itemsService: Ember.inject.service('items-service'),
  session: Ember.inject.service('session'),
  featureService: Ember.inject.service('feature-service'),
  fastboot: Ember.inject.service(),
  isFastBoot: Ember.computed.reads('fastboot.isFastBoot'),

  clientKey:null,
  site:null,

  getSite() {
    Ember.debug('Session isAuthenticated: ' + this.get('session.isAuthenticated'));
    let start = Date.now();
    let shoebox = this.get('fastboot.shoebox');
    let siteStore = shoebox.retrieve('site-store');

    // if this is in the client and we have a site in the store... return it...
    if(!this.get('isFastBoot') && siteStore && siteStore.site){
      return new Ember.RSVP.Promise((resolve)=>{
         let diff = Date.now() - start;
         siteStore.site.time = diff;
         // put the site in the local cache...
         this.set('site', siteStore.site);
         resolve(siteStore.site);
       });
    }

    if(this.get('site')){
      Ember.debug('site-lookup already has site - returning it');
      return new Ember.RSVP.Promise((resolve)=>{
        resolve(this.get('site'));
      });
    }else{
      let start = Date.now();
      // query feature service w/ page hostname to get the ID

      //-------------------------------------------
      let hostname ='';
      if(this.get('isFastBoot')){
        hostname = this.get('fastboot.request.host');
        // hostname will return the port as well
        if(hostname.indexOf(':') > -1){
          hostname = hostname.split(':')[0];
        }
      }else{
        hostname = window.location.hostname;
      }
      //-------------------------------------------
      Ember.debug('HOSTNAME: ' + hostname);
      let url = ENV.APP.domainServiceUrl;

      let options = {
        includeGeometry:false,
        outFields:'*'
      };
      options.where = encodeURI("domain='" + hostname + "'");
      Ember.debug('Session isAuthenticated: ' + this.get('session.isAuthenticated'));
      return this.get('featureService').query(url, options)
      .then((fsResponse)=>{
        Ember.debug('Got Response from feature service...');
        // query ago to get the site item
        if(fsResponse.features.length){
          let siteId = fsResponse.features[0].attributes.siteId;
          let clientKey = fsResponse.features[0].attributes.clientKey;
          this.set('clientKey', clientKey);
          Ember.debug('Making call to fetch the site item by id: ' + siteId);
          return Ember.RSVP.hash({
              item:this.get('itemsService').getById(siteId),
              data:this.get('itemsService').getDataById(siteId)
            })
            .then((result)=>{
              this.set('site', result);
              // if this is running on the server...
              if(this.get('isFastBoot')){
                siteStore= {
                  site: result
                };
                // store the site...
                shoebox.put('site-store', siteStore);
              }
              return result;
            });
        }else{
          //throw or reject...
          Ember.debug('No features were returned...');
        }
      })
      .then((result) => {
        let diff = Date.now() - start;
        result.time = diff;
        return result;
      })



    }
  }

});
