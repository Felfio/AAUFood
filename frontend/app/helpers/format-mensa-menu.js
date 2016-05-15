import Ember from 'ember';

export function formatMensaMenu(params/*, hash*/) {
  let value = +params[0];
  return value < 2 ? "Menü Classic " + (value + 1) : "Tagesteller";
}

export default Ember.Helper.helper(formatMensaMenu);
