import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightCode } from './syntaxHighlighter';

test('highlightCode highlights all lines past line 1200 in large >50KB Kotlin files', () => {
  const headerLines = Array.from({ length: 1250 }, (_, i) =>
    `    val shuffledIndices_${i} = IntArray(player.mediaItemCount) { it }`
  );
  const tailLines = [
    '    if (dataStore.get(PersistentQueueKey, true)) {',
    '        return 42',
    '    }',
  ];
  const fullCode = [...headerLines, ...tailLines].join('\n');

  assert.ok(fullCode.length > 50_000, 'test fixture should exceed legacy 50KB threshold');
  const html = highlightCode(fullCode, 'kotlin');

  const htmlLines = html.split('\n');
  assert.equal(htmlLines.length, headerLines.length + tailLines.length);

  // Tail lines past line 1250 must still contain Prism token spans
  const tailHtml = htmlLines.slice(1250).join('\n');
  assert.ok(tailHtml.includes('<span class="token keyword">if</span>'), 'expected keyword token past line 1250');
  assert.ok(tailHtml.includes('<span class="token keyword">return</span>'), 'expected return token past line 1250');
  assert.ok(tailHtml.includes('<span class="token number">42</span>'), 'expected number token past line 1250');
});

test('highlightCode highlights >250KB multi-thousand-line files completely via chunking', () => {
  const lines = Array.from({ length: 4200 }, (_, i) =>
    `    val item_${i} = "track_${i}" // padding to exceed 250KB threshold cleanly in chunked mode`
  );
  const code = lines.join('\n');
  assert.ok(code.length > 250_000 && code.length < 500_000);

  const html = highlightCode(code, 'kotlin');
  const htmlLines = html.split('\n');
  assert.equal(htmlLines.length, 4200);
  assert.ok(htmlLines[4199].includes('<span class="token comment">'), 'expected comment token on final line 4200');
});
