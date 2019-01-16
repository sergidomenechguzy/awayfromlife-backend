# Reports

## api/reports

### GET `api/reports`
Returns all report objects from the reports collection in the database.
<br>
Authorization needed: **yes**

Responses:
* **`200`**
  * A list of report objects
  * Returns: application/json
```json
	{
		data: [<report-object>],
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

### POST `api/reports`
Saves a new report object to the reports collection in the database.
<br>
Authorization needed: **no**

Required body attributes:
* `category` **String** - possible values: band, event, festival, location
* `item` **ObjectId** or **Object** with _id attribute

Optional body attributes:
* `description` **String**

Responses:
* **`200`**
  * New report object saved
  * Returns: application/json
```json
	{
		message: 'Report saved',
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

## api/reports/latest

### GET `api/reports/latest`
Returns the latest added report objects from the reports collection in the database.
<br>
Authorization needed: **yes**

Optional query parameters:
* `count` **Number** - possible values: 5, 10, 20

Responses:
* **`200`**
  * A list of report objects
  * Returns: application/json
```json
	{
		data: [<report-object>],
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

## api/reports/{_id}

### DELETE `api/reports/{_id}`
Deletes the report object from the reports collection in the database with the given id.
<br>
Authorization needed: **yes**

Required route parameters:
* `_id` **ObjectId**

Responses:
* **`200`**
  * Report object deleted
  * Returns: application/json
```json
	{
		message: 'Report deleted',
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

## api/reports/accept/{_id}

### POST `api/reports/accept/{_id}`
Deletes the reported object from the specified collection in the database and the report object from the reports collection in the database with the given id.
<br>
Authorization needed: **yes**

Required route parameters:
* `_id` **ObjectId**

Responses:
* **`200`**
  * Report object and reported object deleted
  * Returns: application/json
```json
	{
		message: 'Report and <category> deleted',
		token: <authorization-token>
	}
```
* **`400`**
  * Id does not match a report
  * Returns: application/json
```json
	{
		message: 'No report found with this ID',
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
