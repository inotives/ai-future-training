# Things to prepare before running this lesson

## Terminal 

If you are using mac, terminal should come with it. just make sure you have them handy. 


## Git

Make sure you have your git install. usually on mac, git should come with it. you can verify it by: 

```
git --version
```

a pop-up dialog box should appear stating that git command require **Xcode Command Link Tools** . 
Install and agree to the terms. macOS will auto download and setup git for you. 


## HomeBrew (for Mac)

Homebrew is the most renown cli package management for Mac user. you can install almost all the necessary cli and opensource app via homebrew with simply `brew install <package-name>`
Installation guide: https://brew.sh/

Or simply, open terminal then use: 
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```



## IDE 

IDE of you choice as long as they can run terminal within the IDE. Some recommendation:
- [Visual Studio Code](https://code.visualstudio.com/) - All rounder IDE 
- [Zed](https://zed.dev/) - My personal fave, less traditional dev feature than VsCode but good at switching multiple project flow


## Coding Agent (choose 1) and Coding Subscription (optional)

Prefereably you have coding subscription and follow this learning. This will depend on which agent you need to install and have. Preferable you follow thru this using Codex or Claude since most of the lesson will be using those 2 agent primary. But if you do not have those, you still can use OpenCode and Anti-gravity which both provide some free-to-use model and credit. Below are installation instruction. 

### Claude-code 

You can follow claude code installation instruction on their site: https://code.claude.com/docs/en/quickstart

basically for mac it will just be: 
```
curl -fsSL https://claude.ai/install.sh | bash
```

### Codex 

Here is the installation guide on their official site: https://learn.chatgpt.com/docs/codex/cli

Basically for mac, it will just be: 
```
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

### Anti-gravity

New google coding agent, they have free weekly and 5hour quota if you login with you personal gmail. Here is their installation guide: https://antigravity.google/download#antigravity-cli

Basically on Mac will just be: 
```
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

### OpenCode 

Opensource community AI Harness that is agent agnostic. Have multiple free model to use. 
here is the installation guide on their official: https://opencode.ai/

On Mac, basically is just this: 
```
curl -fsSL https://opencode.ai/v2/install | bash
```

## Supporting Tools for Agents 

after your are done with agents, there are some supporting tools that i found very helpful in agentic development. 

### [Codegraph](https://github.com/colbymchenry/codegraph)

Help your agent understand your codebase. helpful for sub-agents when they are working on complex tasks.
Installation on Mac: 
```
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

### [Context-mode](https://github.com/mksglu/context-mode)

This plugin stops coding agents from wasting their context window on raw tool outputs by sandboxing the data locally and letting the agent query only what it needs. 

To install, start your coding agent, prompt your agent to context-mode github and ask it to install the plugins base on instruction outline by context-mode. 

### Programming language 

for these lesson, we will be mainly use 2 programming language: 

1. Typescript / Javascript
If you had install homebrew, then you just need to do this to install node: 
```
brew install node
```
else you will need to go to https://nodejs.org/  and download the LTS `.pkg` for MacOS. 


2. Python 
If you had install homebrew, then you just need to do this: 
```
brew install python
```
then verify the installation with `python3 --version`


