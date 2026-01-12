const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Deck = require('../models/Deck');

// Get all decks for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const decks = await Deck.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ decks });
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ error: { message: 'Failed to fetch decks' } });
  }
});

// Create new deck
router.post('/', auth, async (req, res) => {
  try {
    const { name, pomodoroMinutes, restMinutes, cards } = req.body;

    const deck = new Deck({
      name,
      userId: req.user.id,
      pomodoroMinutes: pomodoroMinutes || 25,
      restMinutes: restMinutes || 5,
      cards: cards || [],
    });

    await deck.save();
    res.status(201).json({ deck });
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: { message: 'Failed to create deck' } });
  }
});

// Update deck
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, pomodoroMinutes, restMinutes, cards } = req.body;
    
    const deck = await Deck.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!deck) {
      return res.status(404).json({ error: { message: 'Deck not found' } });
    }

    if (name) deck.name = name;
    if (pomodoroMinutes !== undefined) deck.pomodoroMinutes = pomodoroMinutes;
    if (restMinutes !== undefined) deck.restMinutes = restMinutes;
    if (cards) deck.cards = cards;

    await deck.save();
    res.json({ deck });
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(500).json({ error: { message: 'Failed to update deck' } });
  }
});

// Delete deck
router.delete('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!deck) {
      return res.status(404).json({ error: { message: 'Deck not found' } });
    }

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error('Error deleting deck:', error);
    res.status(500).json({ error: { message: 'Failed to delete deck' } });
  }
});

module.exports = router;
