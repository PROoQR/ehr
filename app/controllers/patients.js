'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const { wrap: async } = require('co');
const only = require('only');
const moment = require('moment');
const _ = require('lodash');
const randomColor = require('randomcolor');
const Patient = mongoose.model('Patient');
const Section = mongoose.model('Section');
const Question = mongoose.model('Question');
const Answer = mongoose.model('Answer');
const Survey = mongoose.model('Survey');
const Outcome = mongoose.model('Outcome');
const assign = Object.assign;

const COLORS = [
  '#4dc9f6',
  '#f67019',
  '#f53794',
  '#537bc4',
  '#acc236',
  '#166a8f',
  '#00a950',
  '#58595b',
  '#8549ba'
];

function getColor(idx) {
  const len = COLORS.length;
  if (idx < len) {
    return COLORS[idx];
  }
  return randomColor();
}

/**
 * Load
 */

exports.load = async(function*(req, res, next, id) {
  try {
    req.patient = yield Patient.load(id);
    if (!req.patient) return next(new Error('patient not found'));
  } catch (err) {
    return next(err);
  }
  next();
});


exports.search = async(function*(req, res) {
  const q = req.query.q;
  const re = new RegExp(q, 'i');
  const orArr = [];
  orArr.push({ _id: { $regex: re } });
  orArr.push({ name: { $regex: re } });
  const criteria = {'$or': orArr};
  const patients = yield Patient.find(criteria).select('name tags at')
                                .populate('last', 'name').limit(15).lean();
        
  res.render('patients/matched', {
    title: 'Search Result',
    patients
  });
});

exports.scan = async(function*(req, res) {
  const patient = req.patient;  
  res.render('patients/scan', {
    title: 'Scan Survey',
    patient
  });
});

exports.scanPost = async(function*(req, res) {
  const patient = req.patient;
  const segs = req.body.body.split('/');
  if (segs.length < 2) {
    req.flash('warning', 'Invalid content');
    return res.redirect('/patients/'+patient._id+'/scan');
  }
  const s = segs[0].split(':');
  if (s.length != 3) {
    req.flash('warning', 'Invalid content');
    return res.redirect('/patients/'+patient._id+'/scan');
  }
      
  const survey = yield Survey.findOne({code: s[0], lang: s[1]});
  if (!survey) {
    const download_url = `https://prooqr.github.io/prom/${s[1]}/${s[0]}.html?json=show`;
    
    return res.render('surveys/download', {
      title: 'Survey Form Not Found',
      download_url
    });
  }

  const outdated = survey.ver < parseInt(s[2]) ? true : false;

  const askScores = [];
  let totalScore = 0;
  for (var i = 1; i < segs.length; i++) {
    const seg = segs[i];

    const ask = yield Question.findOne({survey:survey, code:seg.substr(0,3)});
    const replies = yield Answer.find({ask: ask, code: {$in: toArray(seg.substr(3))}});
    let askScore = 0;
    for (var j = 0; j < replies.length; j++) {
      const r = replies[j];
      askScore += r.score;
    }
    totalScore += askScore;
    askScores.push({
      code: ask.code,
      score: askScore
    });
  }
  
  let secArr = [];
  const sections = yield Section.find({survey}).sort({code:1}).lean();
  secArr.push({ code: 'total', name: 'Total' });
  for (var i = 0; i < sections.length; i++) {
    const sec = sections[i];
    secArr.push({ code: sec.code, name: sec.name });
  }

  const sectionScores = [];
  for (var i = 0; i < sections.length; i++) {
    const s = sections[i];
    let t = 0;
    for (var j = 0; j < askScores.length; j++) {
      const as = askScores[j];
      if (s.code == as.code.substr(0,2)) {
        t += as.score;
      }
    }
    sectionScores.push({
      section: s,
      score: t
    })
  }
  const questions = yield Question.find({survey}).sort({code:1}).lean();
  const questionList = [];
  for (var i = 0; i < questions.length; i++) {
    const ask = questions[i];
    const answers = yield Answer.find({ask}).sort({code:1}).lean();
    const answerList = [];
    for (var j = 0; j < answers.length; j++) {
      const ans = answers[j];
      answerList.push({ code: ans.code, name: ans.name });
    }

    questionList.push({ code: ask.code, name: ask.name, type: ask.type, answers: answerList });    
  }
  const data = {code: survey.code, name: survey.name, lang: survey.lang, questions: questionList};
  const tags = yield Outcome.distinct('tag');
  
  const labels = [];
  const rows = yield Outcome.find({survey: survey, pat: patient}).sort({at:1}).lean();
  const outArr = [];
  for (var i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.tag) {
      labels.push(r.tag);
    } else {
      labels.push(moment(r.at).format('YY-MM-DD'));
    }
    outArr.push(r);
  }
  const todayOut = {};

  labels.push('Today');
  for (var i = 0; i < sectionScores.length; i++) {
    const ss = sectionScores[i];
    todayOut[ss.section.code] = ss.score;
  }
  todayOut['total'] = totalScore;
  outArr.push(todayOut);

  const outsets = [];
  for (var i = 0; i < secArr.length; i++) {
    const sets = [];
    const y = {};
    const sec = secArr[i];
    y.title = sec.name;
    y.labels = labels;
    const data = [];
    for (var j = 0; j < outArr.length; j++) {
      const r = outArr[j];
      data.push(r[sec.code]);
    }
    const color = getColor(i);
    sets.push({
      label: '',
      backgroundColor: color,
      borderColor: color,
      data: data,
      fill: false
    });
    y.datasets = sets;
    outsets.push(y);
  }

  res.render('patients/confirm', {
    title: survey.name,
    survey, data, patient, sections, questions, segs, outdated, sectionScores, 
    totalScore, tags, outsets, rows
  });

});

/**
 * New patient
 */

exports.new = function(req, res) {
  res.render('patients/new', {
    title: 'New Patient',
    patient: new Patient()
  });
};

/**
 * Create an patient
 */

exports.create = async(function*(req, res) {
  const patient = new Patient(only(req.body, 'name _id'));
  
  try {
    yield patient.save();
    req.flash('success', 'Successfully created patient!');
    res.redirect(`/patients/`+patient._id+'/outcomes');
  } catch (err) {
    res.status(422).render('patients/new', {
      title: 'New Patient',
      errors: [err.toString()],
      patient
    });
  }
});

/**
 * Edit an patient
 */

exports.edit = function(req, res) {
  res.render('patients/edit', {
    title: 'Edit Patient',
    patient: req.patient
  });
};

/**
 * Update patient
 */

exports.update = async(function*(req, res) {
  const patient = req.patient;
  assign(patient, only(req.body, 'name'));
  try {
    yield patient.save();
    res.redirect(`/patients/`+patient._id+'/outcomes');
  } catch (err) {
    res.status(422).render('patients/edit', {
      title: 'Edit Patient',
      errors: [err.toString()],
      patient
    });
  }
});

function toArray(d) {
  let arr = [];
  if (!Array.isArray(d)) {
    arr.push(d);
    return arr;
  }
  return d;
}

exports.accept = async(function*(req, res) {
  const survey = req.survey;
  const patient = req.patient;
  const body = req.body;
  const delta = {};
  const patSet = {};
  const codes = Object.keys(body);
  const start = moment().startOf('day');

  let oc = yield Outcome.findOne({ pat: patient, survey: survey, at: { '$gte': start } }).sort({at:-1});
  
  if (!oc) {
    oc = new Outcome({ pat: patient, survey: survey });
    yield oc.save();
  }
  
  const askScores = [];
  let totalScore = 0;
  for (var i = 0; i < codes.length; i++) {
    const k = codes[i];
    if (k.length <= 3) {
      delta[k] = body[k];
      patSet[survey.code+'_'+k] = {$each: toArray(body[k])} ;
      
      const arr = toArray(body[k]);
      const q = yield Question.findOne({ survey: survey, code: k});
      const replies = yield Answer.find({ ask: q, code: {$in: arr}}).lean();
      let askScore = 0;
      for (var j = 0; j < replies.length; j++) {
        const c = replies[j];
        askScore += c.score;
      }
      totalScore += askScore;
      askScores.push({
        code: k,
        score: askScore
      });
    }
  }

  const sections = yield Section.find({survey}).sort({code:1}).lean();
  const sectionScores = [];
  for (var i = 0; i < sections.length; i++) {
    const s = sections[i];
    let t = 0;
    for (var j = 0; j < askScores.length; j++) {
      const as = askScores[j];
      if (s.code == as.code.substr(0,2)) {
        t += as.score;
      }
    }
    sectionScores.push({
      code: s.code,
      score: t
    })
  }
  delta.total = totalScore;
  delta.tag = req.body.tag;
  delta.scode = survey.code;
  for (var i = 0; i < sectionScores.length; i++) {
    const ss = sectionScores[i];
    delta[ss.code] = ss.score;
  }
  yield Outcome.findOneAndUpdate({_id: oc._id}, delta, {upsert:false});  
  yield Patient.findOneAndUpdate({_id: patient._id}, {$addToSet: patSet, last: survey, at: Date.now()}, {upsert:false});
  
  res.redirect(`/outcomes`);
});

exports.outcomes = async(function*(req, res) {
  const patient = req.patient;
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const _id = req.query.item;
  const limit = 15;
  const options = {
    limit: limit,
    page: page
  };

  options.criteria = { pat: patient };

  const outcomes = yield Outcome.list(options);
  const count = yield Outcome.countDocuments({ pat: patient });

  res.render('patients/outcomes', {
    title: patient.name + ' - Outcomes',
    outcomes: outcomes,
    page: page + 1,
    pages: Math.ceil(count / limit),
    patient
  });
});

exports.allpros = async(function*(req, res) {
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const _id = req.query.item;
  const limit = 15;
  const options = {
    limit: limit,
    page: page
  };

  if (_id) options.criteria = { _id };

  const outcomes = yield Outcome.list(options);
  const count = yield Outcome.countDocuments();

  res.render('patients/allpros', {
    title: 'Outcomes',
    outcomes: outcomes,
    page: page + 1,
    pages: Math.ceil(count / limit)
  });
});


exports.pro = async(function*(req, res) {
  const outcome = yield Outcome.findById(req.params.outcomeId).populate('pat').populate('survey').lean();
  if (!outcome) {
    return res.redirect('/outcomes');
  }
  
  const patient = outcome.pat;
  const survey = outcome.survey; 
  const sections = yield Section.find({survey}).sort({code:1}).lean();
  const questions = yield Question.find({survey}).sort({code:1}).lean();

  const questionList = [];
  for (var i = 0; i < questions.length; i++) {
    const ask = questions[i];
    const answers = yield Answer.find({ask});
    const answerList = [];
    for (var j = 0; j < answers.length; j++) {
      const ans = answers[j];
      answerList.push({ code: ans.code, name: ans.name });
    }
    questionList.push({ code: ask.code, name: ask.name, type: ask.type, answers: answerList });
  }
  const data = {code: survey.code, name: survey.name, lang: survey.lang, questions: questionList};
  
  
  let secArr = [];
  secArr.push({ code: 'total', name: 'Total' });
  for (var i = 0; i < sections.length; i++) {
    const sec = sections[i];
    secArr.push({ code: sec.code, name: sec.name });
  }

  const labels = [];
  const rows = yield Outcome.find({survey: survey, pat: patient}).sort({at:1}).lean();
  const outArr = [];
  for (var i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.tag) {
      labels.push(r.tag);
    } else {
      labels.push(moment(r.at).format('YY-MM-DD'));
    }
    outArr.push(r);
  }

  const outsets = [];
  for (var i = 0; i < secArr.length; i++) {
    const sets = [];
    const y = {};
    const sec = secArr[i];
    y.title = sec.name;
    y.labels = labels;
    const data = [];
    for (var j = 0; j < outArr.length; j++) {
      const r = outArr[j];
      data.push(r[sec.code]);
    }
    const color = getColor(i);
    sets.push({
      label: '',
      backgroundColor: color,
      borderColor: color,
      data: data,
      fill: false
    });
    y.datasets = sets;
    outsets.push(y);
  }
  
  res.render('patients/pro', {
    title: survey.name,
    survey, data, patient, questions, outcome, sections, outsets, rows
  });

});


exports.editTag = async(function*(req, res) {
  const tags = yield Outcome.distinct('tag');
  const outcome = yield Outcome.findById(req.params.outcomeId).populate('pat').populate('survey').lean();
  if (!outcome) {
    return res.redirect('/outcomes');
  }
    
  res.render('patients/tag', {
    title: 'Edit Tag',
    outcome, tags
  });
});

exports.saveTag = async(function*(req, res) {
  const tags = yield Outcome.distinct('tag');
  const outcome = yield Outcome.findById(req.params.outcomeId).populate('pat').populate('survey');
  if (!outcome) {
    return res.redirect('/outcomes');
  }
  outcome.tag = req.body.tag;
  yield outcome.save();
  res.redirect('/outcomes');
});

exports.pie = async(function*(req, res) {
  const survey = req.survey;
  const langs = yield Survey.find({code:survey.code});

  const rows = [];
  const labels = [];
  const display_labels = [];
  const all = yield Outcome.aggregate([ 
    {$match: { scode: survey.code }},
    {$group: {_id:"$tag", total: {$sum: 1} }},
    {$sort: { "total": -1 } }
  ]).exec();
  rows.push({ lang: 'All languages', ds: all });
  for (var i = 0; i < all.length; i++) {
    const r = all[i];
    if (r._id) {
      display_labels.push(r._id);
    } else {
      display_labels.push('Untagged');
    }
    labels.push(r._id);
  }

  for (var i = 0; i < langs.length; i++) {
    const r = langs[i];
    const outs = yield Outcome.aggregate([ 
      {$match: { survey: r._id }},
      {$group: {_id:"$tag", total: {$sum: 1} }},
      {$sort: { "total": -1 } }
    ]).exec();
    rows.push({ lang: r.lang, ds: outs });
  }
  
  const outsets = [];
  for (var i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sets = [];
    const y = {};
    y.title = r.lang;
    y.labels = display_labels;
    const data = [];
    const colors = [];
    for (var j = 0; j < labels.length; j++) {
      const t = labels[j];
      const f = _.find(r.ds, function(o) { return o._id == t; });
      if (f) {
        data.push(f.total);
      } else {
        data.push(0);
      }  
      const color = getColor(j);
      colors.push(color);
    }
    sets.push({
      label: r.lang,
      backgroundColor: colors,
      data: data,
      fill: false
    });
    y.datasets = sets;
    outsets.push(y);
  }
  res.render('patients/pie', {
    title: survey.name,
    survey, outsets
  });
});


exports.questionChart = async(function*(req, res) {
  const outcome = yield Outcome.findById(req.params.outcomeId).populate('pat').populate('survey').lean();
  if (!outcome) {
    return res.redirect('/outcomes');
  }
  const patient = outcome.pat;
  const survey = outcome.survey; 
  const questions = yield Question.find({survey}).sort({code:1}).lean();
  
  const outcomes = yield Outcome.find({survey: survey, pat: patient}).sort({at:1}).lean();
  const question = yield Question.findOne({ survey: survey, code: req.params.code});
  const answers = yield Answer.find({ ask: question }).lean();

  const labels = [];
  for (var i = 0; i < outcomes.length; i++) {
    const r = outcomes[i];
    if (r.tag) {
      labels.push(r.tag);
    } else {
      labels.push(moment(r.at).format('YY-MM-DD'));
    }
  }
  
  const outsets = [];
  const y = {};
  const sets = [];
  const colors = [];
  y.title = 'Score Trend';
  y.labels = labels;
  const data = [];
  for (var i = 0; i < outcomes.length; i++) {
    const o = outcomes[i];
    const f = _.find(answers, function(s) { return s.code == o[question.code]; });
    if (f) {
      data.push(f.score);
      for (var j = 0; j < answers.length; j++) {
        const answ = answers[j];
        if (f.score == answ.score) {
          colors.push(getColor(j));          
          continue;
        }
      }
    } else {
      data.push(0);
      colors.push(getColor(0));
    }    
  }
  sets.push({
    label: '',
    backgroundColor: colors,
    borderColor: colors,
    data: data,
    fill: false
  });
  y.datasets = sets;
  outsets.push(y);
  res.render('patients/questionChart', {
    title: 'Question History',
    survey, patient, question, outcomes, answers, outsets
  });
});