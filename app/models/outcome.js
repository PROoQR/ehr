'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;



/**
 * Outcome Schema
 */

const OutcomeSchema = new Schema({
  pat:    { type: String, 
            ref: 'Patient' },
  survey: { type: Schema.ObjectId, 
            ref: 'Survey' },
  scode:  { type: String, 
            default: '', trim: true },
  total:  { type: Number, default: 0 },
  tag:    { type: String, 
            default: '', trim: true },
  at:     { type: Date, 
            default: Date.now }
},{ strict: false });


OutcomeSchema.statics = {

  load: function (_id) {
    return this.findOne({ _id })
      .exec();
  },

  list: function (options) {
    const criteria = options.criteria || {};
    const select = options.select || {};    
    const page = options.page || 0;
    const limit = options.limit || 10;
    return this.find(criteria)
      .populate('survey', 'name lang')
      .populate('pat', 'name')
      .select(select)
      .sort({ at: -1 })
      .limit(limit)
      .skip(limit * page)
      .lean()
      .exec();
  }
};

mongoose.model('Outcome', OutcomeSchema);
