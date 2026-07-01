// Tests for the PIX "copia e cola" (BR Code / EMV-MPM) builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, buildPixCode, PIX_KEY, MERCHANT_NAME } from '../pix.js';

test('crc16 matches the CRC-16/CCITT-FALSE standard check vector', () => {
    // The documented check value for "123456789" is 0x29B1 — validates the
    // implementation against the spec independently of our own payloads.
    assert.equal(crc16('123456789'), '29B1');
});

test('crc16 always returns 4 uppercase hex chars', () => {
    assert.match(crc16('br.gov.bcb.pix'), /^[0-9A-F]{4}$/);
    assert.match(crc16(''), /^[0-9A-F]{4}$/);
});

test('buildPixCode: well-formed payload with a fixed amount', () => {
    const code = buildPixCode(5);
    assert.ok(code.startsWith('000201'), 'payload format indicator 00 = 01');
    assert.ok(code.includes('0014br.gov.bcb.pix'), 'pix GUI field');
    assert.ok(code.includes(PIX_KEY), 'merchant pix key');
    assert.ok(code.includes('5303986'), 'transaction currency 986 (BRL)');
    assert.ok(code.includes('54045.00'), 'amount field: id 54, len 04, "5.00"');
    assert.ok(code.includes('5802BR'), 'country code BR');
    assert.ok(code.includes(MERCHANT_NAME), 'merchant name');
    assert.ok(code.includes('6304'), 'CRC tag + length');
});

test('buildPixCode: length byte tracks the amount width', () => {
    assert.ok(buildPixCode(10).includes('540510.00'), '"10.00" is 5 chars -> len 05');
});

test('buildPixCode: open amount (0 / undefined) omits the 54 field', () => {
    // Currency (53) should be followed directly by country (58), no amount between.
    assert.ok(buildPixCode(0).includes('53039865802BR'), '0 -> open amount');
    assert.ok(buildPixCode().includes('53039865802BR'), 'undefined -> open amount');
    assert.ok(!buildPixCode().includes('54045.00'), 'no fixed amount present');
});

test('buildPixCode: the trailing CRC is self-consistent', () => {
    const code = buildPixCode(3);
    const body = code.slice(0, -4);          // everything up to & including "6304"
    assert.ok(body.endsWith('6304'), 'body ends at the CRC tag');
    assert.equal(code.slice(-4), crc16(body), 'appended CRC matches recomputation');
});
