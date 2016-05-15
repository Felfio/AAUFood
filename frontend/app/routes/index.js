import Ember from 'ember';

export default Ember.Route.extend({
  ajax: Ember.inject.service(),

  model() {
    return Ember.RSVP.hash({
      mensa: this.get('ajax').request('/mensa'),
      uniwirt: this.get('ajax').request('/uniwirt'),
      mittagstisch: this.get('ajax').request('/mittagstisch'),
    });
  },

  setupController(controller, model) {
    this._super(...arguments);
    Ember.set(controller, 'mensa', model.mensa);
    Ember.set(controller, 'uniwirt', model.uniwirt);
    Ember.set(controller, 'mittagstisch', model.mittagstisch);
  }
});

