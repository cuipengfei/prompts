# Project Context

## Purpose
AI 编程助手指令框架项目，专为训练和约束 AI 代码助手（如 GitHub Copilot、Claude Code）而设计。通过一套完整的系统指令规范 AI 的代码生成行为，确保输出高质量、可维护的代码。

## Tech Stack
- **核心格式**: Markdown（指令文件、文档）
- **前端标记**: YAML front matter（元数据标记）
- **脚本**: Bash（setup.sh 配置脚本）
- **目标平台**: GitHub Copilot, Claude Code, 及其他 AI 编程助手

## Project Conventions

### Code Style
- Markdown 文件使用结构化的章节层次（H1-H4）
- 中英文混用规范：技术术语保持英文，用户交流使用中文
- 每个指令文件包含 YAML front matter（description, tags, applyTo, compatibility）

### Architecture Patterns
- **模块化设计**: 每个指令文件有独立的职责域
- **人机协作模型**: 人类设定方向与目标，AI 执行任务与遵循指令
- **工作流集成**: 从想法分析到实现的完整开发生命周期

### Testing Strategy
- 本项目无传统代码测试；验证方式为：
  - 在目标 AI 平台（Copilot/Claude Code）中加载指令后验证行为
  - 通过 `openspec validate` 验证 spec 格式正确性

### Git Workflow
- 主分支: `main`
- Commit 格式: Conventional Commits
- PR 模板: 包含 Summary 和 Test plan

## Domain Context
- **指令框架**: 用于约束 AI 行为的系统提示/知识库
- **核心思维原则**: 系统思维、辩证思维、创新思维、批判思维
- **质量标准**: SOLID、DRY、代码异味识别与反模式规避
- **TDD 工作流**: Red-Green-Refactor 循环

## Important Constraints
- 不生成传统构建/测试命令——这是文档驱动项目
- 保持简洁，避免不必要的冗长
- 技术术语始终使用英文
- 遵循 quality-standards.md 中的质量标准

## External Dependencies
- **Claude Code CLI**: 用于环境配置和 slash 命令
- **VS Code + GitHub Copilot**: 主要目标平台
- **OpenSpec CLI**: spec-driven development 工作流
