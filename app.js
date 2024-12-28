const express = require ('express');
const app = express();

const path = require('path');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/kumitsu', {useNewUrlParser:true, useUnifiedTopology:true})
    .then(() => {
        console.log("CONNECTION OPEN!")
    })
    .catch(err => {
        console.log("ERROR CONNECTING TO DB")
        console.log(err)
    })

app.get('/', (req, res) => {
    res.send('APA DZIAŁA!')
})

app.listen(3000, () => {
    console.log("APP LISTENING ON PORT 3000");
})