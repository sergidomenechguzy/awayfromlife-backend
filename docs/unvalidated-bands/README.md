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
	- optional attributes: `origin.administrative, origin.postcode, origin.value, history, recordLabel, releases, foundingDate, website, bandcampUrl, soundcloudUrl, facebookUrl`

## delete
**`api/unvalidated-bands/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete unvalidated band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - unvalidated band collection unique ID
