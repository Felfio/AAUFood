import Ember from 'ember';

const MenuList = Ember.Component.extend({
  menus: Ember.inject.service(),
  dataLoaded: false,
  menu: null,
  restaurantName: '',

  didInsertElement() {
    this._super(...arguments);
    let menuPromise = null;

    switch (this.get('restaurant')) {
      case 'mittagstisch':
        menuPromise = this.get('menus').getMittagstisch();
        break;
      case 'uniwirt':
        menuPromise = this.get('menus').getUniwirt();
        break;
    }

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

MenuList.reopenClass({
  positionalParams: ['restaurant', 'restaurantName']
});

export default MenuList;
