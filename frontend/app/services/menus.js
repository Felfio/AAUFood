import Ember from 'ember';

export default Ember.Service.extend({
  ajax: Ember.inject.service(),

  getUniwirt(){
    return this.get('ajax').request('/food/uniwirt');
  },

  getMittagstisch(){
    return this.get('ajax').request('/food/mittagstisch');
  },

  getMensa(){
    return this.get('ajax').request('/food/mensa');
  }
});
