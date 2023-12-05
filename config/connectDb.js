const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
const connectToDatabase = () =>
  mongoose
    .connect(process.env.DB_URL)
    .then(() => console.log('DATABASE CONNECTED'))
    .catch((err) => {
      console.log('DB ERROR', err.message);
      process.exit(0);
    });

module.exports = connectToDatabase;
