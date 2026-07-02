# Third-Party Notices

ZeroDelay includes and builds upon third-party open-source software. The original
license notices are reproduced below, as required by their respective licenses.

ZeroDelay as a whole is distributed under the GNU GPL-3.0 (see [LICENSE](LICENSE)).
The components below are GPL-compatible; the portions derived from or bundled with
them remain available to you under their original terms, reproduced here.

---

## 1. live-catch-up (base of this extension)

ZeroDelay is a **derivative work** of **live-catch-up** by **yudai-tiny-developer**:

> https://github.com/yudai-tiny-developer/live-catch-up

The original project is **dual-licensed under the MIT License and the Apache
License 2.0**. ZeroDelay incorporates and modifies its source under the terms of
the MIT License, reproduced below (the original repository did not ship a filled-in
copyright line; attribution to the original author is preserved here).

```
MIT License

Copyright (c) yudai-tiny-developer
https://github.com/yudai-tiny-developer/live-catch-up

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The Apache-2.0 option offered by the original project is also available at:
https://github.com/yudai-tiny-developer/live-catch-up/blob/main/LICENSE-APACHE

---

## 2. qrcode-generator (`vendor/qrcode.js`)

The bundled QR Code generator used by the PIX donation panel.

```
The MIT License (MIT)

Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 3. Departure Mono (`fonts/DepartureMono-Regular.woff2`)

The self-hosted interface typeface. Only the WOFF2 web font is bundled; the full
license text travels with it in [`fonts/OFL.txt`](fonts/OFL.txt).

> Copyright 2022–2024 Helena Zhang (https://helenazhang.com)
>
> This Font Software is licensed under the **SIL Open Font License, Version 1.1**.
> The full license (with FAQ) is available at https://openfontlicense.org and is
> reproduced in `fonts/OFL.txt`. "Departure Mono" is a Reserved Font Name under
> the OFL.

---

## 4. Pixelarticons (mode icons — "degraded" glyphs)

The pixel glyphs stacked under each mode icon (the low-quality/degraded state of
the "degraded → sharp" morph) are individual SVGs from **Pixelarticons** by
**Gerrit Halfmann**, inlined in `popup.js` (`ICONS`). Only the glyphs actually
used are vendored: `power`, `sparkle`, `shield`, `speed-medium`, `arrow-bar-right`,
`zap` (mode icons). The copo americano, can and long-neck bottle glyphs labeling the
PIX amount chips (Brazil only) are original line icons drawn for this project (not
from Pixelarticons) and carry no third-party claim; the mug there is Lucide `beer`.

> https://github.com/halfmage/pixelarticons

```
MIT License

Copyright (c) 2019 Gerrit Halfmann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 5. Lucide (interface icons — "sharp" glyphs)

The clean vector glyphs (the sharp/synced state of the morph, plus the single
support/indicator icons) are individual SVGs from **Lucide**, inlined in
`popup.js` (`ICONS`). Only the glyphs actually used are vendored: `power`,
`sparkles`, `shield`, `gauge`, `arrow-right-to-line`, `zap`, `check`, `wifi`,
`sliders-horizontal`, `coffee`, `beer`.

> https://github.com/lucide-icons/lucide

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

Some Lucide icons used here (`power`, `check`) originate from the **Feather**
project and remain available under its MIT license:

```
The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
