import json

log_path = "/Users/mikevaz/.gemini/antigravity-ide/brain/3c061aae-080e-4173-9742-1b0ea053b251/.system_generated/logs/transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        obj = json.loads(line)
        if obj.get("type") == "PLANNER_RESPONSE":
            tool_calls = obj.get("tool_calls", [])
            for tc in tool_calls:
                if tc.get("name") == "multi_replace_file_content":
                    print(f"=== STEP INDEX: {obj.get('step_index')} ===")
                    print(json.dumps(tc.get("args"), indent=2))
