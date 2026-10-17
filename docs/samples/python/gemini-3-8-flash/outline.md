# Working Python: Practical Automation and Scripting in 20 Days

_Depth: working_

A focused, hands-on curriculum designed to bring an independent learner to working fluency in Python. Emphasizes everyday utilities, text and data processing, file automation, and defensive programming in 30-minute daily increments.

## Week 1: Core Syntax and Control Flow

**Day 1: Variables, Numeric Types, and Input**  
Topics: `variables`, `data-types`, `type-conversion`

- Assign variables using standard Python naming conventions
- Calculate totals with integer and float arithmetic using rupee and tax examples
- Collect and convert user input from the terminal using int() and float()

**Day 2: String Formatting and Cleaning**  
Topics: `strings`, `f-strings`, `string-methods`

- Format output dynamically using Python f-strings
- Clean user-entered text using strip(), lower(), and replace()
- Extract substrings using basic string slicing

**Day 3: Conditional Logic and Decisions**  
Topics: `conditionals`, `booleans`, `control-flow`

- Write multi-branch decisions using if, elif, and else
- Evaluate conditions with comparison and boolean operators (and, or, not)
- Compute bracketed pricing such as tiered electricity or GST rates

**Day 4: Repetition with While and For Loops**  
Topics: `loops`, `range`, `control-flow`

- Iterate over numeric sequences using for loops and range()
- Construct while loops with terminating conditions and counter updates
- Control loop execution flow using break and continue statements

**Day 5: Interactive CLI Utility**  
Topics: `cli`, `loops`, `conditionals`

- Combine loops, conditionals, and input to build an interactive command-line bill splitter
- Validate terminal input against expected choices
- Debug common syntax and indentation mistakes systematically

## Week 2: Data Collections and Transformations

**Day 6: Lists and Sequence Operations**  
Topics: `lists`, `indexing-slicing`, `data-structures`

- Create and modify lists using append(), insert(), and pop()
- Extract subsets of data using list slicing syntax
- Sort and reverse lists in place and using sorted()

**Day 7: Key-Value Mapping with Dictionaries**  
Topics: `dictionaries`, `data-structures`

- Store and retrieve structured data using dictionary keys
- Update dictionary values and add new key-value pairs safely using get()
- Iterate over dictionary keys, values, and items

**Day 8: Sets, Tuples, and Deduplication**  
Topics: `tuples`, `sets`, `data-structures`

- Create immutable records using tuples
- Eliminate duplicate items from a list by casting to a set
- Perform set operations including union, intersection, and difference

**Day 9: Navigating Nested Data Structures**  
Topics: `nested-data`, `dictionaries`, `lists`

- Index and update values inside lists of dictionaries
- Flatten simple two-dimensional data collections
- Filter a list of record dictionaries based on specific field criteria

**Day 10: List and Dictionary Comprehensions**  
Topics: `comprehensions`, `lists`, `dictionaries`

- Transform sequences concisely using list comprehensions
- Filter data inline using conditional comprehensions
- Construct lookup tables using dictionary comprehensions

## Week 3: Functions, Error Handling, and Built-ins

**Day 11: Writing Modular Functions**  
Topics: `functions`, `scope`, `clean-code`

- Define reusable functions with def, parameters, and explicit return values
- Trace variable scope between local function bodies and global scripts
- Document function contracts with concise docstrings

**Day 12: Function Arguments and Return Patterns**  
Topics: `functions`, `clean-code`

- Set sensible parameter defaults for optional configuration
- Pass arguments using explicit keyword syntax
- Return multiple values from a single function using tuple unpacking

**Day 13: Defensive Programming and Error Handling**  
Topics: `error-handling`, `debugging`

- Intercept runtime crashes using try, except, and finally blocks
- Catch specific errors such as ValueError, KeyError, and FileNotFoundError
- Raise custom exceptions to halt execution on invalid business logic

**Day 14: Standard Library: Math, Random, and Datetime**  
Topics: `standard-library`, `datetime`

- Calculate dates, past deltas, and deadlines using the datetime module
- Format timestamps into readable regional strings with strftime()
- Generate random samples and selections using the random module

**Day 15: Text File Input and Output**  
Topics: `file-io`, `context-managers`

- Read raw text files safely using the with open() context manager
- Write and append processed log lines to text files
- Iterate through files line by line to keep memory footprint minimal

## Week 4: Practical Automation and Projects

**Day 16: Working with CSV Files**  
Topics: `csv`, `file-io`, `data-processing`

- Parse tabular records using the built-in csv.reader and csv.DictReader
- Write structured records to a spreadsheet-compatible CSV file using csv.DictWriter
- Compute column summaries such as total spend across monthly expenses

**Day 17: Parsing and Generating JSON Data**  
Topics: `json`, `data-processing`, `nested-data`

- Serialize Python dictionaries and lists into valid JSON strings and files
- Deserialize raw JSON payloads from text files into Python data structures
- Extract nested fields from standard JSON responses

**Day 18: Pattern Matching with Regular Expressions**  
Topics: `regex`, `strings`, `validation`

- Validate text formats such as 6-digit Indian PIN codes and phone numbers using re.search()
- Extract repeated structured entities from unstructured text using re.findall()
- Sanitize inconsistent text fields using re.sub()

**Day 19: Scripts, Arguments, and Virtual Environments**  
Topics: `virtual-environments`, `packaging`, `cli`

- Isolate project dependencies using venv and pip
- Parse script command-line arguments using sys.argv
- Format and freeze project dependencies into a requirements.txt file

**Day 20: Capstone: Automated Expense Audit Tool**  
Topics: `csv`, `json`, `functions`, `file-io`

- Write an end-to-end Python script that ingests a CSV log of daily transactions
- Audit the dataset for anomalies and compute category-wise totals
- Export a formatted summary text report and structured JSON output to disk
