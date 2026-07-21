/**
 * Middleware to authorize access based on user roles.
 * This function checks if the user's role (attached to the request object)
 * is included in the list of allowed roles. If not, it denies access.
 *
 * @param {string[]} roles - Array of roles allowed to access the route.
 * @returns {Function} - Middleware function to authorize the request.
 */
const authorizeRole = (roles) => {
  return (req, res, next) => {
    // Log the user's role and the allowed roles for debugging
    console.log(
      `User role: ${req.user.role}, Allowed roles: ${roles.join(", ")}`,
    );

    // Check if the user's role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      console.error(
        `Access denied: User with role '${req.user.role}' is not authorized.`,
      );
      return res
        .status(403)
        .json({
          message:
            "Access denied. You do not have permission to perform this action.",
        });
    }

    // If authorized, proceed to the next middleware or route handler
    console.log(`User with role '${req.user.role}' authorized successfully.`);
    next();
  };
};

module.exports = authorizeRole;
