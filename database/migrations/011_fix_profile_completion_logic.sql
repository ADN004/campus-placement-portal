-- Migration 011: Fix profile completion calculation logic
-- Document section should be complete if at least one document is marked as true

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_student_id integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_completion INTEGER;
    v_total_sections INTEGER := 6; -- Total number of sections
    v_completed_sections INTEGER := 0;
    v_profile RECORD;
    v_student RECORD;
    v_has_at_least_one_doc BOOLEAN;
BEGIN
    -- Get extended profile
    SELECT * INTO v_profile
    FROM student_extended_profiles
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Get student registration data for fallback values
    SELECT * INTO v_student
    FROM students
    WHERE id = p_student_id;

    -- 1. Academic Extended Section (complete if all 3 core fields filled)
    IF v_profile.sslc_marks IS NOT NULL
       AND v_profile.sslc_year IS NOT NULL
       AND v_profile.sslc_board IS NOT NULL THEN
        v_completed_sections := v_completed_sections + 1;
    END IF;

    -- 2. Physical Details Section (complete if all 3 fields filled, using merged data)
    IF COALESCE(v_profile.height_cm, v_student.height) IS NOT NULL
       AND COALESCE(v_profile.weight_kg, v_student.weight) IS NOT NULL
       AND v_profile.physically_handicapped IS NOT NULL THEN
        v_completed_sections := v_completed_sections + 1;
    END IF;

    -- 3. Personal Details Section (complete if all 3 fields filled, using merged data)
    IF v_profile.district IS NOT NULL
       AND COALESCE(v_profile.permanent_address, v_student.complete_address) IS NOT NULL
       AND v_profile.interests_hobbies IS NOT NULL THEN
        v_completed_sections := v_completed_sections + 1;
    END IF;

    -- 4. Family Details Section (complete if all 4 core fields filled)
    IF v_profile.father_name IS NOT NULL
       AND v_profile.father_occupation IS NOT NULL
       AND v_profile.mother_name IS NOT NULL
       AND v_profile.mother_occupation IS NOT NULL THEN
        v_completed_sections := v_completed_sections + 1;
    END IF;

    -- 5. Document Verification Section
    -- Complete if AT LEAST ONE document is marked as TRUE (using merged data)
    v_has_at_least_one_doc :=
        COALESCE(v_profile.has_driving_license, v_student.has_driving_license) = TRUE
        OR COALESCE(v_profile.has_pan_card, v_student.has_pan_card) = TRUE
        OR v_profile.has_aadhar_card = TRUE
        OR v_profile.has_passport = TRUE;

    IF v_has_at_least_one_doc THEN
        v_completed_sections := v_completed_sections + 1;
    END IF;

    -- 6. Education Preferences Section (complete if both fields are TRUE)
    IF v_profile.interested_in_btech = TRUE
       AND v_profile.interested_in_mtech = TRUE THEN
        v_completed_sections := v_completed_sections + 1;
    END IF;

    -- Calculate percentage based on completed sections
    v_completion := ROUND((v_completed_sections::DECIMAL / v_total_sections::DECIMAL) * 100);

    -- Update the profile completion percentage
    UPDATE student_extended_profiles
    SET profile_completion_percentage = v_completion,
        last_updated = CURRENT_TIMESTAMP
    WHERE student_id = p_student_id;

    RETURN v_completion;
END;
$function$;

-- Recalculate completion for all students
DO $$
DECLARE
    student_record RECORD;
    processed_count INTEGER := 0;
    update_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting profile completion recalculation for all students...';

    FOR student_record IN
        SELECT s.id, s.student_name
        FROM students s
        INNER JOIN student_extended_profiles ep ON s.id = ep.student_id
        ORDER BY s.id
    LOOP
        -- Recalculate completion
        PERFORM calculate_profile_completion(student_record.id);
        processed_count := processed_count + 1;

        -- Update section completion for document verification
        -- This ensures the profile_section_completion table is also updated
        WITH doc_check AS (
            SELECT
                ep.student_id,
                (COALESCE(ep.has_driving_license, s.has_driving_license) = TRUE
                 OR COALESCE(ep.has_pan_card, s.has_pan_card) = TRUE
                 OR ep.has_aadhar_card = TRUE
                 OR ep.has_passport = TRUE) as has_doc
            FROM student_extended_profiles ep
            JOIN students s ON s.id = ep.student_id
            WHERE ep.student_id = student_record.id
        )
        INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
        SELECT
            student_record.id,
            'document_verification',
            dc.has_doc,
            CASE WHEN dc.has_doc THEN 100 ELSE 0 END
        FROM doc_check dc
        ON CONFLICT (student_id, section_name)
        DO UPDATE SET
            is_completed = EXCLUDED.is_completed,
            completion_percentage = EXCLUDED.completion_percentage,
            last_updated = CURRENT_TIMESTAMP;

        update_count := update_count + 1;

        -- Log progress every 1000 records
        IF processed_count % 1000 = 0 THEN
            RAISE NOTICE 'Processed % students...', processed_count;
        END IF;
    END LOOP;

    RAISE NOTICE 'Profile completion recalculation complete!';
    RAISE NOTICE 'Total students processed: %', processed_count;
    RAISE NOTICE 'Total students updated: %', update_count;
END $$;
