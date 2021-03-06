/*
 uuidjs: https://github.com/LiosK/UUID.js
 Version: v4.0.3
 Apache License 2.0: Copyright (c) 2010-2017 LiosK
*/
(function(global) {

var UUID;
UUID=function(f){function a(){}a.generate=function(){var b=a._getRandomInt,c=a._hexAligner;return c(b(32),8)+"-"+c(b(16),4)+"-"+c(16384|b(12),4)+"-"+c(32768|b(14),4)+"-"+c(b(48),12)};a._getRandomInt=function(b){if(0>b||53<b)return NaN;var c=0|1073741824*Math.random();return 30<b?c+1073741824*(0|Math.random()*(1<<b-30)):c>>>30-b};a._hexAligner=function(b,c){for(var a=b.toString(16),d=c-a.length,e="0";0<d;d>>>=1,e+=e)d&1&&(a=e+a);return a};a.overwrittenUUID=f;"object"===typeof module&&"object"===typeof module.exports&&
(module.exports=a);return a}(UUID);

var token = localStorage.analyticstoken = localStorage.analyticstoken || UUID.generate();

var logVisit = function() {
  fetch('/api/log/visit/' + token + '?path=' + encodeURIComponent(location.pathname), {
    method: 'get',
    mode: 'no-cors',
  });
};
logVisit();

global.logVisit = logVisit;
})(this);
