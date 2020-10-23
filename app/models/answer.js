'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Answer Schema
 */

const AnswerSchema = new Schema({
  ask:    { type: Schema.ObjectId, ref: 'Question' },
  code:   { type: String, maxlength: 2, uppercase: true },
  name:   { type: String, default: '' },
  score:  { type: Number, default: 0 },
  goto:   { type: String, default: '' },
  at:     { type: Date,   default: Date.now }
});

AnswerSchema.index({ ask: 1, code: 1}, { unique: true });

/**
 * Statics
 */

AnswerSchema.statics = {
  /**
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function(_id) {
    return this.findOne({ _id })
      .populate('ask', 'code name')
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

mongoose.model('Answer', AnswerSchema);
