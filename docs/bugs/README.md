# Bugs

## `api/bugs`
### Get
Returns all bugs from the bugs collection in the database.
<br>
Authorization needed: **yes**

Responses:
* **`200`**
  * A list of bugs
* **`500`**
  * Error message

### Post

<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get all bugs
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/bugs/`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	save new bug
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - bug object
	- required attributes: `error`
	- optional attributes: `description, loggedIn, component, email`

## delete
**`api/bugs/:_id`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	delete bug
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `:_id` - bug collection unique ID
