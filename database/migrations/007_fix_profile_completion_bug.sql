-- Migration: Fix Profile Completion Calculation Bug
-- Description: Fix all DEFAULT values that cause false completion percentages
-- This ensures profile completion is 0% when nothing is actually filled

-- 1. Fix existing boolean fields with FALSE defaults
UPDATE student_extended_profiles
SET
    physically_handicapped = NULL,
    interested_in_btech = NULL,
    interested_in_mtech = NULL
WHERE
    physically_handicapped = false
    OR interested_in_btech = false
    OR interested_in_mtech = false;

-- 2. Fix siblings_count default (0 should be NULL if not set)
-- We'll keep the actual value but this helps identify unfilled profiles
-- Note: We can't set to NULL if it's 0 because 0 might be a legitimate value
-- Instead, we'll fix the calculation function

-- 3. Alter default values to NULL instead of FALSE for future records
ALTER TABLE student_extended_profiles
    ALTER COLUMN physically_handicapped SET DEFAULT NULL,
    ALTER COLUMN interested_in_btech SET DEFAULT NULL,
    ALTER COLUMN interested_in_mtech SET DEFAULT NULL,
    ALTER COLUMN siblings_count DROP DEFAULT;

-- 4. Update the profile completion calculation function
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_student_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_completion INTEGER;
    v_total_fields INTEGER := 0;
    v_filled_fields INTEGER := 0;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile
    FROM student_extended_profiles
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Academic Extended (5 fields)
    v_total_fields := v_total_fields + 5;
    IF v_profile.sslc_marks IS NOT NULL AND v_profile.sslc_marks > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.sslc_year IS NOT NULL AND v_profile.sslc_year > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.sslc_board IS NOT NULL AND v_profile.sslc_board != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.twelfth_marks IS NOT NULL AND v_profile.twelfth_marks > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.twelfth_year IS NOT NULL AND v_profile.twelfth_year > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Physical Details (3 fields)
    v_total_fields := v_total_fields + 3;
    IF v_profile.height_cm IS NOT NULL AND v_profile.height_cm > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.weight_kg IS NOT NULL AND v_profile.weight_kg > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.physically_handicapped IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Personal Details (3 fields)
    v_total_fields := v_total_fields + 3;
    IF v_profile.district IS NOT NULL AND v_profile.district != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.permanent_address IS NOT NULL AND v_profile.permanent_address != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.interests_hobbies IS NOT NULL AND v_profile.interests_hobbies != '' THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Family Details (8 fields)
    v_total_fields := v_total_fields + 8;
    IF v_profile.father_name IS NOT NULL AND v_profile.father_name != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.father_occupation IS NOT NULL AND v_profile.father_occupation != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.father_annual_income IS NOT NULL AND v_profile.father_annual_income > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.mother_name IS NOT NULL AND v_profile.mother_name != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.mother_occupation IS NOT NULL AND v_profile.mother_occupation != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.mother_annual_income IS NOT NULL AND v_profile.mother_annual_income > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.siblings_count IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.siblings_details IS NOT NULL AND v_profile.siblings_details != '' THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Document Status (6 fields) - Only count if explicitly set to TRUE
    v_total_fields := v_total_fields + 6;
    IF v_profile.has_pan_card = TRUE THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.pan_number IS NOT NULL AND v_profile.pan_number != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.has_aadhar_card = TRUE THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.aadhar_number IS NOT NULL AND v_profile.aadhar_number != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.has_passport = TRUE THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.passport_number IS NOT NULL AND v_profile.passport_number != '' THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Education Preferences (3 fields) - Only count if explicitly set to TRUE
    v_total_fields := v_total_fields + 3;
    IF v_profile.interested_in_btech = TRUE THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.interested_in_mtech = TRUE THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.preferred_study_mode IS NOT NULL AND v_profile.preferred_study_mode != '' THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Calculate percentage
    IF v_total_fields > 0 THEN
        v_completion := ROUND((v_filled_fields::DECIMAL / v_total_fields::DECIMAL) * 100);
    ELSE
        v_completion := 0;
    END IF;

    -- Update the profile completion percentage
    UPDATE student_extended_profiles
    SET profile_completion_percentage = v_completion
    WHERE student_id = p_student_id;

    RETURN v_completion;
END;
$$ LANGUAGE plpgsql;

-- 5. Recalculate profile completion for ALL students
DO $$
DECLARE
    student_record RECORD;
BEGIN
    FOR student_record IN SELECT id FROM students LOOP
        PERFORM calculate_profile_completion(student_record.id);
    END LOOP;
END $$;

-- Add comments
COMMENT ON FUNCTION calculate_profile_completion IS 'Calculates profile completion percentage - counts only truly filled fields (not defaults)';
