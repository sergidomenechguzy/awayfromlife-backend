const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

// connect to mongoose
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/awayfromlife', { useMongoClient: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// load location model
require('./models/Location');
const Location = mongoose.model('locations');

// load event model
require('./models/Event');
const Event = mongoose.model('events');

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('API started');
});

//locations
app.get('/api/locations', (req, res) => {
  Location.find()
    .then(locations => {
      res.json(locations);
    });
});

app.get('/api/locations/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Location.findOne(id)
    .then(location => {
      res.json(location);
    });
});

app.post('/api/locations', (req, res) => {
  new Location(req.body)
    .save()
    .then(res.send('saved'));
});

app.put('/api/locations/:_id', (req, res) => {
  const id = { _id: req.params._id};
  const update = {
    name: req.body.name,
    address: req.body.address,
    information: req.body.information,
    facebook_page_url: req.body.facebook_page_url
  };
  Location.findOneAndUpdate(id, update, {}, (err, location) => {
    if(err) throw err;
    res.json(location);
  });
});

app.delete('/api/locations/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Location.remove(id, (err, location) => {
    if(err) throw err;
    res.json(location);
  });
});

// events
app.get('/api/events', (req, res) => {
  Event.find()
    .then(events => {
      res.json(events);
    });
});

app.get('/api/events/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Event.findOne(id)
    .then(event => {
      res.json(event);
    });
});

app.get('/api/locations/:_id/events', (req, res) => {
  const id = { location: req.params._id};
  Event.find(id)
    .then(events => {
      res.json(events);
    });
});

app.get('/api/events/month/:month', (req, res) => {
  const monthEvents = [];
  Event.find()
    .then(events => {
      events.forEach((event) => {
        if(event.date.getMonth() == req.params.month) {
          monthEvents.push(event);
        }
      })
      res.json(monthEvents);
    });
});

app.post('/api/events', (req, res) => {
  new Event(req.body)
    .save()
    .then(res.send('saved'));
});

app.put('/api/events/:_id', (req, res) => {
  const id = { _id: req.params._id};
  const update = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    date: req.body.date
  };
  Event.findOneAndUpdate(id, update, {}, (err, event) => {
    if(err) throw err;
    res.json(event);
  });
});

app.delete('/api/events/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Event.remove(id, (err, event) => {
    if(err) throw err;
    res.json(event);
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server startet on port ${port}`);
});