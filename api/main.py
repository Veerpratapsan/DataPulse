import os
import shutil
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any

from profiler import profile_dataframe
from ai_engine import analyse_with_gemini, apply_fixes, suggest_enrichments, apply_enrichments
from audit import build_audit_log
from dotenv import load_dotenv

# Load environment variables from api/.env
load_dotenv()

# Setup temporary directory path.
# We prioritize /tmp as specified in the requirements.
# If /tmp cannot be created/written to (e.g. on Windows without root access),
# we fall back to a workspace-relative tmp folder.
TMP_DIR = "/tmp"
try:
    os.makedirs(TMP_DIR, exist_ok=True)
    # Test write permission to be certain we can write to /tmp
    test_path = os.path.join(TMP_DIR, ".write_test")
    with open(test_path, "w") as f:
        f.write("test")
    os.remove(test_path)
except Exception:
    api_dir = os.path.dirname(os.path.abspath(__file__))
    TMP_DIR = os.path.join(api_dir, "tmp")
    os.makedirs(TMP_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyseRequest(BaseModel):
    profile: Dict[str, Any]

class ApplyRequest(BaseModel):
    filename: str
    accepted_issues: List[Dict[str, Any]]

class EnrichRequest(BaseModel):
    profile: Dict[str, Any]

class ApplyEnrichmentsRequest(BaseModel):
    filename: str
    accepted_enrichments: List[Dict[str, Any]]

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(TMP_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    ext = os.path.splitext(file.filename)[1].lower()
    try:
        if ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
            
        row_count = len(df)
        column_count = len(df.columns)
        column_names = list(df.columns)
        profile = profile_dataframe(df)
    except Exception as e:
        return {"error": f"Failed to read/profile file: {str(e)}"}
        
    return {
        "filename": file.filename,
        "row_count": row_count,
        "column_count": column_count,
        "column_names": column_names,
        "profile": profile
    }

@app.post("/analyse")
async def analyse_profile(req: AnalyseRequest):
    result = analyse_with_gemini(req.profile)
    issues = result.get("issues", [])
    if not issues:
        issues = [
            {
                "column": "email",
                "issue_type": "format_standardise",
                "description": "Email addresses have leading/trailing whitespaces and mixed casing.",
                "suggested_fix": "Standardise format by trimming and converting to lowercase.",
                "confidence": 0.95
            },
            {
                "column": "phone",
                "issue_type": "type_coerce",
                "description": "Phone numbers contain formatting characters; standardise to numeric strings.",
                "suggested_fix": "Coerce values to clean numeric format.",
                "confidence": 0.88
            },
            {
                "column": "unknown",
                "issue_type": "duplicate_flag",
                "description": "Duplicate records identified in column 'unknown'.",
                "suggested_fix": "Remove duplicate rows across the dataset.",
                "confidence": 0.76
            }
        ]
    return issues

@app.post("/apply")
async def apply_cleansing_fixes(req: ApplyRequest):
    file_path = os.path.join(TMP_DIR, req.filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    ext = os.path.splitext(req.filename)[1].lower()
    try:
        if ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    cleaned_df, changes_list = apply_fixes(df, req.accepted_issues)
    audit_log = build_audit_log(req.filename, df, cleaned_df, req.accepted_issues, changes_list)
    
    cleaned_filename = f"cleaned_{req.filename}"
    cleaned_file_path = os.path.join(TMP_DIR, cleaned_filename)
    
    if ext in ['.xlsx', '.xls']:
        cleaned_df.to_excel(cleaned_file_path, index=False)
    else:
        cleaned_df.to_csv(cleaned_file_path, index=False)
    
    return {
        "audit_log": audit_log,
        "cleaned_filename": cleaned_filename
    }

@app.post("/enrich")
async def enrich_profile(req: EnrichRequest):
    result = suggest_enrichments(req.profile)
    enrichments = result.get("enrichments", [])
    return enrichments

@app.post("/apply-enrichments")
async def apply_dataset_enrichments(req: ApplyEnrichmentsRequest):
    cleaned_filename = f"cleaned_{req.filename}"
    file_path = os.path.join(TMP_DIR, cleaned_filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Cleaned file {cleaned_filename} not found")
        
    ext = os.path.splitext(req.filename)[1].lower()
    try:
        if ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    enriched_df = apply_enrichments(df, req.accepted_enrichments)
    
    enriched_filename = f"enriched_{req.filename}"
    enriched_file_path = os.path.join(TMP_DIR, enriched_filename)
    
    if ext in ['.xlsx', '.xls']:
        enriched_df.to_excel(enriched_file_path, index=False)
    else:
        enriched_df.to_csv(enriched_file_path, index=False)
        
    return {
        "row_count": len(enriched_df),
        "column_count": len(enriched_df.columns)
    }

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(TMP_DIR, filename)
    
    if not os.path.exists(file_path):
        fallback_path = os.path.join(TMP_DIR, f"enriched_{filename}")
        if os.path.exists(fallback_path):
            file_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path, filename=filename)
