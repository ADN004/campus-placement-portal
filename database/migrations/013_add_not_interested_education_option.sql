-- Migration 013: Add "Not Interested" option to education preferences

-- Add not_interested_in_higher_education column
ALTER TABLE student_extended_profiles
ADD COLUMN IF NOT EXISTS not_interested_in_higher_education BOOLEAN DEFAULT FALSE;

-- Update the profile completion function to handle "not interested" option
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_student_id integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_completion INTEGER;
    v_total_sections INTEGER := 6;
    v_completed_sections INTEGER := 0;
    v_profile RECORD;
    v_student RECORD;

    -- Section completion flags
    v_academic_complete BOOLEAN := FALSE;
    v_physical_complete BOOLEAN := FALSE;
    v_personal_complete BOOLEAN := FALSE;
    v_family_complete BOOLEAN := FALSE;
    v_document_complete BOOLEAN := FALSE;
    v_education_complete BOOLEAN := FALSE;

    -- Section percentages
    v_academic_pct INTEGER := 0;
    v_physical_pct INTEGER := 0;
    v_personal_pct INTEGER := 0;
    v_family_pct INTEGER := 0;
    v_document_pct INTEGER := 0;
    v_education_pct INTEGER := 0;
BEGIN
    SELECT * INTO v_profile FROM student_extended_profiles WHERE student_id = p_student_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    SELECT * INTO v_student FROM students WHERE id = p_student_id;

    -- 1. ACADEMIC EXTENDED SECTION (5 fields)
    DECLARE
        v_academic_filled INTEGER := 0;
        v_academic_total INTEGER := 5;
    BEGIN
        IF v_profile.sslc_marks IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.sslc_year IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.sslc_board IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.twelfth_marks IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.twelfth_year IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;

        v_academic_pct := ROUND((v_academic_filled::DECIMAL / v_academic_total::DECIMAL) * 100);
        v_academic_complete := v_academic_filled > 0;
    END;

    -- 2. PHYSICAL DETAILS SECTION (3 fields)
    DECLARE
        v_physical_filled INTEGER := 0;
        v_physical_total INTEGER := 3;
    BEGIN
        IF COALESCE(v_profile.height_cm, v_student.height) IS NOT NULL THEN v_physical_filled := v_physical_filled + 1; END IF;
        IF COALESCE(v_profile.weight_kg, v_student.weight) IS NOT NULL THEN v_physical_filled := v_physical_filled + 1; END IF;
        IF v_profile.physically_handicapped IS NOT NULL THEN v_physical_filled := v_physical_filled + 1; END IF;

        v_physical_pct := ROUND((v_physical_filled::DECIMAL / v_physical_total::DECIMAL) * 100);
        v_physical_complete := v_physical_filled > 0;
    END;

    -- 3. PERSONAL DETAILS SECTION (3 fields)
    DECLARE
        v_personal_filled INTEGER := 0;
        v_personal_total INTEGER := 3;
    BEGIN
        IF v_profile.district IS NOT NULL THEN v_personal_filled := v_personal_filled + 1; END IF;
        IF COALESCE(v_profile.permanent_address, v_student.complete_address) IS NOT NULL THEN v_personal_filled := v_personal_filled + 1; END IF;
        IF v_profile.interests_hobbies IS NOT NULL THEN v_personal_filled := v_personal_filled + 1; END IF;

        v_personal_pct := ROUND((v_personal_filled::DECIMAL / v_personal_total::DECIMAL) * 100);
        v_personal_complete := v_personal_filled > 0;
    END;

    -- 4. FAMILY DETAILS SECTION (8 fields)
    DECLARE
        v_family_filled INTEGER := 0;
        v_family_total INTEGER := 8;
    BEGIN
        IF v_profile.father_name IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.father_occupation IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.father_annual_income IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.mother_name IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.mother_occupation IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.mother_annual_income IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.siblings_count IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.siblings_details IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;

        v_family_pct := ROUND((v_family_filled::DECIMAL / v_family_total::DECIMAL) * 100);
        v_family_complete := v_family_filled > 0;
    END;

    -- 5. DOCUMENT VERIFICATION SECTION (4 documents)
    DECLARE
        v_document_filled INTEGER := 0;
        v_document_total INTEGER := 4;
    BEGIN
        IF COALESCE(v_profile.has_driving_license, v_student.has_driving_license) = TRUE THEN v_document_filled := v_document_filled + 1; END IF;
        IF COALESCE(v_profile.has_pan_card, v_student.has_pan_card) = TRUE THEN v_document_filled := v_document_filled + 1; END IF;
        IF v_profile.has_aadhar_card = TRUE THEN v_document_filled := v_document_filled + 1; END IF;
        IF v_profile.has_passport = TRUE THEN v_document_filled := v_document_filled + 1; END IF;

        v_document_pct := ROUND((v_document_filled::DECIMAL / v_document_total::DECIMAL) * 100);
        v_document_complete := v_document_filled > 0;
    END;

    -- 6. EDUCATION PREFERENCES SECTION
    -- 100% complete if ANY checkbox is checked (including "not interested")
    DECLARE
        v_has_preference BOOLEAN := FALSE;
    BEGIN
        v_has_preference :=
            v_profile.interested_in_btech = TRUE OR
            v_profile.interested_in_mtech = TRUE OR
            v_profile.not_interested_in_higher_education = TRUE;

        IF v_has_preference THEN
            v_education_pct := 100;
            v_education_complete := TRUE;
        ELSE
            v_education_pct := 0;
            v_education_complete := FALSE;
        END IF;
    END;

    -- Count completed sections
    IF v_academic_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_physical_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_personal_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_family_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_document_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_education_complete THEN v_completed_sections := v_completed_sections + 1; END IF;

    v_completion := ROUND((v_completed_sections::DECIMAL / v_total_sections::DECIMAL) * 100);

    UPDATE student_extended_profiles
    SET profile_completion_percentage = v_completion, last_updated = CURRENT_TIMESTAMP
    WHERE student_id = p_student_id;

    INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
    VALUES
        (p_student_id, 'academic_extended', v_academic_complete, v_academic_pct),
        (p_student_id, 'physical_details', v_physical_complete, v_physical_pct),
        (p_student_id, 'personal_details', v_personal_complete, v_personal_pct),
        (p_student_id, 'family_details', v_family_complete, v_family_pct),
        (p_student_id, 'document_verification', v_document_complete, v_document_pct),
        (p_student_id, 'education_preferences', v_education_complete, v_education_pct)
    ON CONFLICT (student_id, section_name)
    DO UPDATE SET
        is_completed = EXCLUDED.is_completed,
        completion_percentage = EXCLUDED.completion_percentage,
        last_updated = CURRENT_TIMESTAMP;

    RETURN v_completion;
END;
$function$;

-- Recalculate completion for all students
DO $$
DECLARE
    student_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Recalculating profiles with new education preference logic...';

    FOR student_record IN
        SELECT s.id FROM students s
        INNER JOIN student_extended_profiles ep ON s.id = ep.student_id
        ORDER BY s.id
    LOOP
        PERFORM calculate_profile_completion(student_record.id);
        processed_count := processed_count + 1;

        IF processed_count % 1000 = 0 THEN
            RAISE NOTICE 'Processed % students...', processed_count;
        END IF;
    END LOOP;

    RAISE NOTICE 'Recalculation complete! Total: %', processed_count;
END $$;
