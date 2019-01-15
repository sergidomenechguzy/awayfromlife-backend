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
	get single band by name url
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
	- optional attributes: `origin.administrative, origin.postcode, origin.value, history, recordLabel, releases, foundingDate, website, bandcampUrl, soundcloudUrl, facebookUrl`

## put
**`api/bands/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	update saved band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - band collection unique ID
- `request-body` - band object
	- required attributes: `name, genre, origin.name, origin.country, origin.lat, origin.lng`
	- optional attributes: `origin.administrative, origin.postcode, origin.value, history, recordLabel, releases, foundingDate, website, bandcampUrl, soundcloudUrl, facebookUrl`

## delete
**`api/bands/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete band
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - band collection unique ID
