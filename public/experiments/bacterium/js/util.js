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

/**
 * Simple 2D Point class
 */
function Point( x, y ) {
  this.x = x || 0;
  this.y = y || 0;
}

Point.prototype.distanceTo = function( target ) {
  var dx = this.x - (target.x || 0);
  var dy = this.y - (target.y || 0);
  return Math.sqrt( dx * dx + dy * dy );
};

/**
 * Axis-aligned bounding rectangle
 */
function Region() {
  this.left = 0;
  this.right = 0;
  this.top = 0;
  this.bottom = 0;
}

Region.prototype.reset = function() {
  this.left =  Infinity;
  this.right = -Infinity;
  this.top  =  Infinity;
  this.bottom = -Infinity;
};

Region.prototype.inflate = function( x, y ) {
  if( x < this.left )   this.left = x;
  if( x > this.right )  this.right = x;
  if( y < this.top )    this.top = y;
  if( y > this.bottom ) this.bottom = y;
};
