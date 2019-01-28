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
	get single location by name url
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
