# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个 AI 编程助手指令框架项目，专为训练和优化 GitHub Copilot 等 AI 代码助手而设计。项目包含一套完整的系统指令，用于规范 AI 的代码生成行为，确保输出高质量、可维护的代码。

## Project Structure

- `.github/instructions/` - 核心指令文件，定义 AI 助手的行为准则和工作流程
- `claude-config/setup.sh` - Claude Code 环境配置脚本
- `README.md` - 项目说明文档（中文主版本）
- `README.en.md` - 英文版说明文档
- `README.guwen.md` - 古文版说明文档

## Core Framework Components

### 基础原则文件
- `foundational-principles.md` - 核心思维原则和框架概述
- `quality-standards.md` - 代码质量标准和反模式指南
- `programming-workflow.md` - 测试驱动开发(TDD)工作流程
- `testing-guidelines.md` - 测试设计和实现准则

### 专业化工作流
- `planning-workflow.md` - 从想法到实现计划的结构化流程
- `ba.md` - 业务分析师协作工具
- `memory-bank.instructions.md` - 知识持久化跨会话管理
- `response-and-prompt-guidelines.md` - 结构化交互和通信协议

### 高级工具
- `sequential-thinking.md` - `sequentialthinking` MCP 工具使用指南
- `shortcut-system-instruction.md` - 快捷命令定义系统

## Development Setup

这个项目主要是文档驱动的指令框架，不需要传统的构建过程。如需设置 Claude Code 环境：

```bash
# 运行配置脚本
./claude-config/setup.sh
```

该脚本会：
- 检查 Claude Code CLI 环境
- 创建必要的目录结构
- 验证配置文件完整性
- 生成使用指南

## Key Architecture Patterns

### 指令模块化设计
每个指令文件都有独立的职责域：
- **foundational-principles.md**: 定义核心思维原则（系统思维、辩证思维、创新思维、批判思维）
- **quality-standards.md**: 强制执行 SOLID、DRY 原则，识别和避免代码异味
- **programming-workflow.md**: 实施严格的 TDD 循环（Red-Green-Refactor）

### 人机协作模型
项目基于明确的分工原则：
- **人类**: 设定方向、定义目标、提供监督、做最终决策
- **AI 助手**: 执行任务、生成输出、严格遵循指令框架

### 工作流集成
所有指令文件形成一个集成系统，支持从概念到实现的完整开发生命周期：
1. 想法分析（planning-workflow.md）
2. 需求细化（ba.md）
3. 测试驱动开发（programming-workflow.md + testing-guidelines.md）
4. 质量保证（quality-standards.md）
5. 知识持久化（memory-bank.instructions.md）

## File Organization Principles

### 标记系统
每个指令文件都包含 YAML frontmatter，定义：
- `description`: 文件功能描述
- `tags`: 分类标签
- `applyTo`: 适用范围
- `compatibility`: 兼容的 AI 平台

### 文档结构标准
- 使用结构化的 Markdown 格式
- 遵循明确的章节层次（H1-H4）
- 包含具体的实施指南和示例
- 提供跨文件引用和依赖关系

## Quality Standards

### 代码质量要求
严格遵循 `quality-standards.md` 中定义的标准：
- SOLID 原则实施
- DRY 原则遵循
- 避免常见代码异味（大型组件、特性嫉妒、散弹式修改等）
- 杜绝反模式（硬编码值、过早优化、重复造轮子等）

### 测试标准
按照 `testing-guidelines.md` 要求：
- 全面覆盖（正面、负面、边界情况）
- 测试独立性和可维护性
- 使用结构化列表格式描述测试用例
- 避免测试私有方法或静态方法

## Communication Standards

### 语言使用规范
- **内部推理**: 英语
- **用户交流**: 中文（根据用户偏好）
- **技术术语**: 始终保持英语

### 响应质量要求
- **简洁性**: 避免不必要的冗长
- **洞察力**: 提供有价值、可操作的见解
- **精确性**: 使用具体、准确的语言
- **专业性**: 保持高质量的呈现标准