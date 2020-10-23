'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;


/**
 * Question Schema
 */

const QuestionSchema = new Schema({
  survey:  { type: Schema.ObjectId, ref: 'Survey' },
  code:    { type: String, maxlength: 3, uppercase: true },  
  name:    { type: String, default: '', trim: true },
  at:      { type: Date, default: Date.now }
});

QuestionSchema.index({ survey: 1, code: 1 }, { unique: true });


/**
 * Statics
 */

QuestionSchema.statics = {
  /**
   * Find article by id
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function(_id) {
    return this.findOne({ _id })
      .populate('user', 'name email username')
      .populate('survey')
      .exec();
  },

  /**
   * List articles
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

mongoose.model('Question', QuestionSchema);
