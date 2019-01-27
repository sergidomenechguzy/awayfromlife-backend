# Bugs

## api/bugs

### GET `api/bugs`
Returns all bug objects from the bugs collection in the database.
<br>
Authorization needed: **yes**

Responses:
* **`200`**
  * A list of bug objects
  * Returns: application/json
```json
	{
		data: [<bug-object>],
		token: <authorization-token>
	}
```
* **`500`**
  * Error message
  * Returns: application/json
```json
	{
		message: 'Error, something went wrong. Please try again.',
		error: '<error.name>: <error.message>'
	}
```

### POST `api/bugs`
Saves a new bug object to the bugs collection in the database.
<br>
Authorization needed: **no**

Required body attributes:
* `error` **String**

Optional body attributes:
* `description` **String**
* `loggedIn` **Number** - possible values: 0, 1, 2
* `component` **String**
* `email` **String**

Responses:
* **`200`**
  * New bug object saved
  * Returns: application/json
```json
	{
		message: 'Bug saved',
		token: <authorization-token>
	}
```
* **`500`**
  * Error message
  * Returns: application/json
```json
	{
		message: 'Error, something went wrong. Please try again.',
		error: '<error.name>: <error.message>'
	}
```

## api/bugs/latest

### GET `api/bugs/latest`
Returns the latest added bug objects from the bugs collection in the database.
<br>
Authorization needed: **yes**

Optional query parameters:
* `count` **Number** - possible values: 5, 10, 20

Responses:
* **`200`**
  * A list of bug objects
  * Returns: application/json
```json
	{
		data: [<bug-object>],
		token: <authorization-token>
	}
```
* **`500`**
  * Error message
  * Returns: application/json
```json
	{
		message: 'Error, something went wrong. Please try again.',
		error: '<error.name>: <error.message>'
	}
```

## api/bugs/{_id}

### DELETE `api/bugs/{_id}`
Deletes the bug object from the bugs collection in the database with the given id.
<br>
Authorization needed: **yes**

Required route parameters:
* `_id` **ObjectId**

Responses:
* **`200`**
  * Bug object deleted
  * Returns: application/json
```json
	{
		message: 'Bug deleted',
		token: <authorization-token>
	}
```
* **`500`**
  * Error message
  * Returns: application/json
```json
	{
		message: 'Error, something went wrong. Please try again.',
		error: '<error.name>: <error.message>'
	}
```
