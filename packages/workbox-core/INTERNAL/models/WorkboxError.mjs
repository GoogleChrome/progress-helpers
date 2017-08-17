import messageGenerator from './messages/messageGenerator.mjs';

/**
 * Workbox errors should be thrown with this class.
 * This allows use to ensure the type easily in tests,
 * helps developers identify errors from workbox
 * easily and allows use to optimise error
 * messages correctly.
 *
 * @private
 */
export default class WorkboxError extends Error {
  /**
   *
   * @param {String} errorCode The error code that
   * identifies this particular error.
   * @param {Object=} details Any relevant arguments
   * that will help developers identify issues should
   * be added as a key on the context object.
   */
  constructor(errorCode, details) {
    let message = messageGenerator(errorCode, details);

    super(message);

    this.name = errorCode;
    this.details = details;
  }
}
