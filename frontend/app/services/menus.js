import Ember from 'ember';

export default Ember.Service.extend({
  ajax: Ember.inject.service(),

  getUniwirt(){
    return this.get('ajax').request('/uniwirt');
  },

  getMittagstisch(){
    return this.get('ajax').request('/mittagstisch');
  },

  getMensa(){
    return this.get('ajax').request('/mensa');
  }
});
