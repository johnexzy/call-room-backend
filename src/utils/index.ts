export const randomString = (length) =>
  [...Array(length)]
    .map(() =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
        Math.floor(Math.random() * 62),
      ),
    )
    .join('');
