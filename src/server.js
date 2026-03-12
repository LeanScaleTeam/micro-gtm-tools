require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3850;
app.listen(PORT, () => {
  console.log(`GTM Tools running at http://localhost:${PORT}`);
});
