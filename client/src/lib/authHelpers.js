/** Pure helper: map a user object to their home route. No React dependency. */
export const homeFor = (user) =>
  !user ? '/' : user.role === 'operator' ? '/operator' : user.role === 'admin' ? '/admin' : '/me/trips';

