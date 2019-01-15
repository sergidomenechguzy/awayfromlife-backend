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
