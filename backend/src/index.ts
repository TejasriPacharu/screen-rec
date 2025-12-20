import express from 'express';
import mongoose from 'mongoose';
import { MONGO_CONN_STR, PORT } from './config';
import { authRouter } from './auth';
import { recordingsRouter } from './recordings';

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use('/auth', authRouter);
app.use('/recordings', recordingsRouter);

mongoose.connect(MONGO_CONN_STR).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});