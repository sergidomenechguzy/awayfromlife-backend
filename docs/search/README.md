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
