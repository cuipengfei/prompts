#!/bin/bash

# Claude Code AI Instruction Framework Setup Script
# 自动配置 Claude Code 集成环境

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="$PROJECT_ROOT/.claude"

echo "🚀 Claude Code AI Instruction Framework Setup"
echo "============================================="

# 检查 Claude Code 环境
check_claude_code() {
    echo "📋 Checking Claude Code environment..."
    if ! command -v claude &> /dev/null; then
        echo "⚠️  Claude Code CLI not found. Please install Claude Code first."
        echo "   Visit: https://claude.ai/code"
        exit 1
    fi
    echo "✅ Claude Code CLI found"
}

# 创建必要目录
create_directories() {
    echo "📁 Creating directory structure..."
    
    mkdir -p "$CLAUDE_DIR/agents"
    mkdir -p "$CLAUDE_DIR/commands"
    mkdir -p "$CLAUDE_DIR/output-styles"
    
    echo "✅ Directory structure created"
}

# 复制配置文件
install_configs() {
    echo "📦 Installing Claude Code configurations..."
    
    # 检查配置文件是否存在
    if [[ ! -d "$CLAUDE_DIR" ]]; then
        echo "❌ .claude directory not found. Please ensure you're in the correct project directory."
        exit 1
    fi
    
    # 计算配置文件数量
    local agents_count=$(find "$CLAUDE_DIR/agents" -name "*.md" | wc -l)
    local commands_count=$(find "$CLAUDE_DIR/commands" -name "*.md" | wc -l)
    local styles_count=$(find "$CLAUDE_DIR/output-styles" -name "*.md" | wc -l)
    
    echo "   📊 Configuration Summary:"
    echo "      - Sub-agents: $agents_count"
    echo "      - Slash Commands: $commands_count"
    echo "      - Output Styles: $styles_count"
    
    if [[ -f "$CLAUDE_DIR/CLAUDE.md" ]]; then
        echo "      - Memory System: ✅ Ready"
    else
        echo "      - Memory System: ❌ Missing"
        exit 1
    fi
}

# 验证配置
validate_setup() {
    echo "🔍 Validating setup..."
    
    local required_agents=(
        "tdd-coach-agent.md"
        "planning-specialist-agent.md"
        "code-quality-guardian-agent.md"
        "test-architect-agent.md"
        "business-analyst-agent.md"
    )
    
    local required_commands=(
        "improve-prompt.md"
        "tdd.md"
        "plan.md"
        "review.md"
        "ba.md"
        "design.md"
    )
    
    local required_styles=(
        "structured-responder.md"
    )
    
    # 验证 agents
    for agent in "${required_agents[@]}"; do
        if [[ ! -f "$CLAUDE_DIR/agents/$agent" ]]; then
            echo "❌ Missing agent: $agent"
            exit 1
        fi
    done
    
    # 验证 commands
    for command in "${required_commands[@]}"; do
        if [[ ! -f "$CLAUDE_DIR/commands/$command" ]]; then
            echo "❌ Missing command: $command"
            exit 1
        fi
    done
    
    # 验证 output styles
    for style in "${required_styles[@]}"; do
        if [[ ! -f "$CLAUDE_DIR/output-styles/$style" ]]; then
            echo "❌ Missing output style: $style"
            exit 1
        fi
    done
    
    echo "✅ All configurations validated successfully"
}

# 生成使用指南
generate_usage_guide() {
    echo "📖 Generating usage guide..."
    
    cat > "$PROJECT_ROOT/SETUP_COMPLETE.md" << 'EOF'
# Claude Code Setup Complete! 🎉

Your AI Instruction Framework is now ready for use.

## Available Components

### 🤖 Sub-agents (5)
- **TDD Coach**: `/agent:tdd-coach` - Test-driven development expert
- **Planning Specialist**: `/agent:planning-specialist` - Project planning expert
- **Code Quality Guardian**: `/agent:code-quality-guardian` - Code quality expert
- **Test Architect**: `/agent:test-architect` - Testing strategy expert
- **Business Analyst**: `/agent:business-analyst` - Requirements analysis expert

### ⚡ Slash Commands (6)
- `/improve-prompt` - Prompt optimization
- `/tdd` - Start TDD workflow
- `/plan` - Planning workflow
- `/review` - Code quality review
- `/ba` - Business analysis workflow
- `/design` - Technical design specification

### 🎨 Output Styles (1)
- **Structured Responder** - 8-section response format

## Quick Start

1. Use slash commands for quick tasks: `/plan`, `/review`, `/tdd`
2. Call specific agents for complex work: `/agent:planning-specialist`
3. Switch output style for structured responses
4. Access memory system for persistent knowledge

## Next Steps

- Explore each component in the `.claude/` directory
- Customize configurations as needed
- Refer to `CLAUDE.md` for comprehensive documentation

Happy coding with AI! 🚀
EOF

    echo "✅ Usage guide created: SETUP_COMPLETE.md"
}

# 主执行流程
main() {
    check_claude_code
    create_directories
    install_configs
    validate_setup
    generate_usage_guide
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "   ✅ 5 Sub-agents ready"
    echo "   ✅ 7 Slash Commands available"
    echo "   ✅ 1 Output Style configured"
    echo "   ✅ Memory System integrated"
    echo ""
    echo "🚀 You can now use Claude Code with full AI instruction framework!"
    echo "   Read SETUP_COMPLETE.md for usage guide"
}

# 执行主函数
main "$@"