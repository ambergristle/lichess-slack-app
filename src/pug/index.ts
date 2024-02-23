import pug from 'pug';

/**
 * @todo localize
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
 */

export const compileLandingPage = pug.compileFile('src/pug/landing.pug')

export const compileErrorPage = pug.compileFile('src/pug/error.pug')

export const compileNotFoundPage = pug.compileFile('src/pug/404.pug')

export const compileRegistrationErrorPage = pug.compileFile('src/pug/registrationError.pug')

export const compileRegistrationOkPage = pug.compileFile('src/pug/registrationOk.pug')
