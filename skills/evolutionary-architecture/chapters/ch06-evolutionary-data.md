# Chapter 6: Evolutionary Data

## Core Idea
Data 是架构中的一个维度，而且它带来的问题往往比 technical coupling 更棘手。Evolutionary database design 要求团队像对待 source code 一样对待 schema change：可测试、可版本化、并且以增量方式推进。2nd edition（Pramod Sadalage 作为 4th 作者加入）新增 "From Native to Fitness Function" 节，讨论拆分数据边界时，如何用 fitness functions 保护原本由数据库原生机制提供的完整性。

## Frameworks Introduced
- **Evolutionary Database Design**: 数据库 schema 要与代码一起演进，依靠 migration tools 推进，而不是手工更新。
  - When to use: 任何 data structure 会随时间变化的系统
  - How: 使用 migration tools → 编写 delta scripts → 通过 deployment pipeline 应用

- **Database Migration Tools**: 这类工具会把增量 schema change 作为 pipeline 的一部分自动应用。Migrations 一旦运行就应视为 immutable（double-entry bookkeeping model）。
  - When to use: 永远都该使用 —— 用它替代手工 schema update
  - How: 编写 delta SQL → 由工具执行 → 永远不要修改历史 migrations → 若要回退，就写新的 migration

- **Expand/Contract Pattern**: 一种 database refactoring 技术，在过渡期同时保留 old 和 new 两种 schema 状态，让依赖系统可以逐步迁移。
  - When to use: 当 database schema 变更会影响其他依赖系统时
  - How: Expand（增加新 columns/tables）→ 迁移数据 → 通过 triggers 同时维护两边 → 等待 consumers 迁移完成 → contract（删除旧结构）

- **Shared Database Integration**: 把 relational database 当作多个应用之间的 integration mechanism，会让所有共享方共同把 schema 固化住。
  - When to avoid: 当应用需要独立演进时
  - How to escape: 改成 message-based integration，并让每个 service 拥有自己的 database

- **From Native to Fitness Function** (2nd ed 新增): 当 database decomposition 让原生约束无法跨边界工作时，用 fitness functions 持续验证完整性，而不是笼统替换所有数据库机制。
  - Referential integrity → 事件驱动同步后，以 FF 验证相关数据仍一致
  - Data duplication → 可用 in-process caching 降低跨服务调用，但需按具体一致性需求验证
  - Triggers/stored procedures → 通过 Migrate Method from Database 与 Strangler Fig 渐进迁移
  - When to use: 从共享数据库迁移到独立数据库时
  - How: 识别跨新边界失效的原生保证 → 建立替代机制与 FF → 验证完整性 → 再移除旧机制

- **Inappropriate Data Entanglement** (2nd ed 新增): 不同 architectural quanta 因共享数据或 transactional coupling 而无法独立演进。
  - When to use: 评估数据耦合是否阻碍 service 拆分

- **Evolving from Relational to Nonrelational** (2nd ed 新增): 当 data characteristics 改变时，可渐进迁移到更适合的数据存储；具体迁移路径取决于现有 schema、integrators 与一致性要求。
  - When to use: 当关系型约束成为演进瓶颈时

## Key Concepts
- **Parallel Change**: 这是 Expand/Contract 所实现的更一般模式 —— 用安全方式推进 interface 的 backward-incompatible change
- **Two-Phase Commit Transactions**: Transactional coupling 像 strong nuclear force 一样把组件绑在一起；迁移到 services 时，这是最难拆解的 coupling
- **Undo Migrations**: 有些工具支持 backward migrations —— 但大多数团队最后放弃了这条路，转而选择继续向前构建
- **Age and Quality of Data**: Legacy data 会把架构绑在过去 —— 不愿 refactor schema 或清理旧数据，本质上就是给 evolution 持续交税
- **Fossilized Schemas** (2nd ed): 长期不演进的 schema 会积累历史结构与 join tables，使新需求持续受旧模型约束
- **Data Teams and Vendor Lock-in** (2nd ed): 专门化数据团队与厂商工具可能形成组织和技术耦合；是否使用 vendor-specific features 必须权衡演进成本

## Mental Models
- 把 database migrations 想成 **double-entry bookkeeping** —— 一旦记账就不修改；如果要纠正，追加一笔新记录
- 把 **expand/contract transition** 当成所有 backward-incompatible interface change 的通用模式
- 把 transactions 想成 **strong nuclear force** —— 它比 code coupling 更强力地把 quanta 绑在一起
- 牢记 **"data is an abstraction of the real world"** —— 真实世界变了，抽象也必须跟着变，否则就会退化

## Worked Example
**Expand/Contract in action — splitting `name` into `firstname` + `lastname`**:

**Option 3（最复杂也最常见）：已有数据 + 外部集成点**（原书 SQL 示例重构，非原文照搬）
```sql
-- Reconstructed example: 原书 Ch 5 expand/contract pattern 的 SQL 实现
-- 此处为精简重构，保留核心 DDL/DML 结构，非逐行复制原文
-- EXPAND: Add new columns
ALTER TABLE Customer ADD firstname VARCHAR2(60);
ALTER TABLE Customer ADD lastname VARCHAR2(60);

-- Migrate existing data
UPDATE Customer SET firstname = extractfirstname(name);
UPDATE Customer SET lastname = extractlastname(name);

-- Maintain both via trigger during transition
CREATE OR REPLACE TRIGGER SynchronizeName
BEFORE INSERT OR UPDATE ON Customer
FOR EACH ROW
BEGIN
  IF :NEW.Name IS NULL THEN
    :NEW.Name := :NEW.firstname||' '||:NEW.lastname;
  END IF;
  IF :NEW.name IS NOT NULL THEN
    :NEW.firstname := extractfirstname(:NEW.name);
    :NEW.lastname := extractlastname(:NEW.name);
  END IF;
END;

-- CONTRACT: Once all consumers migrated
ALTER TABLE Customer DROP COLUMN name;
```

**PenultimateWidgets routing evolution**: 先是 single table，随后引入新的复杂 table，并用 triggers 保持两边同步；等所有 pages 都迁移后，再删除 old table。这里在数据层应用了同样的 expand/contract pattern，并与 service-level routing change（Ch 7）同步推进。

## Key Takeaways
1. 要像对待 source code 一样对待 database schema：可测试、可版本化、增量演进
2. Migrations 一旦执行就应视为 immutable —— 不要修改历史 migration，修正时写新的
3. Expand/Contract 能在存在 external dependencies 的情况下实现 zero-downtime schema change
4. Transactional coupling 是绑定 architectural quanta 的最强力量 —— 它决定了 service 能被切分到多小
5. 把 shared database 当 integration point 会让 schema fossilize —— 应尽量避免
6. 拒绝 refactor schema 或清理旧数据，本质上是在把架构持续耦合到过去
7. DBA tooling 还落后于 developer tooling —— 但 migration tools 和 Continuous Delivery practices 正在缩小这个差距

## Connects To
- **Ch 5**: Transactional boundaries 定义 quantum size —— service 不能切得比 transactional contexts 更小
- **Ch 7**: Expand/Contract pattern 会与 PenultimateWidgets routing 中的 service-level versioning 一起使用
- **Ch 8**: Reporting antipattern 往往会让 reports 直接耦合到 database schema
- **Ch 5**: Data Mesh 和 Data Product Quantum 提供了去中心化数据架构的拓扑选择
