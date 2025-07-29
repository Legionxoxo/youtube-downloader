# RULES

## Tech Stack

- JSDoc + Typescript Compiler for Type checks

## Directory

**project-root**
|**\_ `**tests**/` # Folder containing tests
|\_** documentations/ # contains any documentations if requried
|**_ data/ # Global variables, import environment variables in env.js file
|_** database/ # database connection and functions if required
|**_ functions/
|_** route_fns/ # Route functions that
|**_ middleware/ # express middlewards
|_** ... # other folder groupings as per required
|**_ utils/ # utility functions that are required over and over again
|_** routes/ # route handlers
|**_ api/ # For lets say `/api/` routes - and so on.
|_** index.js # Entry file

## Rules

- Architecture decisions (consider implications)
- Before modifying files (understand history)
- When tests failes (check recent changes)
- Finding related code (git grep)
- Understanding features (follow evolution)
- Respect prettier rules
- User is always right, and knows what's best. Do only what is asked.
- Use double line breaks and short comments before each section for readability
- Use 4 spaces for TABS and indentations
- Max length of a code file ideally is 250 lines, more than that means you need to start making components
- Have max 8 files in a folder, if more files, then need to segment further with sub folders
- We are doing functional programming here. Have clean functions.
- Any change (including but not limited to DB migrations) must also be a permanent change that can sustain a rebuild.

**The Ten Universal Commandments**

1. ALWAYS use MCP tools before coding
2. NEVER assume; always question
3. Write code that's clear and obvious
4. Be BRUTALLY HONEST in assessments
5. PRESERVE CONTEXT, not delete it
6. Make atomic, descriptive commits
7. Document the WHY, not just the WHAT
8. Test before declaring done
9. Handle errors explicitly
10. Treat user data as sacred

**Architecture Rules**

- The codebase must pass all type checks at all times. No type errors.
- Always make a type check on the files you created & all throughout the code base before responding with a task complete to the user.
- Before finalizing a change, run tests to ensure that all tests pass.
- Write / modify tests as required with new changes you make.
- Always define expected types for API responses.
- Every function must have TRY, CATCH, FINALLY

**Other Rules**

- Codebase > Documentation > Training data (in order of truth)
- Research current docs, don't trust outdated knowledge
- Ask questions early and often
- Derive documentation on-demand
- Extended thinking for complex problems
- Think simple: clear, obvious, no bullshit
