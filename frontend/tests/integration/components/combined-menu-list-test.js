import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('combined-menu-list', 'Integration | Component | combined menu list', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{combined-menu-list}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#combined-menu-list}}
      template block text
    {{/combined-menu-list}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
