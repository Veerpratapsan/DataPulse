from datetime import datetime

def build_audit_log(filename: str, original_df, cleaned_df, accepted_issues: list, changes_list: list) -> dict:
    processed_at_str = datetime.utcnow().isoformat() + "Z"
    
    changes = []
    for issue in accepted_issues:
        col = issue.get("column")
        issue_type = issue.get("issue_type")
        
        # Find matching change in changes_list
        rows_affected = 0
        for change in changes_list:
            if change.get("column") == col and change.get("transformation_applied") == issue_type:
                rows_affected = change.get("rows_affected", 0)
                break
                
        changes.append({
            "column": col,
            "issue_type": issue_type,
            "description": issue.get("description"),
            "suggested_fix": issue.get("suggested_fix"),
            "rows_affected": rows_affected,
            "confidence": issue.get("confidence")
        })
        
    return {
        "file": filename,
        "processed_at": processed_at_str,
        "rows_input": len(original_df),
        "rows_output": len(cleaned_df),
        "changes": changes
    }
