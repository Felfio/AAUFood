import Ember from 'ember';

export default Ember.Route.extend({
  ajax: Ember.inject.service(),

  model() {
    return Ember.RSVP.hash({
      mensa: this.get('ajax').request('/food/mensa'),
      uniwirt: this.get('ajax').request('/food/uniwirt'),
      mittagstisch: this.get('ajax').request('/food/mittagstisch'),
    });
  },

  setupController(controller, model) {
    this._super(...arguments);
    Ember.set(controller, 'mensa', model.mensa);
    Ember.set(controller, 'uniwirt', model.uniwirt);
    Ember.set(controller, 'mittagstisch', model.mittagstisch);
  }
});

