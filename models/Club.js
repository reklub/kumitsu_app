const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({
    clubName: String,
    clubCity: String,
    clubCountry: String,
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Participant" }]
});

module.exports = mongoose.model("Club", clubSchema);
