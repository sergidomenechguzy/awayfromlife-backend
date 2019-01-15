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
