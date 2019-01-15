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
- `?startWith` - only get events with a name starting with this character (A-Z, # for numbers and other characters)
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
	get single archived event by name url
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:url` - archived event collection unique url

**`api/archived-events/name/:name`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get archived events by name
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `:name` - searched archived event name query

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
	- required attributes: `name, location, startDate`
	- optional attributes: `description,  bands, canceled, ticketLink`

## put
**`api/archived-events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved archived event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - archived-event collection unique ID
- `request-body` - event object
	- required attributes: `name, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

## delete
**`api/archived-events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete archived event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - archived event collection unique ID
