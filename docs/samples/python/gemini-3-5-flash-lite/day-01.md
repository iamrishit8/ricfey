# Day 1: Setting Up and Printing

_About 30 minutes_

---

Welcome to Practical Python for Everyday Tasks! Today, we take your very first step into programming by learning how to run Python code and display information on your screen. This is the foundation of every single program you will ever write, allowing your code to talk back to you.

### What is Python?

Python is a popular programming language known for being readable and straightforward. Think of it like giving a recipe to a very literal-minded assistant: every instruction must be precise, and Python will follow it step by step.

### The Print Statement

In Python, the `print()` function is how you display text, numbers, or results to the screen. Whenever you want your program to show you an output, you use `print` followed by parentheses.

```python
print("Hello, World!")
```

When you run this code, Python outputs:
```text
Hello, World!
```

Notice the quotation marks (`" "`) around the text. In Python, text is known as a **string**. If you want Python to treat something as literal text, you must enclose it in quotes.

### Printing Numbers and Doing Math

You do not always need quotation marks. If you want Python to calculate a number or show a numerical value, you type it directly without quotes.

```python
print(500)
print(100 + 50)
```

Output:
```text
500
150
```

When you omit the quotes, Python evaluates the math first (`100 + 50`) and then prints the result (`150`). If you had written `print("100 + 50")`, Python would have just printed the literal text `100 + 50` on the screen instead of calculating it.

### Printing Multiple Items

You can print multiple pieces of data at once by separating them with commas inside the `print()` function. Python automatically adds a space between them.

```python
print("Your balance is:", 4500)
```

Output:
```text
Your balance is: 4500
```

### Common Mistakes to Avoid

1. **Forgetting Quotes on Text:** If you write `print(Hello)` without quotes, Python thinks `Hello` is the name of a variable or command it should recognize. It will crash with a `NameError`. Always use quotes for raw text.
2. **Mismatched Quotation Marks:** If you start a string with a double quote, you must end it with a double quote. Writing `print("Hello')` will cause a `SyntaxError` because Python gets confused by the mixed marks.

### Quick Recap

- The `print()` function is your primary tool for displaying output to the console.
- Text strings must be enclosed in quotation marks (`"`), while numbers and math expressions do not use quotes.
- You can print multiple values at once by separating them with commas.

---

## Practice task

Write a Python script using the print() statement to display a mock monthly grocery receipt. Your script must include: 1. A header line saying 'MONTHLY GROCERY BILL'. 2. At least three separate items, where each line shows the item name and its price separated by a comma (using commas inside the print statement). 3. A final calculation line that prints 'Total:' followed by the sum of those three prices calculated directly by Python without quotes. Write out your code clearly.

| Criterion | What good looks like | Points |
| --- | --- | --- |
| Header inclusion | The script correctly prints the text header 'MONTHLY GROCERY BILL' enclosed in quotation marks. | 2 |
| Multiple items with commas | The script prints at least three items using the print function with commas to separate item names and prices. | 4 |
| Calculated total | The script successfully calculates and prints the total cost of the three items using Python math without quotation marks around the numbers. | 4 |

---

## Quiz

**1. What will happen if you run the code: print(10 + 20)?** _(topic: `print-statement`)_

- A. It will print the text '10 + 20'
- B. It will print the number 30
- C. It will throw a SyntaxError
- D. It will print '1020'

> Answer: **B**. Because there are no quotation marks around 10 + 20, Python evaluates the mathematical expression first and prints the resulting sum, 30. If quotes were used, it would print the literal text.

**2. Which of the following print statements is written correctly in Python?** _(topic: `print-statement`)_

- A. print(Hello World)
- B. print["Hello World"]
- C. print("Hello World")
- D. PRINT("Hello World")

> Answer: **C**. Python requires lowercase function names (print) followed by parentheses and valid string quotes. Option 1 lacks quotes, option 2 uses square brackets instead of parentheses, and option 4 uses uppercase letters which Python does not recognize.

**3. What is the primary purpose of the Python interactive shell?** _(topic: `python-setup`)_

- A. To design graphical user interfaces for desktop apps
- B. To quickly test and run small snippets of Python code line by line
- C. To automatically convert Python files into executable programs
- D. To store permanent databases on your hard drive

> Answer: **B**. The interactive shell allows developers to type Python commands and see results immediately, making it ideal for experimentation and learning.

**4. What will the following code output? print("Price:", 100)** _(topic: `print-statement`)_

- A. Price: 100
- B. Price:, 100
- C. Price:100
- D. An error because you cannot mix text and numbers

> Answer: **A**. When you separate multiple items with a comma inside a print statement, Python automatically inserts a space between them, resulting in 'Price: 100'.

**5. Why would you get a NameError when running print(Welcome)?** _(topic: `print-statement`)_

- A. Because the word Welcome is spelled incorrectly
- B. Because Python thinks Welcome is a variable name or keyword rather than literal text since it lacks quotes
- C. Because print functions cannot take single words
- D. Because Python requires double quotes instead of single letters

> Answer: **B**. Without quotation marks, Python assumes Welcome refers to a previously defined variable. Since none exists, it raises a NameError. Adding quotes turns it into a string.

