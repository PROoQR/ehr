'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;


/**
 * Filter Schema
 */

const FilterSchema = new Schema({
  survey:    { type: Schema.ObjectId, ref: 'Survey' },
  question:  { type: Schema.ObjectId, ref: 'Question' },
  answers:   [{ type: Schema.ObjectId, ref: 'Answer' }],
  at:        { type: Date, default: Date.now }
});

FilterSchema.index({ survey: 1, question: 1 }, { unique: true });


/**
 * Statics
 */

FilterSchema.statics = {
  /**
   * Find filter by id
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function(_id) {
    return this.findOne({ _id })
      .populate('question')
      .populate('survey')
      .exec();
  },

  /**
   * List filters
   *
   * @param {Object} options
   * @api private
   */

  list: function(options) {
    const criteria = options.criteria || {};
    const page = options.page || 0;
    const limit = options.limit || 30;
    return this.find(criteria)
      .populate('user', 'name username')
      .sort({ at: -1 })
      .limit(limit)
      .skip(limit * page)
      .exec();
  }
};

mongoose.model('Filter', FilterSchema);
