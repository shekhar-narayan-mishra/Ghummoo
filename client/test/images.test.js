// Unsplash detection must check the real host, not whether the text appears somewhere in the URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUnsplash, sized } from '../src/lib/format.js';

test('isUnsplash: only the real images.unsplash.com host counts', () => {
  assert.equal(isUnsplash('https://images.unsplash.com/photo-1?w=1600&q=72'), true);
  assert.equal(isUnsplash('https://evil.example/images.unsplash.com/x.jpg'), false);
  assert.equal(isUnsplash('https://images.unsplash.com.evil.example/x.jpg'), false);
  assert.equal(isUnsplash('/uploads/abc.jpg'), false);
  assert.equal(isUnsplash(''), false);
  assert.equal(sized('https://images.unsplash.com/photo-1?w=1600&q=72', 400), 'https://images.unsplash.com/photo-1?w=400&q=72');
  assert.equal(sized('https://evil.example/images.unsplash.com/x.jpg?w=1600', 400), 'https://evil.example/images.unsplash.com/x.jpg?w=1600');
});
