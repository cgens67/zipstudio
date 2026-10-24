import test from 'node:test';
import assert from 'node:assert';
import { explainCodeInPlainEnglish } from './codeExplainer';

test('explainCodeInPlainEnglish describes .gitkeep correctly with specific use case', () => {
  const en = explainCodeInPlainEnglish('.gitkeep', '', 'en');
  assert.match(en.title, /Git Directory Placeholder/);
  assert.match(en.whatItDoes, /empty folder/i);
  assert.ok(en.details.length >= 2);

  const zh = explainCodeInPlainEnglish('.gitkeep', '', 'zh-CN');
  assert.match(zh.title, /空目录占位符/);

  const ms = explainCodeInPlainEnglish('.gitkeep', '', 'ms');
  assert.match(ms.title, /Penanda Folder Kosong/);
});

test('explainCodeInPlainEnglish describes .gitignore correctly with specific use cases', () => {
  const en = explainCodeInPlainEnglish('.gitignore', 'node_modules\n.env\ndist', 'en');
  assert.match(en.title, /Git Ignore Rules/);
  assert.match(en.whatItDoes, /node_modules|build/i);

  const zh = explainCodeInPlainEnglish('.gitignore', '', 'zh-CN');
  assert.match(zh.title, /忽略规则清单/);

  const ms = explainCodeInPlainEnglish('.gitignore', '', 'ms');
  assert.match(ms.title, /Senarai Pengecualian Git/);
});

test('explainCodeInPlainEnglish describes .jar archives correctly', () => {
  const en = explainCodeInPlainEnglish('app-release.jar', '', 'en');
  assert.match(en.title, /Java Archive/);
  assert.match(en.whatItDoes, /bytecode/i);
});

test('explainCodeInPlainEnglish describes .kts Kotlin Scripts correctly', () => {
  const en = explainCodeInPlainEnglish('build.gradle.kts', '', 'en');
  assert.match(en.title, /Kotlin Script/);
  assert.match(en.whatItDoes, /Gradle/i);
});

test('explainCodeInPlainEnglish describes .env and .apk files correctly', () => {
  const envDesc = explainCodeInPlainEnglish('.env', 'DATABASE_URL=xyz', 'en');
  assert.match(envDesc.title, /Environment Variables/);

  const apkDesc = explainCodeInPlainEnglish('release.apk', '', 'en');
  assert.match(apkDesc.title, /Android Application Package/);
});
