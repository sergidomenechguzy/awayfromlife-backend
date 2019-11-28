#!/bin/bash

mongo --eval '
  db = db.getSiblingDB("awayfromlife");
  db.dropDatabase();
'
collections=(archived_events
  bands
  bugs
  events
  feedbacks
  festival_events
  festivals
  genres
  locations
  reports
  unvalidated_bands
  unvalidated_events
  unvalidated_festival_events
  unvalidated_festivals
  unvalidated_locations
  users)
for collection in "${collections[@]}"; do
  mongodump --uri="mongodb://superadmin:shingshongadmin@ds119675.mlab.com:19675/awayfromlife" -c=$collection
done
mongorestore dump/
rm -rf ./dump
mongo --eval '
  db = db.getSiblingDB("awayfromlife");
  db.dropUser("localUser");
  db.createUser({ user: "localUser", pwd: "localPassword", roles: ["readWrite"] });
'
