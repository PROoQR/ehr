'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const { wrap: async } = require('co');
const only = require('only');
const Filter = mongoose.model('Filter');
const Survey = mongoose.model('Survey');
const Question = mongoose.model('Question');
const Answer = mongoose.model('Answer');
const Patient = mongoose.model('Patient');
const assign = Object.assign;
const QRCode = require('qrcode');

/**
 * Load
 */

exports.load = async(function*(req, res, next, id) {
  try {
    req.filter = yield Filter.load(id);
    if (!req.filter) return next(new Error('filter not found'));
  } catch (err) {
    return next(err);
  }
  next();
});

exports.index = async(function*(req, res) {
  const filters = yield Filter.find({}).populate('survey', 'name').populate('question', 'name').populate('answers');
  
  res.render('filters/index', {
    title: 'Analyze',
    filters: filters
  });
});

exports.filtered = async(function*(req, res) {
  const filters = yield Filter.find({}).populate('survey', 'code').populate('question', 'code').populate('answers');
  const cri = {};
  for (var i = 0; i < filters.length; i++) {
    const f = filters[i];
    let arr = [];
    for (var j = 0; j < f.answers.length; j++) {
      const a = f.answers[j];
      arr.push(a.code);
    }
    cri[f.survey.code+'_'+f.question.code] = {$all: arr};
  }

  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const _id = req.query.item;
  const limit = 15;
  const options = {
    limit: limit,
    page: page
  };

  options.criteria = cri;

  const patients = yield Patient.list(options);
  const count = yield Patient.countDocuments(cri);

  res.render('filters/filtered', {
    title: 'Matched Patients',
    patients: patients,
    page: page + 1,
    pages: Math.ceil(count / limit)
  });
});

exports.surveys = async(function*(req, res) {
  const surveys = yield Survey.find({});

  res.render('filters/surveys', {
    title: 'Select a Survey Form',
    surveys: surveys
  });
});

exports.questions = async(function*(req, res) {
  const survey = req.survey;
  const questions = yield Question.find({survey});

  res.render('filters/questions', {
    title: 'Select a Question',
    survey, questions
  });
});

exports.answers = async(function*(req, res) {
  const question = yield Question.findById(req.params.questionId).populate('survey');
  const answers = yield Answer.find({ask: question});

  res.render('filters/answers', {
    title: 'Select Answers',
    question, answers
  });
});

exports.create = async(function*(req, res) {
  const question = yield Question.findById(req.params.questionId).populate('survey');
  
  const filter = new Filter({});
  filter.survey = question.survey;
  filter.question = question;
  let answerIds = [];
  if (Array.isArray(req.body.ids)) {
    filter.answers = req.body.ids;
  } else {
    answerIds.push(req.body.ids);
    filter.answers = answerIds;
  }
  
  try {
    yield filter.save();
    req.flash('success', 'Successfully created patient!');
  } catch (err) {
    req.flash('error', 'Filter is duplicated');
  }
  res.redirect(`/filters`);
});

exports.delete = async(function*(req, res) {
  yield req.filter.remove();
  req.flash('info', 'Deleted successfully');
  res.redirect('/filters');
});