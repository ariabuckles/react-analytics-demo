import http from "k6/http";

const host = 'http://ec2-54-183-244-24.us-west-1.compute.amazonaws.com';

var UUID;
UUID=function(f){function a(){}a.generate=function(){var b=a._getRandomInt,c=a._hexAligner;return c(b(32),8)+"-"+c(b(16),4)+"-"+c(16384|b(12),4)+"-"+c(32768|b(14),4)+"-"+c(b(48),12)};a._getRandomInt=function(b){if(0>b||53<b)return NaN;var c=0|1073741824*Math.random();return 30<b?c+1073741824*(0|Math.random()*(1<<b-30)):c>>>30-b};a._hexAligner=function(b,c){for(var a=b.toString(16),d=c-a.length,e="0";0<d;d>>>=1,e+=e)d&1&&(a=e+a);return a};a.overwrittenUUID=f;"object"===typeof module&&"object"===typeof module.exports&&
(module.exports=a);return a}(UUID);

//const uuids = [1, 2, 3, 4].map(x => UUID.generate());
const uuid = UUID.generate();
const paths = ['/', '/index.html', '/load-testing'].map(p => encodeURIComponent(p));

const oneOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function() {
  http.get(host + '/api/log/visit/' + uuid + '?path=' + oneOf(paths) + '&direct=true');
};

