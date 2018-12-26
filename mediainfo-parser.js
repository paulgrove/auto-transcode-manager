'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exec = exports.parse = undefined;
exports.default = parse;

var _lodash = require('lodash');

var _xml2js = require('xml2js');

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var execa = require("execa");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isNumeric = function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

var mapValue = function mapValue(value) {
  var ret = Array.isArray(value) ? value[0] : value;
  return isNumeric(ret) ? ret * 1 : ret;
};

var transformResponse = function transformResponse(res) {
  /* eslint-disable no-param-reassign */
  if (res && res.file) {
    var tracks = Array.isArray(res.file.track) ? res.file.track : [res.file.track];
    res.file.track = tracks.map(function (track) {
      return (0, _lodash.mapValues)(track, mapValue);
    });
  }
    //console.log(">", res);
  return res;
};

function parse(buffer) {
  var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};
  return new Promise((resolve, reject) => {
      (0, _xml2js.parseString)(buffer, {
        attrNameProcessors: [function (name) {
          return '_' + name;
        }],
        explicitArray: false,
        explicitRoot: false,
        mergeAttrs: true,
        normalizeTags: true,
        tagNameProcessors: [_lodash.camelCase]
      }, function (err, obj) {
        if (err) {
          reject(err);
          return;
        }
        resolve(transformResponse(obj));
      });
  });
}

async function exec(mediaPath) {
  const {stdout} = await execa('mediainfo', ['--Full', '--Output=XML', mediaPath]);
  //console.log(stdout);
  return await parse(new Buffer.from(stdout, "utf8"));
}

exports.parse = parse;
exports.exec = exec;
//# sourceMappingURL=index.js.map
