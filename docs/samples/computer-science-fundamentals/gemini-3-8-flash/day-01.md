# Day 1: Binary, Hexadecimal, and Data Encoding

_About 15 minutes_

---

# Day 1: Binary, Hexadecimal, and Data Encoding

Every piece of data stored in memory or sent across the network is ultimately a sequence of electrical charges interpreted as 1s and 0s. Understanding how numbers and text translate into binary, hexadecimal, and raw bytes allows you to accurately measure payload sizes, prevent integer overflows, and debug data corruption bugs.

---

## 1. Positional Bases: Binary and Hexadecimal

We count in decimal (base 10) using digits `0-9`. Computers use binary (base 2) with digits `0` and `1`. Reading binary is straightforward when you look at positional powers of 2:

| $2^7$ (128) | $2^6$ (64) | $2^5$ (32) | $2^4$ (16) | $2^3$ (8) | $2^2$ (4) | $2^1$ (2) | $2^0$ (1) |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 |

Calculation: $128 + 32 + 16 + 2 = 178$ in decimal.

### Hexadecimal (Base 16): The Human-Friendly Binary

Writing 64-bit binary strings by hand is unreadable. Hexadecimal solves this by grouping every 4 bits (called a **nibble**) into a single character. Base 16 uses digits `0-9` followed by `A` (10), `B` (11), `C` (12), `D` (13), `E` (14), and `F` (15).

To convert binary `10110010` to hex:
1. Split into 4-bit nibbles: `1011` and `0010`.
2. Convert each nibble: 
   - `1011` = $8 + 2 + 1 = 11$, which is `B`.
   - `0010` = $2$, which is `2`.
3. Combine: `0xB2` (prefixed with `0x` to signal hexadecimal).

Because 1 byte equals 8 bits, **1 byte is always represented by exactly 2 hexadecimal digits** (e.g., `0x00` = 0 to `0xFF` = 255).

---

## 2. Integer Byte Capacities

An integer's memory footprint depends on how many bytes are allocated to it:

* **1 Byte (8 bits):** Unsigned: $0$ to $2^8 - 1$ ($0$ to $255$). Signed (Two's Complement): $-128$ to $+127$.
* **2 Bytes (16 bits):** Unsigned: $0$ to $65,535$. Signed: $-32,768$ to $+32,767$.
* **4 Bytes (32 bits):** Unsigned: $0$ to $\approx 4.29 \times 10^9$. Signed: $-2,147,483,648$ to $+2,147,483,647$.
* **8 Bytes (64 bits):** Up to $\approx 1.84 \times 10^{19}$ unsigned.

If you store the transaction amount `₹300` in an 8-bit unsigned integer, it rolls over ($300 - 256 = 44$) due to integer overflow.

---

## 3. Text Encoding: ASCII and UTF-8

Computers cannot store characters directly; they store numbers mapped to glyphs via an encoding scheme.

### ASCII (7-bit, fits in 1 byte)
ASCII maps numbers 0 through 127 to English characters, digits, and basic punctuation. For instance:
* `'A'` is code point 65 (`0x41`)
* `' '` (space) is code point 32 (`0x20`)

### UTF-8 (Variable-width encoding)
Modern applications use UTF-8. It is backward-compatible with ASCII but can represent over 1.1 million characters across all languages and emoji sets:
* **Standard ASCII characters (`U+0000` to `U+007F`):** Occupy **1 byte**.
* **Latin with accents, Greek, Arabic, Hebrew (`U+0080` to `U+07FF`):** Occupy **2 bytes**.
* **Indian scripts (Devanagari, Tamil, Bengali) and Indian Rupee symbol `₹` (`U+0800` to `U+FFFF`):** Occupy **3 bytes**.
* **Emojis, historic scripts, supplementary symbols (`U+10000` and above):** Occupy **4 bytes**.

### Practical Example: Payload Size Calculation
Suppose an API sends the string: `"UPI: ₹500"`.
Let's calculate the byte size in UTF-8:
* `'U'`, `'P'`, `'I'`, `':'`, `' '` $\rightarrow 5$ ASCII characters $\times 1\text{ byte} = 5\text{ bytes}$
* `'₹'` (Indian Rupee sign, `U+20B9`) $\rightarrow 1$ Devanagari/currency symbol $\times 3\text{ bytes} = 3\text{ bytes}$
* `'5'`, `'0'`, `'0'` $\rightarrow 3$ ASCII characters $\times 1\text{ byte} = 3\text{ bytes}$
* **Total Size:** $5 + 3 + 3 = 11\text{ bytes}$.

---

## Common Pitfalls

1. **Assuming 1 Character == 1 Byte:** In high-level languages like Python or JavaScript, `len("₹")` is `1` (one character), but `Buffer.byteLength("₹", "utf8")` is `3` bytes. Allocating buffer sizes or database column sizes based on character count instead of byte length leads to truncation or buffer overrun errors.
2. **Confusing Hex Digit Count with Byte Count:** Every byte is two hex digits. A 16-character hexadecimal string (`0x4A6F...`) represents 8 bytes, not 16 bytes.

---

## Recap
* Binary uses base-2 positional notation; hexadecimal groups 4 binary bits into a single character (`0-F`), meaning 2 hex characters equal exactly 1 byte.
* Fixed-width integer types have hard limits ($2^8, 2^{16}, 2^{32}, 2^{64}$); exceeding them causes silent overflow or runtime exceptions.
* UTF-8 is a variable-length text encoding using 1 to 4 bytes per character. ASCII takes 1 byte, Indian scripts and `₹` take 3 bytes, and emojis take 4 bytes.

---

## Practice task

Complete the following data representation exercise and write out your working steps:

1. **Conversions**:
   a. Convert the decimal number `218` into an 8-bit binary string.
   b. Convert that binary string directly into its 2-digit hexadecimal representation.

2. **Payload Sizing**:
   You are designing a webhook payload containing the following JSON snippet:
   `{"status":"PAID","amt":"₹1500","flag":"✅"}`
   Calculate the exact size of this UTF-8 encoded string in bytes. Break down your calculation character-by-character or group-by-group (accounting for ASCII characters, the rupee symbol `₹`, and the emoji `✅` which is code point `U+2705`).

| Criterion | What good looks like | Points |
| --- | --- | --- |
| Binary Conversion Accuracy | Correctly converts 218 to 8-bit binary `11011010` showing positional values (128+64+16+8+2). | 3 |
| Hexadecimal Conversion Accuracy | Correctly splits `11011010` into `1101` (D) and `1010` (A) to arrive at `0xDA`. | 3 |
| UTF-8 Payload Size Calculation | Correctly categorizes and tallies the byte sizes: ASCII characters (38 chars at 1 byte each = 38 bytes), the Rupee symbol '₹' (3 bytes), and the emoji '✅' (3 bytes in UTF-8 for U+2705), yielding a final total of 44 bytes with explicit step-by-step breakdown. | 4 |

---

## Quiz

**1. What is the decimal equivalent of the hexadecimal value 0x2E?** _(topic: `binary-encoding`)_

- A. 38
- B. 46
- C. 44
- D. 58

> Answer: **B**. In hexadecimal, '2' represents 2 * 16 = 32, and 'E' represents 14 * 1 = 14. Adding 32 + 14 gives 46. A common error is miscalculating E as 12 (giving 44) or treating the base as 10.

**2. An unsigned 16-bit integer variable holds the value 65535. If you add 1 to this variable in a system that allows silent integer overflow, what will the variable hold?** _(topic: `data-representation`)_

- A. 65536
- B. -32768
- C. 0
- D. 255

> Answer: **C**. A 16-bit unsigned integer can store values from 0 up to (2^16 - 1) = 65,535. Adding 1 causes the bits to wrap around back to 0. 65536 cannot fit into 16 bits, and -32768 would apply only if it were treated as a signed integer.

**3. How many bytes does the string 'Namaste 🙏' consume when encoded in UTF-8? (Note: 'Namaste' is 7 ASCII letters, ' ' is 1 space, and '🙏' is code point U+1F64F).** _(topic: `data-representation`)_

- A. 8 bytes
- B. 11 bytes
- C. 12 bytes
- D. 16 bytes

> Answer: **C**. 'Namaste' (7 bytes) + space (1 byte) = 8 bytes for ASCII. The folded hands emoji '🙏' is in the 4-byte UTF-8 range (U+10000 to U+10FFFF). Total: 8 + 4 = 12 bytes. Believing emojis take 3 bytes or 1 byte results in undercounting.

**4. Which of the following binary sequences represents the hexadecimal value 0x7C?** _(topic: `binary-encoding`)_

- A. 01111100
- B. 11100011
- C. 01101100
- D. 01111010

> Answer: **A**. Break 0x7C into two nibbles: 7 and C. 7 in 4-bit binary is 0111. C is 12 in decimal, which is 8 + 4 = 1100. Combining them yields 01111100.

**5. A developer sets a database column to VARCHAR(10) with byte-length semantics (maximum 10 bytes). Which of the following values will exceed this limit when encoded in UTF-8?** _(topic: `data-representation`)_

- A. Code12345
- B. ₹100
- C. Pay ₹5000
- D. Super

> Answer: **C**. Let's check 'Pay ₹5000': 'Pay ' is 4 bytes, '₹' is 3 bytes, '5000' is 4 bytes. Total = 4 + 3 + 4 = 11 bytes, which exceeds the 10-byte limit. 'Code12345' is 9 bytes, and '₹100' is 3 + 3 = 6 bytes.

