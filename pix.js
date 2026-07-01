// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)

// ---------------------------------------------------------------------------
// PIX "Copia e Cola" / QR Code (BR Code, EMV-MPM standard) builder.
//
// Everything is generated locally — no network requests — so it complies with
// the Chrome MV3 "no remotely hosted code" rule.
//
// To change the recipient, edit the three constants below. Keep the name and
// city ASCII and UPPERCASE (no accents): name <= 25 chars, city <= 15 chars.
// ---------------------------------------------------------------------------
export const PIX_KEY = '95a360d8-00bd-4186-bfbe-e39d554915a4';
export const MERCHANT_NAME = 'JOAO GUSTAVO FRANCA';
export const MERCHANT_CITY = 'BRASIL';

// Suggested tip amounts, in BRL. The first one is the default selection.
export const PIX_AMOUNTS = [1, 3, 5, 10];
export const PIX_DEFAULT_AMOUNT = 1;

// One EMV field: ID + 2-digit length + value.
function field(id, value) {
    return id + String(value.length).padStart(2, '0') + value;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over the payload including the
// "6304" tag, returned as 4 uppercase hex digits — exactly as the BR Code spec
// requires. Exported so its standard check vector can be unit-tested.
export function crc16(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let b = 0; b < 8; b++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Build the full "copia e cola" string. Pass a positive amount to lock the
// value, or 0/undefined to leave it open (the payer types the amount in their
// bank app).
export function buildPixCode(amount) {
    const merchantAccount = field('00', 'br.gov.bcb.pix') + field('01', PIX_KEY);
    const hasAmount = Number.isFinite(amount) && amount > 0;
    const body =
        field('00', '01') +                          // Payload Format Indicator
        field('26', merchantAccount) +               // Merchant Account Info (Pix)
        field('52', '0000') +                        // Merchant Category Code
        field('53', '986') +                         // Transaction Currency = BRL
        (hasAmount ? field('54', amount.toFixed(2)) : '') + // Transaction Amount
        field('58', 'BR') +                          // Country Code
        field('59', MERCHANT_NAME) +                 // Recipient name
        field('60', MERCHANT_CITY) +                 // Recipient city
        field('62', field('05', '***')) +            // Additional data (txid = ***)
        '6304';                                      // CRC-16 tag + length
    return body + crc16(body);
}
