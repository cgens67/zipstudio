import test from 'node:test';
import assert from 'node:assert';
import { processDroppedDataTransfer } from './dragDropHandler';

test('processDroppedDataTransfer handles empty dataTransfer gracefully', async () => {
  const mockDt = {
    items: [],
    files: [],
  } as unknown as DataTransfer;

  const result = await processDroppedDataTransfer(mockDt);
  assert.strictEqual(result.fileCount, 0);
  assert.strictEqual(result.zipCount, 0);
  assert.strictEqual(result.folderCount, 0);
  assert.deepStrictEqual(result.files, {});
});
