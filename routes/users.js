const express = require('express');
const router = express.Router();
const passport = require ('passport');
const catchAsync = require('../utils/catchAsync');
const storeReturnTo = require('../middlewares/authMiddleware');
const user = require('../controllers/userController');


router.route('/register')
    .get(user.renderRegister)
    .post(catchAsync(user.registerUser));

router.route('/login')
    .get(user.renderLogin)
    .post(storeReturnTo, passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), user.loginUser);

router.get('/logout', user.logoutUser);

// Home page
router.get('/', (req, res) => {
    res.redirect('/tournaments');
});

module.exports = router;