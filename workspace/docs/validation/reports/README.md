# 驗證報告輸出目錄

此目錄用於存儲驗證系統生成的報告。

## 報告類型

- `validation-summary-YYYYMMDD.md` - 每日驗證摘要報告
- `anomaly-detection-log.json` - 異常檢測日誌
- `auto-fix-proposals.yaml` - 自動修復建議

## 報告格式

### 驗證摘要 (Markdown)

```markdown
# 驗證摘要報告 - YYYY-MM-DD

## 總覽
- 總驗證數: X
- 通過數: X
- 失敗數: X
- 警告數: X

## 詳細結果
...
```

### 異常檢測日誌 (JSON)

```json
{
  "timestamp": "2026-01-05T22:34:17Z",
  "anomalies": [
    {
      "type": "coherence_drift",
      "severity": "warning",
      "details": "..."
    }
  ]
}
```

## 保留策略

- 報告文件保留 30 天
- 重要報告可標記為長期保留

## 訪問方式

```bash
# 查看最新報告
ls -la reports/

# 使用 axiom-cli 查看
axiom-cli validation reports list
```
