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
- `?startWith` - only get events with a name starting with this character (A-Z, # for numbers and other characters)
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
	get single event by name url
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:url` - event collection unique url

**`api/events/name/:name`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get events by name
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:name` - searched event name query

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
	- required attributes: `name, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

## put
**`api/events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - event collection unique ID
- `request-body` - event object
	- required attributes: `name, location, startDate`
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
