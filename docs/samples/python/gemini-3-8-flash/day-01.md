# Day 1: Variables, Numeric Types, and Input

_About 25 minutes_

---

Every automation script starts by holding data in memory, doing math on it, and asking users for details. Today you will build your foundation: storing numbers in variables, doing accurate financial calculations, and capturing user input from the terminal.

### Storing Data in Variables

In Python, a variable is a label attached to a piece of data stored in memory. You assign values using the `=` operator:

```python
item_name = "Office Chair"
unit_price = 4500
quantity = 3
```

Python follows specific naming conventions called `snake_case`:
- Use all lowercase letters.
- Separate words with underscores (`item_count`, not `itemCount` or `ItemCount`).
- Variable names cannot start with a digit (`item_1` is valid; `1_item` is an error).
- Never use reserved keywords such as `print`, `input`, `class`, or `for` as variable names.

### Numeric Types: Integers vs. Floats

Python uses two main numeric types for calculations:

1. **`int` (Integer)**: Whole numbers without decimals. Examples: `5`, `0`, `-12`, `1800`.
2. **`float` (Floating-point number)**: Numbers with decimal points. Examples: `18.5`, `0.05`, `249.99`.

Python automatically chooses the right type based on the value you assign:

```python
subtotal = 3500          # int
gst_rate = 0.18          # float (18% Goods and Services Tax)
gst_amount = subtotal * gst_rate  # result becomes a float: 630.0
```

### Arithmetic Operators

Python provides standard arithmetic operators:

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | Addition | `100 + 25` | `125` |
| `-` | Subtraction | `100 - 25` | `75` |
| `*` | Multiplication | `100 * 0.18` | `18.0` |
| `/` | Division (always yields a float) | `100 / 4` | `25.0` |
| `//` | Floor division (drops decimal part) | `100 // 3` | `33` |
| `%` | Modulo (remainder) | `100 % 3` | `1` |
| `**` | Exponentiation | `10 ** 2` | `100` |

Notice that regular division (`/`) always produces a `float`, even when dividing two whole numbers evenly (`4 / 2` yields `2.0`).

### Capturing Terminal Input

The `input()` function pauses execution and waits for the user to type something and press Enter. It prints a prompt message inside the parentheses:

```python
customer_name = input("Enter customer name: ")
print("Processing order for:", customer_name)
```

### The Golden Rule of `input()`: Everything Is a String

The most common beginner bug in Python involves user input. **The `input()` function always returns text (a `str`), even if the user types digits.**

Look at this mistake:

```python
# BUGGY CODE
units = input("Enter units: ")      # User types: 4 -> units is "4" (text)
price = 500
total = units * price               # Results in "4" repeated 500 times!
```

If you try to add numbers formatted as strings:

```python
a = input("First number: ")   # User enters: 10 -> "10"
b = input("Second number: ")  # User enters: 20 -> "20"
print(a + b)                  # Output: "1020", not 30!
```

To do math, you must explicitly convert (or *cast*) the input into a numeric type using `int()` or `float()`:

```python
# Correct conversion
units = int(input("Enter units: "))
unit_price = float(input("Enter unit price (₹): "))

subtotal = units * unit_price
gst = subtotal * 0.18
grand_total = subtotal + gst

print("Subtotal:", subtotal)
print("GST (18%):", gst)
print("Grand Total:", grand_total)
```

Use `int()` when the value cannot have fractions (headcount, days, item quantity). Use `float()` when fractional amounts are possible (prices, percentages, kilograms, litres).

### Common Pitfalls to Avoid

1. **Calling `int()` on decimal text**: Writing `int("19.50")` raises a `ValueError`. To convert user input that might include a decimal point, use `float()`. If you need an integer later, convert the float: `int(float("19.50"))`.
2. **Shadowing built-in names**: Never name a variable `float`, `int`, `str`, or `input` (for instance, `input = input("Enter: ")`). This overwrites the built-in function, causing errors later in your script.

### Day 1 Recap

- Store values in descriptive `snake_case` variables without using Python keywords.
- Python treats whole numbers as `int` and decimals as `float`; division (`/`) always returns a `float`.
- The `input()` function returns text (`str`); you must wrap it in `int()` or `float()` before performing arithmetic.

---

## Practice task

Write a Python script that calculates an electricity bill surcharge based on meter readings. The script must:
1. Prompt the user to enter their customer name (text).
2. Prompt the user to enter the previous meter reading in kilowatt-hours (kWh) as an integer.
3. Prompt the user to enter the current meter reading in kilowatt-hours (kWh) as an integer.
4. Prompt the user to enter the rate per kWh in rupees as a float (e.g., 7.50).
5. Calculate the units consumed (`current_reading - previous_reading`).
6. Calculate the base energy charge (`units_consumed * rate_per_kwh`).
7. Calculate a 9% regulatory surcharge on the base charge (`base_charge * 0.09`).
8. Calculate and print the total payable amount (`base_charge + surcharge`).

Paste your complete Python script along with sample output showing what displays when the user inputs:
- Name: Rajiv Sharma
- Previous Reading: 1240
- Current Reading: 1485
- Rate per kWh: 7.25

| Criterion | What good looks like | Points |
| --- | --- | --- |
| Variable Naming and Syntax | Uses clean snake_case names (e.g., previous_reading, rate_per_kwh) and does not shadow built-in function names like int, float, or input. | 2 |
| Input and Type Conversion | Correctly prompts for all four values and explicitly converts readings using int() and the rate using float(). | 3 |
| Calculation Accuracy | Accurately computes units consumed, base charge, 9% surcharge, and total payable amount with correct operator usage. | 3 |
| Output Demonstration | Includes sample terminal output demonstrating the run with the provided test numbers (yielding 245 units, base charge ₹1776.25, surcharge ₹159.8625, total ₹1936.1125). | 2 |

---

## Quiz

**1. A script prompts a user for their monthly mobile bill with `bill = input("Enter bill amount: ")`. The user enters `799`. What is the type and value of `bill`?** _(topic: `type-conversion`)_

- A. int with value 799
- B. float with value 799.0
- C. str with value "799"
- D. A TypeError occurs because no type was specified

> Answer: **C**. input() always returns a string (str), regardless of what the user types. To get the number 799, the programmer must cast it with int() or float().

**2. Which of the following variable names follows standard Python naming conventions (PEP 8)?** _(topic: `variables`)_

- A. 2nd_tax_bracket
- B. monthly_gst_rate
- C. MonthlyGSTRate
- D. monthly-gst-rate

> Answer: **B**. Standard Python variable naming uses snake_case: all lowercase letters separated by underscores. '2nd_tax_bracket' is invalid because names cannot start with a digit; 'MonthlyGSTRate' is PascalCase (used for classes); and 'monthly-gst-rate' is invalid syntax because '-' represents subtraction.

**3. What is the output of the expression `15 / 3` in Python 3?** _(topic: `data-types`)_

- A. 5
- B. 5.0
- C. 5.00
- D. 3

> Answer: **B**. In Python 3, the standard division operator (/) always returns a float, even if the division divides evenly without a remainder. If you need an integer result, use floor division (//).

**4. What happens when you run `int("49.99")` in Python?** _(topic: `type-conversion`)_

- A. It returns 49 by dropping the decimal part.
- B. It rounds up and returns 50.
- C. It returns 49.99 as a float.
- D. It raises a ValueError.

> Answer: **D**. int() cannot directly convert a string containing a decimal point. It raises a ValueError: invalid literal for int() with base 10: '49.99'. You must convert it using float("49.99") first.

**5. You execute the following two lines in the terminal:
```python
quantity = "5"
price = 120
print(quantity * price)
```
What is the result?** _(topic: `data-types`)_

- A. 600
- B. A string repeating the character '5' 120 times
- C. TypeError: can't multiply sequence by non-int of type 'int'
- D. 600.0

> Answer: **B**. In Python, multiplying a string by an integer repeats that string. Because 'quantity' is the string "5" and not the integer 5, "5" * 120 generates a string with 120 fives. To get 600, you must cast quantity using int(quantity).

