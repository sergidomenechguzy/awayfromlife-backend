const mongoose = require('mongoose');

const { Schema } = mongoose;

// create report schema
const ReportSchema = new Schema({
  category: {
    type: String,
    required: true,
    trim: true,
  },
  item: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

mongoose.model('reports', ReportSchema);
