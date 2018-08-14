## Awayfromlife Events Application Backend-API Endpoints

# Archived Events

## get
**`api/archived-events/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all archived events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/archived-events/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated archived events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?page` - the current page
- `?perPage` - how many events per page
- `?sortBy` - the attribute the events get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get events with a title starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get events in this city
- `?country` - only get events in this country
- `?genre` - only get events with bands of this genre
- `?startDate` - only get events after this date
- `?endDate` - only get events before this date

**`api/archived-events/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single archived event by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - archived event collection unique ID

**`api/archived-events/byurl/:url`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single archived event by title url
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:url` - archived event collection unique url

**`api/archived-events/title/:title`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get archived events by title
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:title` - searched archived event title query

**`api/archived-events/city/:city`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get archived events by city
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:city` - searched archived event location city query

**`api/archived-events/date/:date`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get archived events by date
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:date` - searched archived event date query

**`api/archived-events/similar`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get archived events in the same location or the same date
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?location` - searched archived event location query
- `?date` - searched archived event date query

**`api/archived-events/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/archived-events/archive`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	move all passed events from events to archived events collection
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

## post
**`api/archived-events/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new archived event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `request-body` - event object
	- required attributes: `title, location, startDate`
	- optional attributes: `description,  bands, canceled, ticketLink`

## put
**`api/archived-events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved archived event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - archived-event collection unique ID
- `request-body` - event object
	- required attributes: `title, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

## delete
**`api/archived-events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete archived event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - archived event collection unique ID

<br>

# Bands

## get
**`api/bands/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all bands
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/bands/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated bands
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?page` - the current page
- `?perPage` - how many locations per page
- `?sortBy` - the attribute the locations get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get bands with a name starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get bands with this origin city
- `?country` - only get bands with this origin country
- `?genre` - only get bands in this genre
- `?label` - only get bands from this label

**`api/bands/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single band by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - band collection unique ID

**`api/bands/byurl/:url`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single band by title url
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:url` - band collection unique url

**`api/bands/events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all band events by band ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - band collection unique ID

**`api/bands/name/:name`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get bands by name
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_name` - searched band name query

**`api/bands/genre/:genre`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get bands by genre
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:genre` - searched band genre query

**`api/bands/genres`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all genres
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/bands/labels`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all labels
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/bands/similar`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get bands with the same name from the same country
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?name` - searched band name query
- `?country` - searched band origin country query

**`api/bands/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

## post
**`api/bands/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `request-body` - band object
	- required attributes: `name, genre, origin.name, origin.country, origin.lat, origin.lng`
	- optional attributes: `origin.administrative, origin.postcode, origin.value, history, recordLabel, releases, foundingDate, websiteUrl, bandcampUrl, soundcloudUrl, facebookUrl`

## put
**`api/bands/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - band collection unique ID
- `request-body` - band object
	- required attributes: `name, genre, origin.name, origin.country, origin.lat, origin.lng`
	- optional attributes: `origin.administrative, origin.postcode, origin.value, history, recordLabel, releases, foundingDate, websiteUrl, bandcampUrl, soundcloudUrl, facebookUrl`

## delete
**`api/bands/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - band collection unique ID

<br>

# Bugs

## get
**`api/bugs/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all bugs
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/bugs/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new bug
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - bug object
	- required attributes: `error`
	- optional attributes: `description, loggedIn, component, email`

## delete
**`api/bugs/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete bug
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - bug collection unique ID

<br>

# Events

## get
**`api/events/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/events/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?page` - the current page
- `?perPage` - how many events per page
- `?sortBy` - the attribute the events get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get events with a title starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get events in this city
- `?country` - only get events in this country
- `?genre` - only get events with bands of this genre
- `?startDate` - only get events after this date
- `?endDate` - only get events before this date

**`api/events/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single event by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - event collection unique ID

**`api/events/byurl/:url`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single event by title url
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:url` - event collection unique url

**`api/events/title/:title`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get events by title
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:title` - searched event title query

**`api/events/city/:city`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get events by city
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:city` - searched event location city query

**`api/events/date/:date`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get events by date
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:date` - searched event date query

**`api/events/canceled`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all user canceled events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

**`api/events/similar`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get events in the same location on the same date
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?location` - searched event location query
- `?date` - searched event date query

**`api/events/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

## post
**`api/events/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `request-body` - event object
	- required attributes: `title, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

## put
**`api/events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - event collection unique ID
- `request-body` - event object
	- required attributes: `title, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

**`api/events/cancel/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	cancel single event by ID (has to be verified by admin)
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - event collection unique ID

## delete
**`api/events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - event collection unique ID

<br>

# Feedback

## get
**`api/feedback/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all feedback
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/feedback/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new feedback
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - feedback object
	- required attributes: `text`
	- optional attributes: `email`

## delete
**`api/feedback/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete feedback
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - feedback collection unique ID

<br>

# Festival Events

# Festivals

# Locations

## get
**`api/locations/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all locations
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/locations/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated locations
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?page` - the current page
- `?perPage` - how many locations per page
- `?sortBy` - the attribute the locations get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get locations with a name starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get locations in this city
- `?country` - only get locations in this country

**`api/locations/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single location by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - location collection unique ID

**`api/locations/byurl/:url`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single location by title url
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:url` - location collection unique url

**`api/locations/events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all location events by location ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_id` - location collection unique ID

**`api/locations/name/:name`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get locations by name
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:_name` - searched location name query

**`api/locations/city/:city`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get locations by city
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:city` - searched location city query

**`api/locations/cities`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all cities with locations
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

**`api/locations/similar`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get locations with the same address or in the same city with the same name or both
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `?address` - searched location address query
- `?name` - searched location name query
- `?city` - searched location city query

**`api/locations/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**

## post
**`api/locations/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new location
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `request-body` - location object
	- required attributes: `name, address.street, address.city, address.country, address.lat, address.lng`
	- optional attributes: `address.administrative, address.county, address.postcode, address.value, status, information, website, facebookUrl`

## put
**`api/locations/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved location
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - location collection unique ID
- `request-body` - location object
	- required attributes: `name, address.street, address.city, address.country, address.lat, address.lng`
	- optional attributes: `address.administrative, address.county, address.postcode, address.value, status, information, website, facebookUrl`

## delete
**`api/locations/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete location
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - location collection unique ID

<br>

# Reports

## get
**`api/reports/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all reports
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/reports/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new report
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - report object
	- required attributes: `category (event, location, band), item (ID)`
	- optional attributes: `description`

## delete
**`api/reports/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete report
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - report collection unique ID

<br>

# Search

## get
**`api/search/:query`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all results from query search
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:query` - search query for multiple attributes
- `?categories` - categories to search in (events, locations, bands)
- `?city` - only get results with this city
- `?country` - only get results with this country
- `?genre` - only get results with this genre (only events and bands)

**`api/search/simple/:query`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get 6 results in total from query search (spread over all available categories)
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:query` - search query for multiple attributes
- `?city` - only get results with this city
- `?country` - only get results with this country
- `?genre` - only get results with this genre (only events and bands)

<br>

# Unvalidated Bands

## get
**`api/unvalidated-bands/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all unvalidated bands
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

**`api/unvalidated-bands/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated unvalidated bands
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `?page` - the current page
- `?perPage` - how many locations per page
- `?sortBy` - the attribute the locations get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get bands with a name starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get bands with this origin city
- `?country` - only get bands with this origin country
- `?genre` - only get bands in this genre
- `?label` - only get bands from this label

**`api/unvalidated-bands/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single unvalidated band by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated band collection unique ID

**`api/unvalidated-bands/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/unvalidated-bands/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new unvalidated band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - band object
	- required attributes: `name, genre, origin.name, origin.country, origin.lat, origin.lng`
	- optional attributes: `origin.administrative, origin.postcode, origin.value, history, recordLabel, releases, foundingDate, websiteUrl, bandcampUrl, soundcloudUrl, facebookUrl`

## delete
**`api/unvalidated-bands/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete unvalidated band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated band collection unique ID

<br>

# Unvalidated Events

## get
**`api/unvalidated-events/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all unvalidated events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

**`api/unvalidated-events/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated unvalidated events
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `?page` - the current page
- `?perPage` - how many events per page
- `?sortBy` - the attribute the events get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get events with a title starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get events in this city
- `?country` - only get events in this country
- `?genre` - only get events with bands of this genre
- `?startDate` - only get events after this date
- `?endDate` - only get events before this date

**`api/unvalidated-events/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single unvalidated event by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated event collection unique ID

**`api/unvalidated-events/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/unvalidated-events/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new unvalidated event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - event object
	- required attributes: `title, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

## delete
**`api/unvalidated-events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete unvalidated event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated event collection unique ID

<br>

# Unvalidated Festival Events

# Unvalidated Locations

## get
**`api/unvalidated-locations/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all unvalidated locations
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

**`api/unvalidated-locations/page`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get paginated unvalidated locations
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `?page` - the current page
- `?perPage` - how many locations per page
- `?sortBy` - the attribute the locations get sorted by
- `?order` - the sorting order (1 for ascending, -1 for descending)
- `?startWith` - only get locations with a name starting with this character (A-Z, # for numbers and other characters)
- `?city` - only get locations in this city
- `?country` - only get locations in this country

**`api/unvalidated-locations/byid/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get single unvalidated location by ID
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated location collection unique ID

**`api/unvalidated-locations/filters`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get the possible values for pagination filters
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/unvalidated-locations/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new unvalidated location
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - location object
	- required attributes: `name, address.street, address.city, address.country, address.lat, address.lng`
	- optional attributes: `address.administrative, address.county, address.postcode, address.value, status, information, website, facebookUrl`

## delete
**`api/unvalidated-locations/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete unvalidated location
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated location collection unique ID

<br>


# Users

## get
**`api/users/logout`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	logout and end the current session
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

**`api/users/auth`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get authorization status
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/users/login`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	login as a registered user
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - token with email and password
	- required attributes: `token`

**`api/users/register`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	register as a new user
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - token with email, name and password
	- required attributes: `token`

**`api/users/reset-password`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	change the current password
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `request-body` - token with old and new password
	- required attributes: `token`