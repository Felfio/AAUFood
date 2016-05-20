import Ember from 'ember';

export function formatEuro(params/*, hash*/) {
  let value = params[0];
  if (!value) return;
  value = +value;

  value = parseFloat(Math.round(value * 100) / 100).toFixed(2);

  return value + " €";
}

export default Ember.Helper.helper(formatEuro);
