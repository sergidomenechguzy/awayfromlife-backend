# Feedback

## api/feedback

### GET `api/feedback`
Returns all feedback objects from the feedback collection in the database.
<br>
Authorization needed: **yes**

Responses:
* **`200`**
  * A list of feedback objects
  * Returns: application/json
```json
	{
		data: [<feedback-object>],
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

### POST `api/feedback`
Saves a new feedback object to the feedback collection in the database.
<br>
Authorization needed: **no**

Required body attributes:
* `text` **String**

Optional body attributes:
* `email` **String**

Responses:
* **`200`**
  * New feedback object saved
  * Returns: application/json
```json
	{
		message: 'Feedback saved',
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

## api/feedback/latest

### GET `api/feedback/latest`
Returns the latest added feedback objects from the feedback collection in the database.
<br>
Authorization needed: **yes**

Optional query parameters:
* `count` **Number** - possible values: 5, 10, 20

Responses:
* **`200`**
  * A list of feedback objects
  * Returns: application/json
```json
	{
		data: [<feedback-object>],
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

## api/feedback/{_id}

### DELETE `api/feedback/{_id}`
Deletes the feedback object from the feedback collection in the database with the given id.
<br>
Authorization needed: **yes**

Required route parameters:
* `_id` **ObjectId**

Responses:
* **`200`**
  * Feedback object deleted
  * Returns: application/json
```json
	{
		message: 'Feedback deleted',
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
