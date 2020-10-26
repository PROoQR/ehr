'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Survey Schema
 */

const SurveySchema = new Schema({
  code:  { type: String },
  lang:  { type: String, default: '' },
  ver:   { type: Number, default: 0 },
  name:  { type: String, default: '' },
  type:  { type: String, default: 'FLAT' },
  body:  { type: String, default: '' },
  at:    { type: Date,   default: Date.now }
});

SurveySchema.index({ code: 1, lang: 1 }, { unique: true });

/**
 * Statics
 */

SurveySchema.statics = {
  /**
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function(_id) {
    return this.findOne({ _id })
      .exec();
  },

  /**
   *
   * @param {Object} options
   * @api private
   */

  list: function(options) {
    const criteria = options.criteria || {};
    const page = options.page || 0;
    const limit = options.limit || 30;
    return this.find(criteria)
      .sort({ at: -1 })
      .limit(limit)
      .skip(limit * page)
      .exec();
  }
};

mongoose.model('Survey', SurveySchema);
