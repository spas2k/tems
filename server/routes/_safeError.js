// Shared error handler for route catch blocks.
// Logs the full error server-side; sends a structured response to the client.
module.exports = function safeError(res, err, context) {
  console.error(`[${context || 'api'}]`, err);

  // Build a user-facing message from known DB/constraint error patterns
  let message = 'Internal server error';
  const msg = err.message || '';
  if (msg.match(/unique constraint|duplicate entry|UNIQUE|ER_DUP_ENTRY/i)) {
    message = 'A record with that value already exists. Please use a unique identifier.';
  } else if (msg.match(/foreign key|FOREIGN KEY|ER_NO_REFERENCED_ROW/i)) {
    message = 'The referenced record does not exist. Please check your selections.';
  } else if (msg.match(/not null|ER_BAD_NULL_ERROR/i)) {
    message = 'A required field is missing. Please fill in all required fields.';
  } else if (msg.match(/Data truncat|out of range|ER_DATA_TOO_LONG|ER_WARN_DATA_OUT_OF_RANGE/i)) {
    message = 'A field value is invalid or too long. Please check your input.';
  } else if (process.env.NODE_ENV !== 'production') {
    // In dev, include the raw message for faster diagnosis
    message = msg || 'Internal server error';
  }

  res.status(500).json({ error: message });
};
