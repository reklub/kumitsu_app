const express = require ('express');
const mongoose = require('mongoose');
const dotenv = require ('dotenv');

//const authRoutes = require('./routes/authRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');

const app = express ();

// Middleware
app.use(express.json());

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Połączono z MongoDB'))
.catch((err) => console.log(err));

// Trasy
//app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));