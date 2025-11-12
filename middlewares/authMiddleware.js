const storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
}

const authMiddleware = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Musisz być zalogowany, aby uzyskać dostęp do tej strony');
    return res.redirect('/login');
  }
  next();
};

module.exports = authMiddleware;
