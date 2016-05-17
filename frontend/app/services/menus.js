import Ember from 'ember';

export default Ember.Service.extend({
  ajax: Ember.inject.service(),

  uniwirt(){
    return this.get('ajax').request('/food/uniwirt');
  },

  mittagstisch(){
    return this.get('ajax').request('/food/mittagstisch');
  },

  mensa(){
    return this.get('ajax').request('/food/mensa');
  }
});
