# AI Future Training

AI Future Training is a growing collection of hands-on learning series about artificial intelligence. Each series explores a topic by building a real project, so learners can practice the tools and ideas directly, share what they learn, and keep improving their work.

## Learning approach

- **Learn by building:** turn each topic into a project you can run, inspect, and extend.
- **Work in clear steps:** move from the problem and core concepts to implementation and reflection.
- **Share the process:** document decisions, useful discoveries, and lessons learned so others can follow along.
- **Keep it practical:** connect AI concepts to tools, workflows, and projects people can use.

## Default project stack

Lessons use a simple local web app stack:

| Area | Default | Notes |
| --- | --- | --- |
| UI | One TypeScript single-page app with a single dashboard screen; [daisyUI via CDN](https://daisyui.com/docs/cdn/?lang=en) | Use daisyUI components for the dashboard interface. |
| Icons | [Flaticon](https://www.flaticon.com/) | Choose and download icons for the project, and follow the license and attribution terms for each asset. Flaticon is an icon source; lessons should include the icon files they use rather than assume Flaticon is a runtime CDN. |
| Language | TypeScript for the UI; Python for the API | Use TypeScript for browser-side application code and Python for API code. |
| Local API server | FastAPI | Run the API at `http://localhost:3554`. |
| Local UI server | Lesson's UI development server | Serve the single-page dashboard at `http://localhost:3555`; it calls the API on port `3554`. |
| Database | SQLite | Keep project data in a simple local database. |

This stack is intended to keep lessons easy to run and modify on a learner's computer.

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
