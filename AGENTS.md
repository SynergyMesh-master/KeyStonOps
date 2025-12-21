# AGENTS 状态标记规范

本文件记录所有 AI 代理在项目中使用的状态标记（Status Marker）的约定。

## 状态标记
- ✅ (check mark): 表示任务或检查项已完成。
- ⏸️ (double vertical bar): 表示任务被暂停、中断或被阻止。
- 🔄 (arrows clockwise): 表示任务正在进行或循环中。
- ❌ (cross mark): 表示任务失败、被拒绝或错误。
- ⏭️ (next track button): 表示任务已跳过。

## 使用原则
1. 每个任务或待办事项前必须使用一个状态标记。
2. 状态标记应在任务描述的同一行，位于最开始位置。
3. 所有报告、清单和交付物必须遵循此规范。
4. 状态标记与任务状态必须保持逻辑一致性：
   - 若任务受阻，所有相关审核项都应标记为 ⏸️
   - 若任务进行中，相关审核项可标记为 🔄 或空白
   - 若任务完成，所有相关审核项都应标记为 ✅
   - 若任务失败，所有相关审核项都应标记为 ❌

## PR模板规范
- 使用标准化状态标记：✅ (Complete), ⏸️ (Blocked), 🔄 (In Progress), ❌ (Failed), ⏭️ (Skipped)
- 确保状态与清单进度一致：status ≡ checklist progress
- 所有变更必须先更新治理文件再实施

## 证据链要求
- CHANGELOG.md: 记录所有变更历史
- RISK_ASSESSMENT.md: 评估变更风险
- AGENT_DELIVERY_CONTRACT.md: 遵循交付契约
- 所有PR必须提供四大核心证据：repo, branch, commit, PR

## 移动端友善性

- 重要配置文件必须可见且易访问
- 目录深度合理化，避免过深嵌套
- 提供长按复制链接快速验证功能