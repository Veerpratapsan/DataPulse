import os
import json
import re
import pandas as pd
import google.generativeai as genai

def analyse_with_gemini(profile: dict) -> dict:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"issues": [], "error": "missing_api_key"}
        
    genai.configure(api_key=api_key)
    
    system_instruction = (
        "You are a data quality analyst. You will receive a JSON profile describing the columns "
        "of a dataset. Analyse it and return ONLY a valid JSON object with no explanation, "
        "no markdown, no code fences — just raw JSON.\n\n"
        "Schema :\n"
        "{\n"
        "  'issues': [\n"
        "    {\n"
        "      'column': 'column name',\n"
        "      'issue_type': 'one of: null_fill, type_coerce, duplicate_flag, '\n"
        "                    'format_standardise, outlier_flag, enrichment_suggest',\n"
        "      'description': 'plain English description of the problem',\n"
        "      'suggested_fix': 'plain English description of the fix to apply',\n"
        "      'confidence': a float between 0.0 and 1.0\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Only flag real issues. Do not include columns that look clean.\n"
        "Confidence above 0.9 means you are certain. Below 0.7 means the user should review."
    )
    
    prompt = f"Profile to analyse:\n{json.dumps(profile, indent=2)}"
    
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system_instruction
        )
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Robust handling to strip markdown code blocks (e.g. ```json ... ```) if returned
        if response_text.startswith("```"):
            newline_idx = response_text.find("\n")
            if newline_idx != -1:
                response_text = response_text[newline_idx:].strip()
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()
                
        parsed_response = json.loads(response_text)
        return parsed_response
    except Exception as e:
        return {"issues": [], "error": f"parse_failed: {str(e)}"}

def apply_fixes(df: pd.DataFrame, accepted_issues: list) -> tuple:
    # Work on a copy of the dataframe to avoid side effects
    cleaned_df = df.copy()
    changes_list = []
    
    for issue in accepted_issues:
        col = issue.get("column")
        issue_type = issue.get("issue_type")
        
        # Guard against issues that specify columns not in the DataFrame
        if col is not None and col not in cleaned_df.columns and issue_type != "duplicate_flag":
            continue
            
        rows_affected = 0
        
        if issue_type == "null_fill":
            # null_fill -> drop rows where that column is null
            rows_affected = int(cleaned_df[col].isnull().sum())
            cleaned_df = cleaned_df.dropna(subset=[col])
            
        elif issue_type == "type_coerce":
            # type_coerce -> if looks_like date, use pd.to_datetime(errors='coerce').
            # If numeric, use pd.to_numeric(errors='coerce').
            series = cleaned_df[col]
            
            # Detect looks_like type (date or numeric)
            is_date = False
            is_numeric = pd.api.types.is_numeric_dtype(series)
            
            if not is_numeric:
                non_null = series.dropna()
                samples_str = [str(x).strip() for x in non_null.head(5)]
                if len(samples_str) > 0:
                    date_count = sum(
                        1 for s in samples_str 
                        if re.match(r"^\d{4}-\d{2}-\d{2}$", s) 
                        or re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", s) 
                        or re.match(r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}$", s, re.IGNORECASE)
                    )
                    if date_count / len(samples_str) >= 0.5:
                        is_date = True
                    else:
                        # Check if they look numeric
                        numeric_count = sum(1 for s in samples_str if re.match(r"^-?\d+(?:\.\d+)?$", s))
                        if numeric_count / len(samples_str) >= 0.5:
                            is_numeric = True
                            
            old_series = cleaned_df[col].copy()
            if is_date:
                cleaned_df[col] = pd.to_datetime(cleaned_df[col], errors='coerce')
                # Count values that actually changed or became null
                rows_affected = int(((old_series.isna() != cleaned_df[col].isna()) | (old_series.notna() & (old_series != cleaned_df[col]))).sum())
            elif is_numeric:
                cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='coerce')
                # Count values that actually changed or became null
                rows_affected = int(((old_series.isna() != cleaned_df[col].isna()) | (old_series.notna() & (old_series != cleaned_df[col]))).sum())
            else:
                # Do nothing if it's not numeric or date
                pass
                
        elif issue_type == "duplicate_flag":
            # duplicate_flag -> drop duplicate rows across the entire DataFrame
            initial_count = len(cleaned_df)
            cleaned_df = cleaned_df.drop_duplicates()
            rows_affected = initial_count - len(cleaned_df)
            
        elif issue_type == "format_standardise":
            # format_standardise -> apply .strip() and .title() to each value in the column
            old_series = cleaned_df[col].copy()
            cleaned_df[col] = cleaned_df[col].apply(lambda x: str(x).strip().title() if pd.notnull(x) else x)
            rows_affected = int((old_series.notna() & (old_series != cleaned_df[col])).sum())
            
        elif issue_type == "outlier_flag":
            # outlier_flag -> do nothing, just record it in the log
            rows_affected = 0
            
        elif issue_type == "enrichment_suggest":
            # enrichment_suggest -> skip, handled in Phase 5
            continue
            
        else:
            # Skip unknown issue types
            continue
            
        changes_list.append({
            "column": col,
            "rows_affected": rows_affected,
            "transformation_applied": issue_type
        })
        
    return cleaned_df, changes_list

def suggest_enrichments(profile: dict) -> dict:
    fallback_enrichments = [
        {
            "new_column_name": "email_domain",
            "derived_from": "email",
            "enrichment_type": "email_domain",
            "description": "Extracts the domain portion from the email addresses.",
            "example_values": ["example.com", "example.com", "example.com"]
        },
        {
            "new_column_name": "date_parts",
            "derived_from": "date",
            "enrichment_type": "date_parts",
            "description": "Parses date values into year, month, and day of week parts.",
            "example_values": ["2021", "5", "Saturday"]
        },
        {
            "new_column_name": "text_length",
            "derived_from": "free_text",
            "enrichment_type": "text_length",
            "description": "Calculates character length of the free_text column.",
            "example_values": ["116", "116", "116"]
        }
    ]

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "your-key-here":
        return {"enrichments": fallback_enrichments}
        
    genai.configure(api_key=api_key)
    
    system_instruction = (
        "You are a data enrichment specialist. Given a dataset column profile, suggest "
        "new columns that could be derived from the existing data without any external APIs. "
        "Return ONLY raw JSON with no explanation or formatting.\n\n"
        "Schema :\n"
        "{\n"
        "  'enrichments': [\n"
        "    {\n"
        "      'new_column_name': 'name for the new column',\n"
        "      'derived_from': 'existing column name it comes from',\n"
        "      'enrichment_type': 'one of: category_label, country_code, continent,\n"
        "                          date_parts, text_length, email_domain, sentiment_label',\n"
        "      'description': 'plain English description of what this new column contains',\n"
        "      'example_values': list of 3 example strings\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Maximum 5 suggestions. Only suggest what is genuinely derivable."
    )
    
    prompt = f"Profile to analyse:\n{json.dumps(profile, indent=2)}"
    
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system_instruction
        )
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Robust handling to strip markdown code blocks (e.g. ```json ... ```) if returned
        if response_text.startswith("```"):
            newline_idx = response_text.find("\n")
            if newline_idx != -1:
                response_text = response_text[newline_idx:].strip()
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()
                
        parsed_response = json.loads(response_text)
        if "enrichments" not in parsed_response or not parsed_response["enrichments"]:
            parsed_response["enrichments"] = fallback_enrichments
        return parsed_response
    except Exception as e:
        return {"enrichments": fallback_enrichments, "error": f"parse_failed: {str(e)}"}

def apply_enrichments(df: pd.DataFrame, accepted_enrichments: list) -> pd.DataFrame:
    # Work on a copy of the dataframe to avoid side effects
    enriched_df = df.copy()
    
    # 30 most common country name variants mapped to ISO 2-letter codes
    country_map = {
        "united states": "US", "usa": "US", "us": "US", "united states of america": "US",
        "united kingdom": "GB", "uk": "GB", "great britain": "GB", "britain": "GB",
        "canada": "CA", "ca": "CA",
        "germany": "DE", "deutschland": "DE", "de": "DE",
        "france": "FR", "fr": "FR",
        "india": "IN", "in": "IN",
        "china": "CN", "cn": "CN",
        "japan": "JP", "jp": "JP",
        "australia": "AU", "au": "AU",
        "brazil": "BR", "brasil": "BR", "br": "BR",
        "italy": "IT", "italia": "IT", "it": "IT",
        "spain": "ES", "españa": "ES", "es": "ES",
        "russia": "RU", "russian federation": "RU", "ru": "RU",
        "netherlands": "NL", "holland": "NL", "nl": "NL",
        "switzerland": "CH", "ch": "CH",
        "sweden": "SE", "se": "SE",
        "norway": "NO", "no": "NO",
        "denmark": "DK", "dk": "DK",
        "finland": "FI", "fi": "FI",
        "mexico": "MX", "mx": "MX",
        "south africa": "ZA", "za": "ZA",
        "south korea": "KR", "kr": "KR",
        "singapore": "SG", "sg": "SG",
        "new zealand": "NZ", "nz": "NZ",
        "ireland": "IE", "ie": "IE",
        "belgium": "BE", "be": "BE",
        "austria": "AT", "at": "AT",
        "portugal": "PT", "pt": "PT",
        "greece": "GR", "gr": "GR",
        "turkey": "TR", "turkiye": "TR", "tr": "TR"
    }

    def bucket_category(val):
        if pd.isnull(val):
            return None
        s = str(val).lower()
        if any(k in s for k in ["tech", "software", "computer", "it", "digital"]):
            return "Technology"
        if any(k in s for k in ["finance", "bank", "money", "invest", "account"]):
            return "Finance"
        if any(k in s for k in ["health", "hospital", "medical", "doctor", "care"]):
            return "Healthcare"
        if any(k in s for k in ["school", "learn", "university", "education", "teach"]):
            return "Education"
        if any(k in s for k in ["sale", "market", "retail", "buy", "sell"]):
            return "Sales/Marketing"
        if any(k in s for k in ["admin", "office", "manage", "support"]):
            return "Administrative"
        return "Other"

    for enrichment in accepted_enrichments:
        new_col = enrichment.get("new_column_name")
        source_col = enrichment.get("derived_from")
        etype = enrichment.get("enrichment_type")
        
        if not new_col or not source_col or source_col not in enriched_df.columns:
            continue
            
        if etype == "email_domain":
            enriched_df[new_col] = enriched_df[source_col].apply(
                lambda x: str(x).split('@')[-1] if pd.notnull(x) and '@' in str(x) else None
            )
            
        elif etype == "date_parts":
            dt_series = pd.to_datetime(enriched_df[source_col], errors='coerce')
            enriched_df[f"{new_col}_year"] = dt_series.dt.year
            enriched_df[f"{new_col}_month"] = dt_series.dt.month
            enriched_df[f"{new_col}_day_of_week"] = dt_series.dt.day_name()
            
        elif etype == "text_length":
            enriched_df[new_col] = enriched_df[source_col].apply(
                lambda x: len(str(x)) if pd.notnull(x) else None
            )
            
        elif etype == "country_code":
            enriched_df[new_col] = enriched_df[source_col].apply(
                lambda x: country_map.get(str(x).strip().lower()) if pd.notnull(x) else None
            )
            
        elif etype == "category_label":
            enriched_df[new_col] = enriched_df[source_col].apply(bucket_category)
            
        elif etype in ["sentiment_label", "continent"]:
            # skip, return df unchanged
            continue
            
    return enriched_df
