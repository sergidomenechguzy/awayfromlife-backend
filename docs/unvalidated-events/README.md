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
- `?startWith` - only get events with a name starting with this character (A-Z, # for numbers and other characters)
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
	- required attributes: `name, location, startDate`
	- optional attributes: `description, bands, canceled, ticketLink`

## delete
**`api/unvalidated-events/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete unvalidated event
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated event collection unique ID
