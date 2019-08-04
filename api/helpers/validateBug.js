// validate all attributes for bug objects in the request body
const validateObject = () => {
  return (req, res, next) => {
    if (!(typeof req.body.error === 'string' && req.body.error.length > 0)) {
      return res
        .status(400)
        .json({ message: "Attribute 'error' has to be a string with 1 or more characters." });
    }

    if (!(req.body.description === undefined || typeof req.body.description === 'string')) {
      return res
        .status(400)
        .json({ message: "Attribute 'description' can be left out or has to be a string." });
    }

    if (
      !(
        req.body.loggedIn === undefined ||
        (typeof req.body.loggedIn === 'number' &&
          (req.body.loggedIn === 0 || req.body.loggedIn === 1 || req.body.loggedIn === 2))
      )
    ) {
      return res.status(400).json({
        message:
          "Attribute 'loggedIn' can be left out or has to be either '0', '1' or '2' as a number.",
      });
    }

    if (!(req.body.component === undefined || typeof req.body.component === 'string')) {
      return res
        .status(400)
        .json({ message: "Attribute 'component' can be left out or has to be a string." });
    }

    if (!(req.body.email === undefined || typeof req.body.email === 'string')) {
      return res
        .status(400)
        .json({ message: "Attribute 'email' can be left out or has to be a string." });
    }

    const newBug = {
      error: req.body.error,
      description: req.body.description !== undefined ? req.body.description : '',
      loggedIn: req.body.loggedIn !== undefined ? req.body.loggedIn : 2,
      component: req.body.component !== undefined ? req.body.component : '',
      email: req.body.email !== undefined ? req.body.email : '',
    };
    res.locals.validated = newBug;
    return next();
  };
};

module.exports = {
  validateObject,
};
