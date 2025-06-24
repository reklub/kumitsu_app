const express = require('express');
const router = express.Router();
const passport = require ('passport');
const catchAsync = require('../utils/catchAsync');
const { storeReturnTo } = require('../middlewares/authMiddleware');
const user = require('../controllers/userController');

console.log('userController: ', user);
console.log('Available functions: ', Object.keys(user));

console.log('loginUser type: ', typeof user.loginUser);

router.route('/register')
    .get(user.renderRegister)
    .post(catchAsync (user.registerUser));

/* router.route('/login')
    .get(user.renderLogin)
    .post(storeReturnTo, passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), user.loginUser); */

router.get('/logout', user.logoutUser);
module.exports = router;