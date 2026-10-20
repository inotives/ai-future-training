# AI Future Training

AI Future Training is a growing collection of hands-on learning series about artificial intelligence. Each series explores a topic by building a real project, so learners can practice the tools and ideas directly, share what they learn, and keep improving their work.

## Learning approach

- **Learn by building:** turn each topic into a project you can run, inspect, and extend.
- **Work in clear steps:** move from the problem and core concepts to implementation and reflection.
- **Share the process:** document decisions, useful discoveries, and lessons learned so others can follow along.
- **Keep it practical:** connect AI concepts to tools, workflows, and projects people can use.

## Pre-flight: install your tools

Before starting a learning series, make sure you have **Node.js** and one coding agent: **Claude Code** or **Codex CLI**. Individual projects may list additional tools. The current starter and workshop API use TypeScript on Node.js, so Python is not required.

### Check what is already installed

Open Terminal and run:

```sh
node --version
npm --version
claude --version
codex --version
```

You only need one of `claude` or `codex` to work. If a command prints a version number, that tool is installed. If Terminal says `command not found`, follow the matching macOS installation steps below.

### Install Node.js on macOS

1. Visit the [Node.js download page](https://nodejs.org/en/download) and choose the **LTS** release for macOS.
2. Download and open the macOS **.pkg installer**, then follow the installer prompts.
3. Close and reopen Terminal, then confirm `node --version` and `npm --version` each print a version.

### Install one coding agent on macOS

Choose either option. You will sign in the first time you run it.

**Claude Code**

1. Follow Anthropic's [Claude Code setup guide](https://code.claude.com/docs/en/setup) for macOS.
2. To install from Terminal, run:

   ```sh
   curl -fsSL https://claude.ai/install.sh | bash
   ```

3. Close and reopen Terminal, then run `claude --version`.

**Codex CLI**

1. In Terminal, run the official macOS installer:

   ```sh
   curl -fsSL https://chatgpt.com/codex/install.sh | sh
   ```

2. Close and reopen Terminal, then run `codex --version`.
3. When you first run `codex`, follow the sign-in prompt.

If you use a managed work computer and cannot install software, ask your IT team for help before the workshop.

## How each lesson works

Each lesson provides two folders:

- **`boilerplate/`** is the starter project. Copy it to a new folder of your own and do your work there.
- **`result/`** shows the expected outcome. Use it to see what your project should do or look like; it is a reference, not a workspace. Do not code in this folder.

For example, create a folder such as `my-result/` beside those folders, copy the boilerplate into it, and follow the lesson instructions there. Your implementation may differ from the reference as long as it meets the lesson goals.

## Learning series

| Series | Focus |
| --- | --- |
| [When to Vibe, When to Loop](when-to-vibe-when-to-loop-eng/README.md) | Learn when to use AI-assisted building and when to rely on a deliberate development loop by creating a project. |

More series will be added as new topics and projects are developed.

## How to use this repository

1. Choose a learning series that interests you.
2. Follow its project steps and build along on your own machine.
3. Experiment, adapt the project, and note what you learn.
4. Share your results and improvements with others.

Each series README provides its own goals, requirements, and project instructions. Follow each lesson's instructions for how to run its starter project and compare your work with the expected result.

## Who this is for

Curious learners, practitioners, and teams who want to understand AI through direct practice and share useful, reproducible learning experiences.
