const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/purchase', (req, res) => {
  const { itemId, price } = req.body || {};
  // This is a mock endpoint. Replace with real payment verification server-side.
  if (!itemId) return res.status(400).json({ success: false, message: 'missing itemId' });
  // Simulate processing delay
  setTimeout(() => {
    res.json({ success: true, itemId });
  }, 400);
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
