# Users

## get
**`api/users/logout`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	logout and end the current session
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

**`api/users/auth`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	get authorization status
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**

## post
**`api/users/login`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	login as a registered user
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - token with email and password
	- required attributes: `token`

**`api/users/register`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	register as a new user
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **no**
- `request-body` - token with email, name and password
	- required attributes: `token`

**`api/users/reset-password`**
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	change the current password
<br>&nbsp;&nbsp;&nbsp;&nbsp;
	authorization needed: **yes**
- `request-body` - token with old and new password
	- required attributes: `token`
