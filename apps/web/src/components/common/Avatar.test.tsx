import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders same-origin paths and falls back to initials after an image error', () => {
    render(<Avatar name="Ada Lovelace" src="/avatars/ada.png" />);

    const image = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(image).toHaveAttribute('src', '/avatars/ada.png');

    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent(
      'AL',
    );
  });

  it.each([
    'https://example.test/avatar.png',
    '//example.test/avatar.png',
    '/\\example.test/avatar.png',
    'data:image/png;base64,abc',
  ])('does not render unsafe source %s', (src) => {
    render(<Avatar name="Grace Hopper" src={src} />);

    const avatar = screen.getByRole('img', { name: 'Grace Hopper' });
    expect(avatar.tagName).toBe('SPAN');
    expect(avatar).toHaveTextContent('GH');
  });

  it('uses the first two name parts and handles blank names accessibly', () => {
    const { rerender } = render(<Avatar name="  Katherine   Johnson  " />);
    expect(
      screen.getByRole('img', { name: 'Katherine Johnson' }),
    ).toHaveTextContent('KJ');

    rerender(<Avatar name="   " />);
    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveTextContent('?');
  });
});
