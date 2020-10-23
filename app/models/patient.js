'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;



/**
 * Patient Schema
 */

const PatientSchema = new Schema({
  _id:  { type : String, 
         lowercase: true, 
         trim : true },
  name: { type: String, default: '', 
          trim: true, 
          maxlength: 50 },
  last: { type: Schema.ObjectId, 
          ref: 'Survey' },
  at:   { type: Date }
},{ strict: false });


PatientSchema.statics = {

  load: function (_id) {
    return this.findOne({ _id })
      .exec();
  },

  list: function (options) {
    const criteria = options.criteria || {};
    const select = options.select || {};
    const sort = options.sort || { days: -1 };
    const page = options.page || 0;
    const limit = options.limit || 10;
    return this.find(criteria)
      .populate('last', 'name')
      .select(select)
      .limit(limit)
      .skip(limit * page)
      .lean()
      .exec();
  }
};

mongoose.model('Patient', PatientSchema);
