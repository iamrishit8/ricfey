# Computer Science Fundamentals: Practical Core for Builders

_Depth: working_

A hands-on 4-week foundation in practical computer science essentials. Master data structures, algorithmic complexity, system memory, networking, and concurrency to write efficient and robust software.

## Week 1: Data Representations, Memory, and Complexity

**Day 1: Binary, Hexadecimal, and Data Encoding**  
Topics: `binary-encoding`, `data-representation`

- Convert numbers between decimal, binary, and hexadecimal formats
- Calculate byte sizes for integer and UTF-8 encoded text payloads

**Day 2: Stack vs Heap Memory Layout**  
Topics: `memory-management`, `stack-and-heap`

- Differentiate variable allocation between stack frames and heap space
- Predict memory leak risks by tracing variable lifetimes

**Day 3: Time and Space Complexity with Big-O**  
Topics: `big-o-notation`, `algorithm-analysis`

- Determine the time complexity of simple loops and nested loops
- Calculate auxiliary space consumed by iterative algorithms

**Day 4: Contiguous Memory: Arrays and Dynamic Resizing**  
Topics: `arrays`, `memory-management`

- Compute amortized cost for dynamic array appending operations
- Explain CPU cache locality benefits of contiguous arrays over fragmented pointers

**Day 5: Pointer-Based Structures: Singly and Doubly Linked Lists**  
Topics: `linked-lists`, `algorithm-analysis`

- Trace insertion and deletion operations in linked lists step-by-step
- Choose between dynamic arrays and linked lists given specific read/write access patterns

## Week 2: Essential Data Structures and Retrieval

**Day 6: LIFO and FIFO: Stacks, Queues, and Deques**  
Topics: `stacks-and-queues`, `data-representation`

- Implement a FIFO queue using array or linked node backends
- Trace stack operations to validate matching pairs of parentheses in expressions

**Day 7: Hash Tables and Collision Resolution**  
Topics: `hash-tables`, `big-o-notation`

- Explain how hash collisions occur and how separate chaining resolves them
- Calculate load factors to decide when hash tables require resizing

**Day 8: Recursion and Call Stack Limits**  
Topics: `recursion`, `stack-and-heap`

- Identify the base case and recursive relation in recursive functions
- Diagnose and prevent stack overflow conditions in deeply recursive routines

**Day 9: Divide and Conquer: Binary Search and Sorting**  
Topics: `binary-search`, `sorting-algorithms`, `big-o-notation`

- Implement binary search on sorted data to achieve logarithmic search time
- Compare merge sort and quicksort tradeoffs in terms of worst-case time and space

**Day 10: Hierarchical Data: Binary Search Trees (BST)**  
Topics: `trees`, `binary-search`

- Trace in-order, pre-order, and post-order traversals of a binary tree
- Explain how an unbalanced binary search tree degrades lookup performance to linear time

## Week 3: Graphs, Storage, and System Organization

**Day 11: Graph Representations: Adjacency Matrix vs List**  
Topics: `graph-fundamentals`, `memory-management`

- Model network topologies using adjacency list representations
- Compare storage footprints of dense versus sparse graph representations

**Day 12: Graph Traversal: BFS vs DFS**  
Topics: `graph-fundamentals`, `stacks-and-queues`

- Trace breadth-first search to find the shortest path in unweighted graphs
- Trace depth-first search to detect cycles within a directed graph

**Day 13: Operating System Basics: Processes, Threads, and Context Switching**  
Topics: `os-processes-threads`, `memory-management`

- Contrast process memory isolation with thread shared-memory models
- Explain the computational overhead involved in operating system context switches

**Day 14: Concurrency Challenges: Race Conditions and Deadlocks**  
Topics: `concurrency`, `os-processes-threads`

- Identify critical sections prone to data race conditions in multithreaded logic
- Recognize the four conditions necessary for deadlock to arise

**Day 15: File Systems, Persistent Storage, and I/O Latency**  
Topics: `storage-and-io`, `memory-management`

- Compare latency differences between L1/L2 CPU cache, RAM, NVMe SSD, and disk
- Explain why buffering and batching reduce I/O bottlenecks in data operations

## Week 4: Networking, Architecture, and Practical Synthesis

**Day 16: Networking Core: IP Addressing, DNS, and Routing**  
Topics: `networking-basics`

- Explain how DNS resolves domain names into routable IP addresses
- Trace a data packet routing step through subnets and gateways

**Day 17: Transport Layer: TCP Three-Way Handshake vs UDP**  
Topics: `networking-basics`, `transport-protocols`

- Diagram the TCP three-way handshake and connection termination flow
- Select appropriately between TCP and UDP based on reliability and latency requirements

**Day 18: Application Layer: HTTP/HTTPS Lifecycle and Headers**  
Topics: `networking-basics`, `http-protocol`

- Trace an HTTP request/response exchange including status codes and headers
- Explain how TLS handshakes establish encrypted communication channels

**Day 19: Caching Mechanisms: LRU Cache and Invalidation**  
Topics: `caching`, `hash-tables`, `linked-lists`

- Combine a hash table and doubly linked list to design a Least Recently Used (LRU) cache
- Identify common cache invalidation strategies and trade-offs

**Day 20: End-to-End System Design: What Happens When You Request a URL**  
Topics: `system-design`, `networking-basics`, `storage-and-io`

- Trace the full lifecycle of a web request from browser input through network stacks to server disk
- Diagnose system performance bottlenecks across compute, memory, and network boundaries
