const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const app = express();

const mongoURI = "mongodb+srv://hasenjamel:hasenjamel0987@hasenjamel.pqxzue4.mongodb.net/drama_db?retryWrites=true&w=majority";

mongoose.connect(mongoURI).then(() => {
    console.log("✅ Connected to MongoDB");
    const data = JSON.parse(fs.readFileSync('database.json', 'utf8'));
    const Series = mongoose.model('Series', {}, 'series');
    Series.countDocuments().then(count => {
        if (count === 0) Series.insertMany(data);
    });
});

app.get('/', (req, res) => res.send("موقع الدراما يعمل!"));
app.listen(process.env.PORT || 3000);
