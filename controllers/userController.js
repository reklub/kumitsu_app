const User = require('../models/User');

module.exports.renderRegister = (req, res) => {
    res.render('auth/register');
}

module.exports.registerUser = async (req, res, next) => {
    try {
        const {email, username, password} = req.body;
        const user = new User ({email, username});
        const registeredUser = await User.register(user, password);
        req.login(registeredUser,err => {
            if(err) return next(err);
        })
        req.flash('success','Welcome to Kumitsu Tournament Management');
        res.redirect('/tournaments');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
};

exports.renderLogin = (req,res) => {
    res.render('auth/login')
};

exports.loginUser = (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = res.locals.returnTo || '/tournaments';
    delete  req.session.returnTo;
    res.redirect(redirectUrl);
};

module.exports.logoutUser = (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err)
        }
    req.flash('success', "Goodbye!")
    res.redirect('/');
});
};