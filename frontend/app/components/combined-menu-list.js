import Ember from 'ember';

const CombinedMenuList = Ember.Component.extend({
  menus: Ember.inject.service(),
  dataLoaded: false,
  menu: null,

  didInsertElement() {
    this._super(...arguments);

    let restaurant = this.get('restaurant');
    let menuPromise = this.get('menus')[restaurant]();

    if (menuPromise) {
      menuPromise.then(menuData => this.loadedMenu(menuData));
    }
  },

  loadedMenu(menuData){
    if (this.get('isDestroyed')) {
      return;
    }

    this.set('menu', menuData);
    this.set('dataLoaded', true);
  }
});

CombinedMenuList.reopenClass({
  positionalParams: ['restaurant']
});

export default CombinedMenuList;
