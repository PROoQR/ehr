'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const { wrap: async } = require('co');
const only = require('only');
const Survey = mongoose.model('Survey');
const Section = mongoose.model('Section');
const Question = mongoose.model('Question');
const Answer = mongoose.model('Answer');
const Outcome = mongoose.model('Outcome');
const assign = Object.assign;
const QRCode = require('qrcode');

/**
 * Load
 */

exports.load = async(function*(req, res, next, id) {
  try {
    req.survey = yield Survey.load(id);
    if (!req.survey) return next(new Error('survey not found'));
  } catch (err) {
    return next(err);
  }
  next();
});

exports.home = function(req, res) {
  res.render('surveys/home', {
    title: 'Home'
  });
};

/**
 * List
 */

exports.index = async(function*(req, res) {
  const surveys = yield Survey.find({});

  res.render('surveys/index', {
    title: 'Forms',
    surveys: surveys
  });
});

/**
 * New survey
 */

exports.upload = async(function*(req, res) {
  res.render('surveys/upload', {
    title: 'Import or Update Form',
    survey: new Survey()
  });
});

exports.uploadPost = async(function*(req, res) {
  const src = JSON.parse(req.body.body);
  let s = yield Survey.findOne({code: src.code, lang: src.lang});
  if (!s) {
    s = new Survey({code: src.code, lang: src.lang});
  }
  s.name = src.name;
  s.body = req.body.body;
  s.ver = src.ver;
  s.type = src.type;
  yield s.save();

  for (var i = 0; i < src.sections.length; i++) {
    const sec = src.sections[i];
    let section = yield Section.findOne({survey: s, code: sec.code});
    if (!section) {
      section = new Section({survey: s, code: sec.code, name: sec.name, intro: sec.intro, on: sec.ons});
    } else {
      section.name = sec.name;
      section.intro = sec.intro;
      section.ons = sec.ons;
    }
    yield section.save();
  }
  
  // update questions
  for (var i = 0; i < src.questions.length; i++) {
    const q = src.questions[i];
    const delta = {survey: s, code: q.code, name: q.name};
    let question = yield Question.findOne({survey: s, code: q.code});
    if (!question) {
      question = new Question(delta);
    } else {
      question.name = q.name;
    }
    yield question.save();
        
    for (var j = 0; j < q.answers.length; j++) {
      const a = q.answers[j];
      const delta2 = {ask: question, code: a.code, name: a.name, score: a.score, goto: a.goto};
      let answer = yield Answer.findOne({ask: question, code: a.code});
      if (!answer) {
        answer = new Answer(delta2);
      } else {
        answer.name = a.name;
        answer.score = a.score;
        answer.goto = a.goto;
      }
      yield answer.save();
    }
  }
  res.redirect(`/surveys`);
});


exports.qrlink = async(function*(req, res) {  
  const survey = req.survey;
  const link = 'https://prooqr.github.io/prom/'+survey.lang+'/'+survey.code+'.html';

  QRCode.toDataURL(link, function (err, url) {
    res.render('surveys/qrlink', {
      title: survey.name,
      survey: survey,
      url, link
    });
  })  
});


exports.json = async(function*(req, res) {
  const survey = req.survey;
  res.render('surveys/json', {
    title: survey.name + ' - JSON Output',
    data: survey.body
  });
});


exports.pros = async(function*(req, res) {
  const survey = req.survey;
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const _id = req.query.item;
  const limit = 15;
  const options = {
    limit: limit,
    page: page
  };

  options.criteria = { survey: survey };
  const outcomes = yield Outcome.list(options);
  const count = yield Outcome.countDocuments({ survey: survey });
  const sections = yield Section.find({survey}).sort({code:1}).lean();
  const questions = yield Question.find({survey}).sort({code:1}).lean();
  const answers = yield Answer.find({ ask: {$in: questions} }).populate('ask', 'name code').lean();
  
  res.render('surveys/pros', {
    title: survey.name + ' - Outcomes',
    outcomes: outcomes,
    page: page + 1,
    pages: Math.ceil(count / limit),
    survey, questions, answers, count, sections
  });
});
