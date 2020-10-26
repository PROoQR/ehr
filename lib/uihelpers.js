const moment = require('moment');
const qs = require('querystring');
const url = require('url');
const _ = require('lodash');
moment.locale('zh-cn');

/**
 * Helpers method
 *
 * @param {String} name
 * @return {Function}
 * @api public
 */

function uihelpers (name) {
  return function (req, res, next) {
    res.locals.checked = function (segs, quest_code, answ_code) {
      for (var i = 0; i < segs.length; i++) {
        const p = segs[i].substr(0,3);
        if (p == quest_code) {
          const answs = segs[i].substr(3).split(',');
          if (answs.indexOf(answ_code) > -1) {
            return true;
          }          
        }
      }
      return false;
    }

    res.locals.opt = function (t, options) {
      const found = _.find(options, function(o) { return o.code == t; });
      return found ? found.name : '';
    }

    res.locals.answer = function (answers, code) {
      const found = _.find(answers, function(o) { return o.code == code; });
      return found ? found.name : '';
    }
    next()
  }
}

module.exports = uihelpers
