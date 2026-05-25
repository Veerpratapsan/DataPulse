import re
import pandas as pd

def profile_dataframe(df):
    row_count = len(df)
    column_count = len(df.columns)
    columns_profile = {}

    for col in df.columns:
        series = df[col]
        
        # Get dtype name
        dtype_str = str(series.dtype)
        
        # Null count and percent
        null_count = int(series.isnull().sum())
        null_percent = round((null_count / row_count) * 100, 2) if row_count > 0 else 0.00
        
        # Unique count
        unique_count = int(series.nunique())
        
        # Samples (up to 5 non-null values as strings)
        non_null_series = series.dropna()
        samples = non_null_series.head(5).tolist()
        samples_str = [str(x) for x in samples]
        
        # Determine looks_like classification
        looks_like = "unknown"
        
        if len(samples_str) > 0:
            # Check email
            email_count = sum(1 for s in samples_str if re.search(r"@.*\.", s))
            # Check url
            url_count = sum(1 for s in samples_str if re.match(r"^(?:https?://|www\.)", s, re.IGNORECASE))
            # Check date
            date_count = sum(
                1 for s in samples_str 
                if re.match(r"^\d{4}-\d{2}-\d{2}$", s) 
                or re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", s) 
                or re.match(r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}$", s, re.IGNORECASE)
            )
            # Check phone
            phone_count = sum(
                1 for s in samples_str 
                if re.match(r"^[+\s\-\(\)\d]+$", s) 
                and sum(c.isdigit() for c in s) >= max(5, len(s) * 0.5)
            )
            
            if email_count / len(samples_str) >= 0.5:
                looks_like = "email"
            elif url_count / len(samples_str) >= 0.5:
                looks_like = "url"
            elif date_count / len(samples_str) >= 0.5:
                looks_like = "date"
            elif phone_count / len(samples_str) >= 0.5:
                looks_like = "phone"
                
        # If looks_like is still unknown, check numeric, free_text, categorical
        if looks_like == "unknown":
            is_numeric = pd.api.types.is_numeric_dtype(series)
            if is_numeric:
                looks_like = "numeric"
            else:
                avg_len = non_null_series.astype(str).str.len().mean() if len(non_null_series) > 0 else 0
                if avg_len > 50:
                    looks_like = "free_text"
                elif unique_count < 0.10 * row_count:
                    looks_like = "categorical"
                    
        columns_profile[str(col)] = {
            "dtype": dtype_str,
            "null_count": null_count,
            "null_percent": null_percent,
            "unique_count": unique_count,
            "samples": samples_str,
            "looks_like": looks_like
        }
        
    return {
        "row_count": row_count,
        "column_count": column_count,
        "columns": columns_profile
    }
