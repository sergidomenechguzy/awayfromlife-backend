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
