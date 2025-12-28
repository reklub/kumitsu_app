const express = require ('express');
const mongoose = require('mongoose');
const dotenv = require ('dotenv');
const ejsMate = require('ejs-mate');
const session = require ('express-session')
const flash = require ('connect-flash')
const methodOverride = require('method-override');
const path = require ('path');

const LocalStrategy = require('passport-local')
const User = require('./models/User');

const passport = require('passport');

const userRoutes = require('./routes/users')
const tournaments = require('./routes/tournaments');
const tournamentManagement = require('./routes/tournamentManagement');
const adminRoutes = require('./routes/admin');
const categories = require('./routes/categories');
const matches = require('./routes/matches');
const participants = require('./routes/participants');
const ExpressError = require('./utils/expressError')

// Middleware

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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



app.use(session(sessionConfig))
app.use(passport.initialize());
app.use(passport.session());

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

// API endpoint to get available belt ranks
app.get('/api/belt-ranks', async (req, res) => {
    try {
        const BeltRank = require('./models/BeltRank');
        const beltRanks = await BeltRank.find().sort({ order: 1 });
        res.json(beltRanks);
    } catch (error) {
        console.error('Error fetching belt ranks:', error);
        res.status(500).json({ error: 'Failed to fetch belt ranks' });
    }
});

app.use('/', userRoutes);
app.use('/', participants)
app.use('/tournaments', tournaments)
app.use('/admin', adminRoutes)
app.use('/admin/tournaments', tournamentManagement)
app.use('/', categories)
app.use('/', matches)

app.all('*', (req,res,next) => {
    next(new ExpressError('Page Not Found', 404))
})

// Global error handler
app.use((err, req, res, next) => {
    const {statusCode = 500} = err;
    if (!err.message) err.message = 'Oh no, something went wrong'
    res.status(statusCode).render('error', {err});
});

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));