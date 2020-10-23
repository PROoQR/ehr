'use strict';

/*
 * Module dependencies.
 */

const users = require('../app/controllers/users');
const surveys = require('../app/controllers/surveys');
const patients = require('../app/controllers/patients');
const filters = require('../app/controllers/filters');
const auth = require('./middlewares/authorization');

/**
 * Route middlewares
 */

const surveyAuth = [auth.requiresLogin, auth.survey.hasAuthorization];

const fail = {
  failureRedirect: '/login'
};

/**
 * Expose routes
 */

module.exports = function(app, passport) {
  const pauth = passport.authenticate.bind(passport);

  // user routes
  app.get('/login', users.login);
  app.get('/signup', users.signup);
  app.get('/logout', users.logout);
  app.post('/users', users.create);
  app.post(
    '/users/session',
    pauth('local', {
      failureRedirect: '/login',
      failureFlash: 'Invalid email or password.'
    }),
    users.session
  );
  app.get('/users/:userId', users.show);

  app.param('userId', users.load);

  // home route
  app.get('/', surveys.home);

  // survey routes
  app.param('surveyId', surveys.load);
  app.get('/surveys', surveys.index);
  // app.get('/surveys/upload', auth.requiresLogin, surveys.upload);
  app.get('/surveys/upload',  surveys.upload);
  app.post('/surveys/upload',  surveys.uploadPost);
  app.get('/surveys/:surveyId/pros',  surveys.pros);
  app.get('/surveys/:surveyId/pie',  patients.pie);
  app.get('/surveys/:surveyId/qrlink', surveys.qrlink);
  app.get('/surveys/:surveyId/json',  surveys.json);
  
  
  app.get('/search',  patients.search);
  app.param('patientId', patients.load);
  app.get('/patients/new', patients.new);
  app.post('/patients', patients.create);  
  app.get('/patients/:patientId/edit', patients.edit);
  app.get('/patients/:patientId/scan', patients.scan);
  app.post('/patients/:patientId/scan', patients.scanPost);
  app.post('/patients/:patientId/surveys/:surveyId', patients.accept);
  app.put('/patients/:patientId', patients.update);
  app.get('/patients/:patientId/outcomes', patients.outcomes);
  app.get('/outcomes/:outcomeId', patients.pro);
  app.get('/outcomes/:outcomeId/qcodes/:code', patients.questionChart);
  app.get('/outcomes/:outcomeId/tags/edit', patients.editTag);
  app.post('/outcomes/:outcomeId/tags', patients.saveTag);
  app.get('/outcomes', patients.allpros);
 

  // filter routes
  app.get('/filters', filters.index);
  app.get('/filtered', filters.filtered);
  app.param('filterId', filters.load);
  app.get('/f/surveys', filters.surveys);
  app.get('/f/surveys/:surveyId', filters.questions);
  app.get('/f/questions/:questionId', filters.answers);
  app.post('/f/questions/:questionId', filters.create);
  app.get('/filters/:filterId/delete', filters.delete);
  // app.get('/filters/new', filters.new);
  // app.post('/filters', filters.create);
  // app.delete('/filters/:filterId', filters.destroy);
  
  /**
   * Error handling
   */

  app.use(function(err, req, res, next) {
    console.log(err.message)
    // treat as 404
    if (      
      err.message &&
      (~err.message.indexOf('not found') ||
        ~err.message.indexOf('Cast to ObjectId failed'))
    ) {
      return next();
    }

    console.error(err.stack);

    if (err.stack.includes('ValidationError')) {
      res.status(422).render('422', { error: err.stack });
      return;
    }

    // error page
    res.status(500).render('500', { error: err.stack });
  });

  // assume 404 since no middleware responded
  app.use(function(req, res) {
    const payload = {
      url: req.originalUrl,
      error: 'Not found'
    };
    if (req.accepts('json')) return res.status(404).json(payload);
    res.status(404).render('404', payload);
  });
};
