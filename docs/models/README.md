# Models

## Band

Model for **`bands`**, **`unvalidated-bands`** collections in the database.

* **name** - `String`
  * required: **`true`**
* **url** - `String`
  * auto-generated
* **genre** - `[String]`
  * required: **`true`**
  * Array of ObjectIds from genres collection
* **origin** - `Object`
  * **city** - `String`
    * required: **`true`**
  * **administrative** - `String`
  * **country** - `String`
    * required: **`true`**
  * **postcode** - `String`
  * **lat** - `Number`
    * required: **`true`**
  * **lng** - `Number`
    * required: **`true`**
  * **value** - `String`
  * **countryCode** - `String`
    * required: **`true`**
* **history** - `String`
* **recordLabel** - `String`
* **releases** - `[Object]`
  * **releaseName** - `String`
  * **releaseYear** - `String`
* **foundingDate** - `String`
* **website** - `String`
* **bandcampUrl** - `String`
* **soundcloudUrl** - `String`
* **facebookUrl** - `String`
* **image** - `[String]`
  * auto-generated

## Bug

Model for **`bugs`** collection in the database.

* **error** - `String`
  * required: **`true`**
* **description** - `String`
* **loggedIn** - `Number`
  * min: 0
  * max: 2
* **component** - `String`
* **email** - `String`

## Event

Model for **`events`**, **`archived-events`**, **`unvalidated-events`** collections in the database.

* **name** - `String`
  * required: **`true`**
* **url** - `String`
  * auto-generated
* **description** - `String`
* **location** - `String`
  * required: **`true`**
  * ObjectId from locations collection
* **date** - `String`
  * required: **`true`**
  * expected format: YYYY-MM-DD
* **time** - `String`
* **bands** - `[String]`
  * required: **`true`**
  * Array of ObjectIds from bands collection
* **canceled** - `Number`
  * min: 0
  * max: 2
* **ticketLink** - `String`
* **image** - `[String]`
  * auto-generated

## Feedback

Model for **`feedback`** collection in the database.

* **text** - `String`
  * required: **`true`**
* **email** - `String`

## Festival Event

Model for **`festival-events`**, **`unvalidated-festival-events`** collections in the database.

* **name** - `String`
  * required: **`true`**
* **description** - `String`
* **startDate** - `String`
  * required: **`true`**
  * expected format: YYYY-MM-DD
* **endDate** - `String`
  * required: **`true`**
  * expected format: YYYY-MM-DD
* **bands** - `[String]`
  * required: **`true`**
  * Array of ObjectIds from bands collection
* **canceled** - `Number`
  * min: 0
  * max: 2
* **image** - `[String]`
  * auto-generated

## Festival

Model for **`festivals`**, **`unvalidated-festivals`** collections in the database.

* **name** - `String`
  * required: **`true`**
* **url** - `String`
  * auto-generated
* **description** - `String`
* **genre** - `[String]`
  * required: **`true`**
  * Array of ObjectIds from genres collection
* **events** - `[String]`
  * Array of ObjectIds from festival-events collection
* **address** - `Object`
  * **street** - `String`
    * required: **`true`**
  * **administrative** - `String`
  * **city** - `String`
    * required: **`true`**
  * **county** - `String`
  * **country** - `String`
    * required: **`true`**
  * **postcode** - `String`
  * **lat** - `Number`
    * required: **`true`**
  * **lng** - `Number`
    * required: **`true`**
  * **value** - `String`
  * **countryCode** - `String`
    * required: **`true`**
* **ticketLink** - `String`
* **website** - `String`
* **facebookUrl** - `String`
* **image** - `[String]`
  * auto-generated

## Genre

Model for **`genres`** collection in the database.

* **name** - `String`
  * required: **`true`**

## Location

Model for **`locations`**, **`unvalidated-locations`** collections in the database.

* **name** - `String`
  * required: **`true`**
* **url** - `String`
  * auto-generated
* **address** - `Object`
  * **street** - `String`
    * required: **`true`**
  * **administrative** - `String`
  * **city** - `String`
    * required: **`true`**
  * **county** - `String`
  * **country** - `String`
    * required: **`true`**
  * **postcode** - `String`
  * **lat** - `Number`
    * required: **`true`**
  * **lng** - `Number`
    * required: **`true`**
  * **value** - `String`
  * **countryCode** - `String`
    * required: **`true`**
* **status** - `String`
  * default: opened
* **information** - `String`
* **website** - `String`
* **facebookUrl** - `String`
* **image** - `[String]`
  * auto-generated

## Report

Model for **`genres`** collection in the database.

* **category** - `String`
  * required: **`true`**
  * possible values: band, event, festival, location
* **item** - `String`
  * required: **`true`**
  * ObjectId from the collection specified in the category attribute
* **description** - `String`

## User

Model for **`users`** collection in the database.

* **name** - `String`
  * required: **`true`**
* **email** - `String`
  * required: **`true`**
* **password** - `String`
  * required: **`true`**
* **currentSessions** - `[Object]`
  * **sessionID** - `String`
  * **expireTime** - `Number`