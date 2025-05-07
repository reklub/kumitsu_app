const express = require ('express');
const mongoose = require('mongoose');
const dotenv = require ('dotenv');
const ejsMate = require('ejs-mate');
const path = require ('path');
const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
//app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))

//const authRoutes = require('./routes/authRoutes');
const tournaments = require('./routes/tournaments');

// Middleware
//app.use(express.json());
app.use('/tournaments', tournaments)
//app.use('/clubs', clubs)

// Połączenie z MongoDB
mongoose.connect('mongodb://localhost:27017/tournaments', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Połączono z MongoDB'))
.catch((err) => console.log(err));

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));