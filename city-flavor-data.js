// A short, deliberately curated list of cities with a famous, LEGAL claim
// to a certain reputation -- regulated cannabis, a centuries-old red-light
// district -- that's already part of their public tourism identity, not
// something being outed here. Restrained on purpose: no innuendo, no
// slang, nothing that reads as endorsing anything illegal. A quiet pill
// next to the tier badge, a one-line joke on hover, nothing louder.
//
// Deliberately short. Candidates considered and left out: cities where the
// claim is legally unsettled (recent law changes, prescription-only
// access) or where "known for" would mean an illegal trade rather than a
// regulated one. When in doubt, left off the list.
(function () {
  'use strict';

  var CITY_FLAVOR = {
    amsterdam: {
      label: 'Broad-Minded',
      tooltip: "Coffeeshops, canals, and a red-light district older than most nations. Amsterdam doesn't blush.",
      icon: 'window',
    },
    denver: {
      label: 'Mile High, Literally',
      tooltip: "Legal since 2014. Denver's elevation isn't the only thing that's elevated.",
      icon: 'leaf',
    },
    'las-vegas': {
      label: 'What Happens Here…',
      tooltip: 'Vegas perfected the art of not asking questions. Neon, dice, and zero judgment.',
      icon: 'dice',
    },
  };

  window.CITY_FLAVOR = CITY_FLAVOR;
})();
