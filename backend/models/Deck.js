const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
});

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pomodoroMinutes: {
    type: Number,
    default: 25,
  },
  restMinutes: {
    type: Number,
    default: 5,
  },
  cards: [cardSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Deck', deckSchema);
