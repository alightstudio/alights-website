/**
 * UserProfile - minimal device detection utility
 * Original by Hakim El Hattab / cappel-nord.de
 */
var UserProfile = {
  isTouchDevice: function() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  suportsLocalStorage: function() {
    try {
      return 'localStorage' in window && window.localStorage !== null;
    } catch(e) {
      return false;
    }
  }
};
