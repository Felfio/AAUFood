import Ember from 'ember';

export function spinnerCube(params/*, hash*/) {
  let spinnerHtml =
    `<div class="sk-folding-cube">
      <div class="sk-cube1 sk-cube"></div>
      <div class="sk-cube2 sk-cube"></div>
      <div class="sk-cube4 sk-cube"></div>
      <div class="sk-cube3 sk-cube"></div>
    </div>`;

  return Ember.String.htmlSafe(spinnerHtml);
}

export default Ember.Helper.helper(spinnerCube);
