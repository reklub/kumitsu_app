const express = require ('express');
const mongoose = require('mongoose');
const dotenv = require ('dotenv');
const ejsMate = require('ejs-mate');
const session = require ('express-session')
const flash = require ('connect-flash')
const path = require ('path');

const LocalStrategy = require('passport-local')
const User = require('./models/User');

const passport = require('passport');



//const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users')
const tournaments = require('./routes/tournaments');

// Middleware
//app.use(express.json());

//app.use('/clubs', clubs)

// Połączenie z MongoDB
mongoose.connect('mongodb://localhost:27017/tournaments', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Połączono z MongoDB'))
.catch((err) => console.log(err));

const app = express();
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))

const sessionConfig = {
    secret: 'thisShouldBeABetterSecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }
}



app.use(passport.initialize());
app.use(passport.session());

app.use(session(sessionConfig))

app.use(flash());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req,res,next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.use('/', userRoutes);
app.use('/tournaments', tournaments)

app.all('*', (req,res,next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const {statusCode=500} = err;
    if (!err.message) err.message = 'Oh no, something went wrong'
    res.status(statusCode).render('error', {err});
});

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));