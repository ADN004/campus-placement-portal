-- Migration: Create job_request_requirement_templates table
-- This allows placement officers to specify extended requirements when creating job requests
-- which will be copied to job_requirement_templates when the request is approved

CREATE TABLE IF NOT EXISTS job_request_requirement_templates (
    id SERIAL PRIMARY KEY,
    job_request_id INTEGER NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,

    -- Tier 1 Requirements (always included, but can specify specific validations)
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB DEFAULT '[]'::jsonb, -- Array of allowed branches

    -- Tier 2 Requirements (optional extended profile fields)
    requires_academic_extended BOOLEAN DEFAULT FALSE,
    requires_physical_details BOOLEAN DEFAULT FALSE,
    requires_family_details BOOLEAN DEFAULT FALSE,
    requires_personal_details BOOLEAN DEFAULT FALSE,
    requires_document_verification BOOLEAN DEFAULT FALSE,
    requires_education_preferences BOOLEAN DEFAULT FALSE,

    -- Specific field requirements (JSON for granular control)
    specific_field_requirements JSONB DEFAULT '{}'::jsonb,
    /* Example:
    {
        "height_cm": {"required": true, "min": 155},
        "weight_kg": {"required": true, "min": 45},
        "sslc_marks": {"required": true, "min": 60},
        "has_pan_card": {"required": true},
        "interested_in_btech": {"required": true}
    }
    */

    -- Custom company-specific fields
    custom_fields JSONB DEFAULT '[]'::jsonb,
    /* Example:
    [
        {
            "field_name": "sitttr_internship_applied",
            "field_label": "Have you applied for SITTTR internship?",
            "field_type": "boolean",
            "required": true,
            "options": null
        },
        {
            "field_name": "regional_preference",
            "field_label": "Regional Preference",
            "field_type": "select",
            "required": false,
            "options": ["North", "South", "Central"]
        }
    ]
    */

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index to ensure only one requirement template per job request
CREATE UNIQUE INDEX idx_job_request_requirements_unique ON job_request_requirement_templates(job_request_id);

-- Create index for faster lookups
CREATE INDEX idx_job_request_requirements_job_request ON job_request_requirement_templates(job_request_id);

-- Add comment
COMMENT ON TABLE job_request_requirement_templates IS 'Stores extended requirements for job requests before they are approved and converted to jobs';
