const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/purchase', (req, res) => {
  const { itemId, price, currentBalance } = req.body || {};
  // Validate required fields
  if (!itemId || typeof price !== 'number') {
    return res.status(400).json({ success: false, message: 'missing itemId or price' });
  }
  
  // Server-side validation: ensure user has enough coins
  if (typeof currentBalance !== 'number' || currentBalance < price) {
    return res.status(402).json({ success: false, message: 'insufficient funds' });
  }
  
  // Additional security: validate price is reasonable (no negative purchases)
  if (price < 0) {
    return res.status(400).json({ success: false, message: 'invalid price' });
  }
  
  // Simulate processing delay
  setTimeout(() => {
    res.json({ success: true, itemId });
  }, 400);
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
